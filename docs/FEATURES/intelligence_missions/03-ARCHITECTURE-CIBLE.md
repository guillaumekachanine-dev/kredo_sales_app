# 03 — Architecture cible v0 (non engageante)

> **Statut** : proposition d'architecture, première itération. À challenger avant tout code.
> **Prérequis de lecture** : `01-AUDIT-EXISTANT.md` (faits mesurés) et
> `02-CRITIQUE-ET-PERIMETRE.md` (arbitrages). Ce document ne rejustifie pas les décisions
> qui y sont prises.
> **ADR** : `docs/adr/ADR-0020-missions-intelligence.md` — **écrit, statut Proposé**.
>
> 🔴 **Ce document a été amendé sur 5 points par la revue contradictoire du 2026-08-18.
> En cas de divergence, l'ADR-0020 fait foi.** Les corrections sont appliquées ci-dessous
> et signalées par « *révisé* ». Résumé :
> 1. `rpc_context` **supprimé** du contrat — providers nommés par le métier (§4.1) ;
> 2. M-5 **corrigée** : les RPC ne sont pas toutes exécutables sous RLS utilisateur (§4.3) ;
> 3. **un seul contrat de sortie** `MissionReportV1` — ni moteur de schéma ni DSL QA (§2) ;
> 4. `resultType` **retiré du preset** — dérivé par le callback (§2, §6.2) ;
> 5. `actions/launch-mission.ts` **supprimé** — la gateway existante est réutilisée (§2.1).

---

## 1. La décision structurante : où vit le métier

Tout le reste découle de ce choix.

`01` §3 établit que le métier d'un workflow Kredo est un quadruplet
`(hydratation, gabarit de prompt, schéma de sortie, règles QA)`, aujourd'hui écrit en
JavaScript dans du JSON n8n importé manuellement.

Trois emplacements possibles :

| Option | Nouvelle mission = | Testable en Vitest | Import VPS | Verdict |
|---|---|---|---|---|
| **A.** Métier dans n8n (statu quo) | un workflow JSON | ❌ (harnais Node ad hoc) | ❌ à chaque fois | Statu quo, rejeté |
| **B.** Métier en base (`mission_specs`) | une ligne SQL | 🟡 partiellement | ✅ une fois | Rejeté — §3 |
| **C.** Métier en TypeScript versionné | une entrée de catalogue | ✅ intégralement | ✅ une fois | **Retenu** |

> 🎯 **Décision M-1 — Le métier des missions vit en TypeScript, versionné en git,
> dans `src/features/intelligence-missions/`. n8n n'exécute plus aucune logique métier.**

### 1.1 Conséquence : n8n devient un exécuteur sans métier

En poussant M-1 jusqu'au bout, l'assemblage du prompt **et** la validation de la sortie
remontent côté Next.js. Le workflow n8n ne garde que ce qu'il sait faire mieux que Vercel :
exécution longue, retry, historique d'exécution, instrumentation de coût.

```
┌─ Next.js (Server) ──────────────────────────────────────────────┐
│  Résolution du corpus  →  Assemblage du prompt  →  Création run │
└────────────────────────────┬────────────────────────────────────┘
                             │  enveloppe de mission (prompts déjà assemblés)
                             ▼
┌─ n8n : mission-001-run ─────────────────────────────────────────┐
│  Verify HMAC → Mark Running → Call LLM → Callback (texte brut)  │
│  ZÉRO code métier. Importé UNE fois. Ne change plus jamais.     │
└────────────────────────────┬────────────────────────────────────┘
                             │  texte brut + tokens + coût
                             ▼
┌─ Next.js (Callback) ────────────────────────────────────────────┐
│  Validation schéma → Règles QA → Persistance → Document         │
└─────────────────────────────────────────────────────────────────┘
```

**Cette forme est le cœur de la proposition.** Elle atteint le test de sortie de `02` §6.3
de façon littérale : ajouter une intention ne touche jamais n8n.

### 1.2 Arbitrage assumé : pourquoi garder n8n

Si n8n ne porte plus de métier, la question « pourquoi n8n ? » est légitime. Réponses :

- **D6 est une règle fondatrice de Kredo**, pas une commodité ;
- l'appel LLM peut durer plusieurs minutes et bénéficie du **retry et de l'historique
  d'exécution** n8n, déjà instrumentés par les vues `v_ai_*_costs` / `v_workflow_health` ;
- les **missions multi-étapes** (hors périmètre V1, mais supportées par `phase` 1→10)
  exigeront une boucle d'orchestration : n8n est le bon endroit ;
- la plomberie HMAC/callback existe, fonctionne, et n'a rien coûté depuis son écriture.

Coût assumé : l'enveloppe transmise à n8n est plus volumineuse (prompt assemblé).
Elle est **bornée par le budget de corpus** (§4.4), donc plafonnée par construction.

### 1.3 Conséquence sur la validation de sortie

Un seul validateur, en TypeScript, dans le callback.

> 🎯 **Décision M-2 — La sortie du LLM est validée une seule fois, côté Next.js, dans le
> callback, contre le schéma du preset. Aucun validateur n'est écrit dans un nœud n8n.**

Motif technique : par défaut, un nœud `Code` n8n ne peut pas importer de paquet npm
(le self-hosted peut l'autoriser via `NODE_FUNCTION_ALLOW_EXTERNAL`, mais **aucun des 19
workflows du repo ne l'utilise** — vérifié). Valider dans n8n imposerait donc de réécrire
à la main un validateur de schéma, **puis de le maintenir en double** avec sa version
TypeScript. `01` §3.2 montre que ces validateurs manuscrits font déjà 2 à 3 k caractères
par workflow, et qu'ils dérivent (chaque workflow a le sien).

Contrepartie honnête : n8n ne peut plus relancer automatiquement le LLM sur sortie
invalide. Le run passe `failed` avec le détail de validation, et l'utilisateur relance.
Acceptable en V1 — aujourd'hui, une sortie invalide fait déjà échouer le run.

---

## 2. Le contrat de mission

Traduction directe de `Corpus + Mission + Contraintes → Livrable`.

```ts
// src/features/intelligence-missions/domain/mission-contracts.ts

export type MissionSpec = {
  slug: string                    // "veille-analyse-mensuelle" — stable, sert de clé
  version: number                 // incrémenté à toute modification de prompt ou schéma
  label: string                   // libellé utilisateur ("Analyse de la veille")
  description: string

  /** A — CORPUS : sur quoi la mission a le droit de travailler. */
  corpus: {
    /** Sélecteurs pré-câblés, dérivés du contexte d'ouverture. */
    base: CorpusSelector[]
    /** L'utilisateur peut-il ajouter des corpus, et lesquels. */
    userAddition: { allowed: boolean; kinds: CorpusKind[] }
    budget: CorpusBudget
  }

  /** B — INTENTION : ce que l'on cherche à obtenir. */
  intent: {
    preset: string                // intention par défaut, rédigée et testée
    userEditable: boolean         // le champ libre est une soupape, pas le produit
  }

  /** C — CONTRAINTES : bornes, séparées de l'intention (§4 de la vision). */
  constraints: MissionConstraintSpec

  /**
   * D — LIVRABLE. *Révisé* : le preset ne configure RIEN du contrat de sortie.
   * Toutes les missions V1 produisent `MissionReportV1`, et le callback impose
   * lui-même resultType = documentType = "mission_report" (§6.2).
   */
  promptTemplate: string

  model: { provider: "anthropic"; model: string; maxOutputTokens: number }
}

/** Contrat de sortie UNIQUE — un validateur écrit à la main, pas de moteur de schéma. */
export type MissionReportV1 = {
  schemaVersion: 1
  title: string
  executiveSummary: string
  findings: Finding[]
  recommendations: Recommendation[]
  sourceRefs: SourceRef[]
}

/**
 * `category` est le SEUL discriminant. Il existe parce que le pilote `intel-021` produit
 * six sections typées : sans lui, la comparaison ancien/nouveau perdrait sa structure et
 * la preuve dégénérerait en « ça a produit quelque chose » (ADR-0020 §5.3).
 */
export type Finding = {
  category: "tendance" | "signal_faible" | "reglementaire"
          | "opportunite" | "risque" | "autre"
  statement: string
  evidence: SourceRef[]
}
```

### 2.1 Où vit le catalogue

```
src/features/intelligence-missions/
  domain/
    mission-contracts.ts          ← types ci-dessus
    mission-catalog.ts            ← LES PRESETS (données, versionnées en git)
    mission-output-validator.ts   ← validateur de MissionReportV1, écrit à la main (M-2)
    mission-qa-checks.ts          ← *révisé* : contrôles codés une fois, pas un DSL
  data/
    corpus/                       ← un fichier par CorpusProvider (§4)
    resolve-mission-corpus.ts     ← le résolveur (§4.3)
    assemble-mission-prompt.ts    ← assemblage, testable (§5)
  components/
    MissionComposerDesktop.tsx    ← L4, coupable si le temps manque
    MissionComposerMobile.tsx
  __tests__/
```

Convention `src/features/[domaine]/` — le patron le plus récent du projet.

> **Pourquoi pas une table `mission_specs`** (option B du §1) : un preset en base est
> modifiable en production sans revue, sans test, sans typecheck — et rouvre exactement la
> faille de `02` §3.5 dès qu'un utilisateur peut en créer un. Un preset en TypeScript est
> typé, testé, relu, et déployé par `git push`. La table redeviendra pertinente le jour
> où l'utilisateur devra créer ses propres missions — pas avant (P7/D10).

---

## 3. Le registre d'exécution : aucune migration

`01` §4 : `run_type` est du texte libre portant déjà 20 valeurs ; `company_id`,
`primary_entity_*` sont nullable ; `input_snapshot` et `config` sont des `jsonb`.

> 🎯 **Décision M-3 — Un run de mission est une ligne `ai_intelligence_runs` ordinaire.
> Aucune table nouvelle, aucune colonne nouvelle.**

| Colonne | Valeur pour une mission |
|---|---|
| `run_type` | `mission:<slug>` — ex. `mission:veille-analyse-mensuelle` |
| `config` | `{ missionSlug, missionVersion, corpusBudget }` — **relu par le callback** |
| `input_snapshot` | intention retenue, contraintes, **trace du corpus résolu** (§4.5) |
| `primary_entity_type/_id` | entité d'ouverture, ou `workspace` |
| `company_id` | renseigné seulement si la mission est ouverte depuis un compte |
| `current_phase` | **1** — index d'étape, pas la sémantique ADR-0007 |

### 3.1 Sémantique de `phase` — décision explicite

`01` §4.1 : `phase` porte une sémantique ADR-0007 (`1=analyse client`, `2=sectorielle`…)
que des vues et composants interprètent.

> 🎯 **Décision M-4 — Pour un run de mission, `phase` est un index d'étape à partir de 1.
> Aucun consommateur ne doit lire un run de mission par `phase`. La sélection des runs de
> mission se fait exclusivement par `run_type LIKE 'mission:%'`.**
>
> À vérifier au moment de L0 : `v_ai_intelligence_summary` et les affichages par phase
> doivent exclure ou traiter à part les `run_type` de mission. C'est la principale
> régression possible de ce chantier.

*Révisé* — ADR-0020 §5.5. **Une mission écrit `phase = 1`. Point.** Le multi-étapes n'est
pas un concept de cette architecture : le schéma le supporterait, ce n'est pas une raison
pour le documenter comme une étape future. Il sera décidé le jour où une mission réelle
l'exigera. Seule subsiste l'exigence opérationnelle de M-4 : les vues et composants
interprétant `phase` doivent exclure `run_type LIKE 'mission:%'`.

---

## 4. Le résolveur de corpus

La pièce la plus coûteuse (`02` §7, lot L1) et la seule réellement nouvelle.

### 4.1 Types normalisés

```ts
// *Révisé* — ADR-0020 §5.1. Trois origines, nommées par le MÉTIER.
// `rpc_context` est supprimé : faire remonter un nom de RPC PostgreSQL dans le contrat
// de mission ferait fuir l'infrastructure dans le modèle métier et créerait de fait un
// dispatcher de RPC générique.
export type CorpusKind =
  | "veille_period"          // digests + articles sur une période — 7 + 31 lignes
  | "intelligence_document"  // 137 lignes — corpus le plus fourni
  | "account_context"        // compte + signaux + contacts — 112 comptes / 839 signaux

export type CorpusSelector =
  | { kind: "veille_period"; periodStart: string; periodEnd: string }
  | { kind: "intelligence_document"; ids: string[] }
  | { kind: "account_context"; companyId: string }

// `content_collection` et `source_corpus` restent des origines de premier rang dans le
// CONTRAT, ajoutées quand elles auront de la matière (5 et 2 lignes aujourd'hui) —
// 02 §3.1. Les ajouter est une entrée de plus dans CORPUS_PROVIDERS, rien d'autre.

/** Élément normalisé — jamais une copie durable : hydraté à l'exécution (P2). */
export type CorpusItem = {
  ref: { kind: CorpusKind; table: string; id: string }
  title: string
  date: string | null
  provenance: string     // table d'origine ou nom de RPC
  content: string        // contenu hydraté, déjà borné par le budget
  chars: number
}
```

### 4.2 Un fournisseur par origine — le patron existe déjà

Miroir exact de `CONTENT_TYPE_REGISTRY` (`01` §5.1), avec l'ajout qui manque aujourd'hui :
**l'hydratation du contenu**, et non seulement des métadonnées d'affichage.

```ts
export type CorpusProvider<S extends CorpusSelector = CorpusSelector> = {
  kind: CorpusKind
  /**
   * *Révisé* — ADR-0020 §5.1. Le mode d'exécution est DÉCLARÉ, jamais supposé :
   *  - "user_rls"     : client Supabase de l'utilisateur, RLS active. Cas nominal.
   *  - "service_role" : nécessaire quand la source n'est pas exécutable par
   *                     `authenticated` (4 des 16 RPC). Le provider DOIT alors
   *                     revérifier explicitement l'appartenance au workspace,
   *                     et ce contrôle porte un test dédié.
   */
  execution: "user_rls" | "service_role"
  resolve(ctx: CorpusResolveContext, selector: S): Promise<CorpusItem[]>
  /** Priorité de conservation quand le budget est dépassé (§4.4). */
  weight: number
}

const CORPUS_PROVIDERS = {
  veille_period:         resolveWatchPeriod,      // user_rls
  intelligence_document: resolveDocuments,        // user_rls
  account_context:       resolveAccountContext,   // mode déclaré par le provider
} satisfies Record<CorpusKind, CorpusProvider>
```

> **La mission ne connaît jamais le nom d'une RPC.** Si `resolveAccountContext` en appelle
> une, c'est son détail interne — il peut en changer sans toucher au contrat de mission.
> L'engagement de `02` §3.2 est tenu : **zéro SQL réécrit, zéro régression** sur les 12
> workflows en production. C'est ce qui rend le chantier non destructif.

### 4.3 Où s'exécute la résolution

> 🎯 **Décision M-5 (*corrigée*) — La résolution du corpus s'exécute côté Next.js serveur,
> dans `/api/n8n/trigger`, avant tout appel à n8n. Chaque provider **déclare son mode
> d'exécution** : client utilisateur sous RLS (cas nominal), ou service-role **assorti
> d'une garde de workspace explicite et testée**.**

**Pourquoi cette correction.** La rédaction initiale — « toutes résolues avec le client
Supabase de l'utilisateur, RLS active » — était **factuellement fausse**. Contrôle live de
`pg_proc` + `has_function_privilege` (ADR-0020 §5.1) :

- **4 des 16 RPC ne sont pas exécutables par `authenticated`** — dont
  `get_account_knowledge_context`, directement concernée par `account_context` ;
- **2 sont `SECURITY DEFINER`**.

Un provider ne peut donc pas supposer son mode d'exécution : il doit le déclarer.

Ce n'est pas une invention : `resolveKnowledgeScope` fait déjà exactement cela dans
`src/app/api/n8n/trigger/route.ts` (`01` §5). Le chantier **poursuit un patron existant et
déjà durci**, et **ne crée aucun second chemin de lancement** — `actions/launch-mission.ts`
est supprimé du plan (ADR-0020 §5.2) :

```
UI → POST /api/n8n/trigger { missionSlug, … }
       → preset TS → résolution corpus → budget → assemblage prompt
       → triggerN8nRun("mission-001-run")
```

Trois bénéfices : la RLS s'applique naturellement, le budget est testable en Vitest, et
n8n n'a plus besoin d'un nœud d'hydratation par mission — condition de son immuabilité.

### 4.4 Budget et troncature — l'exigence non négociable

`02` §3.3 : sans budget, la composition multi-corpus fait exploser la fenêtre en silence.

```ts
export type CorpusBudget = {
  maxTotalChars: number      // ex. 120 000 (~30k tokens)
  maxCharsPerItem: number    // ex. 4 000
  maxItems: number           // ex. 120
}
```

Politique **déterministe**, dans cet ordre, jamais aléatoire, jamais déléguée au LLM :

1. troncature de chaque élément à `maxCharsPerItem` (coupe en fin, marqueur explicite) ;
2. tri par `(weight du fournisseur DESC, date DESC)` ;
3. conservation jusqu'à `maxTotalChars` / `maxItems` ;
4. **les éléments écartés sont comptés et tracés, jamais silencieux.**

### 4.5 Traçabilité — la réponse à P4 et P8

```ts
export type ResolvedCorpus = {
  items: CorpusItem[]
  stats: { requested: number; kept: number; dropped: number; totalChars: number }
  trace: Array<{
    ref: CorpusItem["ref"]
    title: string
    kept: boolean
    reason?: "budget_total" | "budget_items" | "truncated"
  }>
}
```

`trace` est écrit dans `ai_intelligence_runs.input_snapshot` (colonne `jsonb` existante).
Elle contient **des références et des titres, jamais du contenu copié** — P2 respecté,
P4 et P8 satisfaits, granularité conforme à `02` §5 Q3.

---

## 5. Assemblage du prompt

```ts
export function assembleMissionPrompt(
  spec: MissionSpec,
  intent: string,
  constraints: MissionConstraints,
  corpus: ResolvedCorpus,
): { systemPrompt: string; userPrompt: string }
```

Fonction **pure** — donc entièrement testable en Vitest, ce qu'aucun nœud `Assemble
Prompt` n8n n'est aujourd'hui.

Le `userPrompt` est structuré par élément de corpus, chacun préfixé de sa référence et de
sa provenance, plutôt que par un `JSON.stringify` global du contexte (`01` §3.1). Motif :
un LLM cite correctement ses sources quand elles sont individuellement identifiées, ce
que P4 exige.

Le `systemPrompt` est composé de : gabarit du preset + contraintes rendues + **le schéma
de sortie sérialisé**, de sorte que le contrat annoncé au LLM et le contrat validé au
retour proviennent **du même objet**. C'est ce qui rend la validation M-2 fiable.

---

## 6. Le workflow n8n générique — `mission-001-run`

### 6.1 Composition

| # | Nœud | Rôle |
|---|---|---|
| 1 | Webhook — Mission | réception de l'enveloppe |
| 2 | Verify Signature | HMAC (identique aux 15 workflows existants) |
| 3 | Validate Envelope | présence de `runId`, `systemPrompt`, `userPrompt`, `model` — **générique** |
| 4 | Mark Run Running | `PATCH ai_intelligence_runs` |
| 5 | Call LLM | modèle et `max_tokens` lus **dans l'enveloppe** |
| 6 | Prepare Callback | texte brut + tokens + durée. **Aucun parsing.** |
| 7 | Sign Callback | HMAC |
| 8 | Callback | POST vers `/api/n8n/callback` |
| 9-11 | Branche d'échec | Prepare / Sign / Callback (Failure) |

**11 nœuds, zéro ligne de code métier.** À comparer aux 14-17 nœuds dont 3-4 métier des
workflows actuels (`01` §1).

> 🎯 **Décision M-6 — `mission-001-run` est importé une seule fois sur le VPS et n'est
> jamais modifié ensuite. Toute évolution de mission est du TypeScript.**

### 6.2 Verrouillage du `resultType` — clôture de la faille `02` §3.5

*Révisé* — ADR-0020 §5.4. La version initiale verrouillait `resultType` côté serveur mais
laissait `resultType: string` dans le preset : une porte entrouverte. Elle est fermée.

1. `resultType` **n'est pas dans l'enveloppe** envoyée à n8n.
2. `resultType` **n'existe plus dans le preset** — il n'y a donc plus aucune configuration
   à compromettre.
3. Le callback détecte `run_type LIKE 'mission:%'` et **impose lui-même**
   `resultType = documentType = 'mission_report'`. Tout `resultType` présent dans le
   payload n8n est ignoré.
4. `account_issues_map` et `account_knowledge` restent la propriété exclusive des
   workflows dédiés — aucune mission ne peut les produire.

Un utilisateur ne peut donc, par aucun chemin, faire écrire un LLM dans `account_issues`.
P5 est garanti par construction, pas par convention.

---

## 7. Le callback — aiguillage, validation et livrable

`01` §8 : le callback est aujourd'hui une chaîne de `if` sur `resultType`, en service-role.

### 7.1 Extraction de l'aiguillage

```ts
type ResultHandler = {
  resultType: string
  ingest?: (...) => Promise<IngestOutcome>       // validation avant persistance
  materialize?: (...) => Promise<void>           // écriture métier — jamais pour une mission
  createsDocument: boolean
  revalidate?: (run) => string[]
}
```

Les quatre branches existantes deviennent quatre entrées de table. Refactoring à
**comportement strictement identique** — c'est la condition pour ne pas casser
`account_knowledge`, `account_issues_map`, le chemin documentaire et
`account_watch_refresh`, tous en production.

### 7.2 Chemin d'une mission

```
callback (texte brut)
   → run.run_type commence par "mission:" ?
   → resultType = documentType = "mission_report"        (imposé, non configurable)
   → charger MissionSpec depuis run.config.missionSlug + missionVersion
   → parser le JSON de sortie
   → valider contre MissionReportV1                      (M-2, validateur unique)
        ├─ invalide → run "failed" + détail de validation, PAS de résultat partiel
        └─ valide   ↓
   → évaluer spec.qa → qaFlags (jamais bloquant, informatif)
   → saveResult(resultType = "mission_report")            (verrou §6.2)
   → créer le document (documentType = "mission_report")
   → jamais de materialize()
```

### 7.3 Le type documentaire

`01` §7 : chaque valeur ajoutée à `intelligence_document_type` casse le `typecheck` sur
quatre `Record` exhaustifs.

> 🎯 **Décision M-7 — Une seule valeur d'enum est ajoutée, `mission_report`, pour toutes
> les missions présentes et futures. Le titre et le sous-type vivent dans `content_json`,
> pas dans l'enum.**

Migration : `ALTER TYPE intelligence_document_type ADD VALUE 'mission_report';`
puis mise à jour des 4 `Record` — c'est du périmètre du lot, pas un suivi.

---

## 8. Surface UX

Rappel `02` §3.6 : pas de point d'entrée global, pas de Studio.

### 8.1 Points d'entrée

`intelligence-registry.ts` (`01` §10) mappe déjà des routes vers des actions contextuelles
avec un statut `coming_soon`. Une mission devient une action de ce registre.

| Écran | Preset | Corpus pré-câblé |
|---|---|---|
| `/veille` | Analyse de la veille | `veille_period` sur la période affichée |
| Fiche compte | Préparer un rendez-vous | `account` + `rpc_context` |
| Connaissances | Analyser ce corpus | `content_collection` |

> **Aucun point d'entrée n'est ouvert sur un écran sans preset pertinent.**
>
> *Révisé* : le lancement passe **exclusivement** par `POST /api/n8n/trigger` (§4.3).
> Aucun second chemin de déclenchement n'est créé.

### 8.2 Adaptive (ADR-0006)

Le composeur est un **formulaire dense** : par défaut **responsive CSS**, pas d'adaptive
plein — sauf si la sélection multi-corpus desktop devient un vrai espace de composition,
auquel cas seulement `MissionComposerDesktop/Mobile` se justifient.

- **Desktop** — `AppDrawer` latéral : corpus sélectionnés et leur volume, intention,
  contraintes repliées, aperçu du budget consommé.
- **Mobile** — feuille : preset + intention courte + lancer. Pas de composition
  multi-corpus. **Ne pas charger le composeur desktop pour le masquer en CSS.**

### 8.3 Suivi d'exécution

Réutiliser `use-run-tracker.ts`, existant et éprouvé.

> ⚠️ Piège connu et déjà payé : un canal Supabase Realtime souscrit **sans jeton** se
> souscrit « avec succès » puis ne délivre jamais rien. `ensureRealtimeAuth()` avant
> `subscribe()`, sans exception.

---

## 9. Découpage en lots

Estimations et justification du dérapage en `02` §7. Chaque lot se termine par
`typecheck → test → check:server-boundary → lint → build`.

| Lot | Contenu | Critère de sortie | Réaliste |
|---|---|---|---:|
| **L0** | Contrats, catalogue TS, 1 preset, **garde M-4 sur les vues** | `npm test` vert ; aucun run de mission mal typé dans les vues existantes | 1 |
| **L1** | Résolveur : `veille_period`, `intelligence_document`, `account_context` + **mode d'exécution déclaré et garde workspace testée** + budget + trace | Résolution des 3 origines sous budget, trace complète ; garde service-role couverte par un test | 2 |
| **L2** | `mission-001-run` + harnais `test:n8n` + **import VPS unique** | Un run réel de bout en bout ; **compteur d'assertions du harnais lu, pas le code de sortie** | 2 |
| **L3** | Callback : aiguillage extrait, validateur `MissionReportV1`, enum `mission_report` | 4 chemins existants non régressés ; sortie invalide → `failed` propre | 1 |
| **L5** | `intel-021` rejoué en preset, comparaison des sorties | Qualité au moins équivalente ; `Finding.category` couvre ses 6 sections | 1 |
| **L4** | Composeur desktop + mobile, entrées contextuelles | — | 2,5 |

> **L4 est volontairement placé en dernier.** `02` §7.2 : dans un budget contraint, on
> coupe le composeur, jamais le résolveur. Sans L4, chaque preset reste lançable depuis
> le registre d'intelligence existant — le moteur est complet, seule la composition libre
> manque.

**L0 → L3 + L5 ≈ 7 sessions réalistes** (5 optimiste) livrent le moteur et sa preuve.

> *Révisé* — ADR-0020 §5.7. Les simplifications de la revue font gagner **~1 session, pas
> 4** : elles allègent L1 et L3, mais **aucune n'atteint L2**, qui reste un aller-retour
> manuel avec le VPS, hors du contrôle de l'agent. C'est là qu'est le risque.

---

## 10. Vérification de la vision, décision par décision

| # | Décision de la vision | Tenue ? | Comment |
|---|---|---|---|
| D1 | Concept de mission d'intelligence | ✅ | `MissionSpec` §2 |
| D2 | `Corpus + Mission + Contraintes → Livrable` | ✅ | Les 4 blocs sont les 4 champs du contrat |
| D3 | Convergence au résolveur, pas en base | ✅ | `CORPUS_PROVIDERS` §4.2 — aucune table fusionnée, aucun nom de RPC dans le contrat |
| D4 | Pas de registre de runs parallèle | ✅ | M-3 — **zéro migration**, validé par mesure (`01` §4) |
| D5 | `intelligence_documents` porte les livrables | ✅ | M-7 |
| D6 | n8n pour les traitements longs | ✅ | §6, avec arbitrage assumé §1.2 |
| D7 | Pas de workflow par mission | ✅ | M-6 — un workflow, importé une fois |
| D8 | UX contextuelle et transverse | 🟡 | §8 — **contextuelle oui, globale non** (`02` §3.6) |
| D9 | V1 déclarative et déterministe | ✅ | Une mission = un appel LLM ; orchestration nulle |
| D10 | Abstractions prouvées par l'usage | ✅ | Aucune capacité atomique, aucun multi-étapes, aucun template utilisateur |

**Écart unique et assumé : D8.** La vision veut « Analyser » partout ; l'architecture
propose « Analyser là où un preset a du sens ». Argument en `02` §3.6.

---

## 11. Ce que cette architecture ne fait pas

- Elle **n'améliore aucune analyse existante**. `intel-010` (176 runs) et `intel-020`
  (92 runs) ne sont pas touchés — `02` §4.
- Elle **ne crée pas de matière**. Si les corpus restent vides, le moteur tournera à vide
  — `02` §3.1. C'est le risque numéro un, et il est de nature produit, pas technique.
- Elle **ne rend pas Kredo agentique**. Une mission est un appel LLM déterministe sur un
  corpus borné et tracé.
- Elle **ne supprime pas le premier import VPS**. Elle supprime tous les suivants.

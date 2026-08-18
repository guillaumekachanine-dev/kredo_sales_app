# ADR-0020 — Missions d'intelligence : moteur déclaratif transverse

- **Statut** : **Accepté**
- **Date** : 2026-08-18 (proposé) · **accepté le 2026-08-18**
- **Décideur** : Guillaume Kasanin
- **Handoff d'implémentation** : `docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md`
- **Migrations** : une seule prévue — `ALTER TYPE intelligence_document_type ADD VALUE 'mission_report'`
- **Remplace / amende** : rien. Complète l'ADR-0007 (moteur d'intelligence commerciale) et
  l'ADR-0012 (chaîne de décision). **N'amende pas** ADR-0006 (device) ni ADR-0018 (shell).
- **Documents de cadrage** : `docs/FEATURES/intelligence_missions/` — `00` vision,
  `01` audit mesuré, `02` critique et périmètre, `03` architecture v0.
- **Revue contradictoire** : ChatGPT, 2026-08-18. Cinq objections, **cinq acceptées**,
  dont une invalidant une décision de `03`. Arbitrage détaillé en §5.

---

## Contexte

Kredo a construit ses capacités IA workflow par workflow. L'audit mesuré (`01`) établit
l'état réel au 2026-08-18 :

- **12 des 19 workflows n8n portent le squelette canonique complet** (webhook → HMAC →
  validation → statut → hydratation → prompt → LLM → validation → QA → callback).
- Mais la duplication est de **~80 % en nombre de nœuds et de seulement ~28 % en volume de
  code** : 72 % du code est du métier réel (prompt, contrat de sortie, QA).
- Le métier d'un workflow se réduit à un quadruplet `(hydratation, gabarit de prompt,
  schéma de sortie, règles QA)`, dont **trois éléments sur quatre sont de la donnée pure
  inscrite en dur dans du JavaScript**. Le nœud `Assemble Prompt` d'`intel-031` est une
  chaîne suivie d'un `JSON.stringify`.
- **Le registre d'exécution accueille déjà des missions** : `ai_intelligence_runs.run_type`
  est du `text` libre portant 20 valeurs distinctes ; `company_id` et `primary_entity_*`
  sont nullable. Aucune migration n'est nécessaire pour l'exécution.

Le coût réel d'une nouvelle capacité IA n'est donc pas la duplication de plomberie, mais
la chaîne **« écrire du JSON n8n → import manuel sur le VPS → activation → aucune
détection de dérive »**. Onze workflows patchés en Session 28 ne sont toujours pas
réimportés, plus `intel-010-refresh` ; `npm run n8n:status` ne voit pas cette dérive
puisqu'il compare des compteurs de nœuds.

**Force décisive du contexte** : ce chantier est présenté comme la dernière feature
majeure de Kredo, sous contrainte de temps. Une architecture qui laisse le métier dans le
JSON n8n perpétue une dépendance à une action manuelle humaine. C'est ce critère qui
tranche.

---

## Décision

> **Le métier des missions d'intelligence vit en TypeScript versionné. n8n devient un
> exécuteur sans métier, importé une fois. Une mission produit un livrable documentaire
> unique, et n'a aucun chemin d'écriture métier.**

Cinq briques, et rien d'autre :

```
1. MissionPreset (TypeScript, git)
        ↓
2. 3 CorpusProviders allowlistés — veille · documents · compte
        ↓
3. Résolveur + budget + traçabilité   (dans /api/n8n/trigger existant)
        ↓
4. mission-001-run   (n8n : HMAC + statut + appel LLM + retry + callback)
        ↓
5. MissionReportV1   (validation TypeScript + intelligence_document)
```

### Les sept décisions normatives

| # | Décision | Portée |
|---|---|---|
| **M-1** | Le métier vit en **TypeScript**, dans `src/features/intelligence-missions/`. Aucune logique métier dans n8n. | Fondatrice |
| **M-2** | La sortie du LLM est validée **une seule fois, côté Next.js, dans le callback**. Aucun validateur en nœud n8n. | Fondatrice |
| **M-3** | Un run de mission est une ligne `ai_intelligence_runs` ordinaire (`run_type = 'mission:<slug>'`). **Aucune table ni colonne nouvelle.** | Structurelle |
| **M-4** | Une mission écrit **`phase = 1`**. Les consommateurs qui interprètent `phase` **doivent exclure `run_type LIKE 'mission:%'`**. Les phases 2-10 ne sont pas un concept de cette ADR. **Périmètre mesuré le 18/08 : un seul consommateur sémantique, la vue `v_ai_intelligence_summary`** (cf. §5.8). | Structurelle |
| **M-5** | Le corpus est résolu **côté serveur, dans `/api/n8n/trigger`**. Chaque provider **déclare son mode d'exécution** (client utilisateur sous RLS, ou service-role avec garde de workspace explicite). | Structurelle — *corrigée en revue, cf. §5.1* |
| **M-6** | `mission-001-run` est importé **une seule fois** sur le VPS et n'est plus jamais modifié. | Opérationnelle |
| **M-7** | Une mission produit **`MissionReportV1`** et le type documentaire **`mission_report`**, seule valeur d'enum ajoutée. Le `resultType` **n'est pas configurable** : le callback le dérive du préfixe `mission:`. | Sécurité |

---

## Options considérées

La question tranchée est unique : **où vit le métier d'une capacité IA ?**

### Option A — Statu quo : le métier dans n8n

| Dimension | Évaluation |
|---|---|
| Complexité | Faible (rien à faire) |
| Coût marginal d'une intention | **Élevé** — JSON + import manuel VPS |
| Testabilité | Faible — harnais Node ad hoc ; un harnais « qui passe » peut n'avoir rien exécuté |
| Dérive repo ↔ VPS | **Non détectée** (`n8n:status` compare des compteurs de nœuds) |

**Pour** : zéro travail, zéro risque de régression.
**Contre** : perpétue la dépendance à une action manuelle — rédhibitoire au vu de la
contrainte de temps.

### Option B — Le métier en base (`mission_specs`)

| Dimension | Évaluation |
|---|---|
| Complexité | Moyenne — table, RLS, versioning, UI d'édition |
| Coût marginal d'une intention | Faible (une ligne SQL) |
| Testabilité | **Partielle** — un preset en base échappe au `typecheck` et à Vitest |
| Sécurité | **Mauvaise** — un preset modifiable en production sans revue ; rouvre la faille §« Conséquences » dès qu'un utilisateur peut en créer un |

**Pour** : édition sans déploiement.
**Contre** : sans revue ni typecheck, et ouvre la porte à un `resultType` choisi par
l'utilisateur. Rejetée.

### Option C — Le métier en TypeScript versionné *(retenue)*

| Dimension | Évaluation |
|---|---|
| Complexité | Moyenne — concentrée sur le résolveur de corpus |
| Coût marginal d'une intention | **Minimal** — une entrée de catalogue, un test, un `git push` |
| Testabilité | **Totale** — assemblage de prompt et validation sont des fonctions pures |
| Sécurité | **Bonne** — `resultType` non configurable, presets relus et typés |
| Import VPS | **Une seule fois**, jamais ensuite |

**Contre assumé** : l'enveloppe envoyée à n8n est plus volumineuse (prompt déjà assemblé).
Elle est bornée par le budget de corpus, donc plafonnée par construction.

---

## Analyse des compromis

### Pourquoi conserver n8n s'il ne porte plus de métier

C'est l'objection la plus légitime à l'option C. Réponses :

- **D6 est une règle fondatrice de Kredo**, pas une commodité d'implémentation ;
- l'appel LLM bénéficie du **retry et de l'historique d'exécution** n8n, déjà instrumentés
  par `v_ai_*_costs` et `v_workflow_health` — refaire cela dans Vercel serait un recul ;
- la plomberie HMAC/callback existe, fonctionne, et n'a rien coûté depuis son écriture.

### Ce que l'on perd en remontant la validation dans le callback (M-2)

n8n ne peut plus relancer le LLM sur sortie invalide : le run passe `failed` avec le détail
de validation, et l'utilisateur relance. **Ce n'est pas une régression** — aujourd'hui, une
sortie invalide fait déjà échouer le run.

Le gain compense largement : un nœud `Code` n8n ne peut pas importer de paquet npm par
défaut (le self-hosted peut l'autoriser via `NODE_FUNCTION_ALLOW_EXTERNAL`, mais **aucun
des 19 workflows du repo ne l'utilise** — vérifié). Valider dans n8n imposerait un
validateur manuscrit, **maintenu en double** avec sa version TypeScript. `01` §3.2 montre
que ces validateurs font déjà 2 à 3 k caractères par workflow et qu'ils dérivent.

### Le compromis le plus important : ne pas migrer l'existant

Une abstraction se rentabilise sur le cas N+1, jamais sur les N cas déjà écrits. Les
volumes d'usage tranchent seuls :

| Workflow | Runs | Verdict |
|---|---:|---|
| `intel-010-refresh` | 176 | 🚫 **Ne jamais migrer** |
| `intel-020-communication` | 92 | 🚫 **Ne jamais migrer** |
| `intel-030-account-knowledge` | 26 | 🚫 Ne pas migrer |
| **`intel-021-monthly-watch-analysis`** | **3** | ✅ **Pilote** |

`intel-021` est le bon pilote non parce qu'il est exemplaire, mais parce qu'il a tourné
**trois fois en tout** : le migrer ne met aucune valeur en risque.

> **Le moteur de missions est une addition, pas une refonte.** Il ouvre une classe d'usages
> que Kredo ne sait pas servir — les questions ponctuelles sur des corpus composés — sans
> pouvoir faire régresser l'existant.

---

## §5 — Arbitrage de la revue contradictoire

Cinq objections, **cinq acceptées**. Deux appellent une précision qui va au-delà de
l'objection.

### 5.1 🔴 Suppression de `rpc_context` — **acceptée, et elle corrige une erreur factuelle**

`03` proposait un type de corpus générique `{ kind: "rpc_context"; rpc: string; args }`.
Objection : cela fait remonter une notion d'infrastructure (le nom d'une RPC PostgreSQL)
dans le modèle métier, et crée un dispatcher de RPC générique.

**Objection fondée sur le principe, et vérifiée sur les faits.** Contrôle live de
`pg_proc` + `has_function_privilege` :

- **4 des 16 RPC ne sont pas exécutables par `authenticated`** :
  `get_workspace_diagnostic_context`, `get_account_knowledge_context`,
  `get_collaborator_communication_context`, `get_sector_intelligence_context`.
- **2 sont `SECURITY DEFINER`** : `get_workspace_diagnostic_context`,
  `get_manager_summary_facts`.

> **La rédaction initiale de M-5 — « toutes résolues avec le client Supabase de
> l'utilisateur, RLS active » — était donc fausse pour 4 des 16 RPC.** M-5 est corrigée
> ci-dessus.

Contrat retenu :

```ts
export type CorpusKind = "veille_period" | "intelligence_document" | "account_context"

const CORPUS_PROVIDERS = {
  veille_period:        resolveWatchPeriod,
  intelligence_document: resolveDocuments,
  account_context:       resolveAccountContext,
} satisfies Record<CorpusKind, CorpusProvider>
```

La mission ne connaît jamais le nom d'une RPC. Si `resolveAccountContext` en appelle une,
c'est son détail interne.

**Précision ajoutée par cette ADR, au-delà de l'objection.** Dire « c'est son problème
interne » masque une décision qui doit être explicite : `get_account_knowledge_context`
n'étant pas exécutable par `authenticated`, `resolveAccountContext` devra soit emprunter
un autre chemin de données, soit s'exécuter en service-role. D'où la clause ajoutée à M-5 :

> **Tout provider s'exécutant en service-role doit revérifier explicitement l'appartenance
> au workspace avant de retourner quoi que ce soit.** Le mode d'exécution est déclaré dans
> le provider et couvert par un test dédié.

C'est le patron déjà appliqué ailleurs dans Kredo (lecture de `profiles.workspace_id` côté
Server Action, cf. `collect-account-score-input.ts`), les fonctions `private.*` n'étant pas
exposées par PostgREST.

> **Résolution en L1 (2026-08-18) — l'option est tranchée : aucun provider n'est en
> service-role.** L'alternative que ce paragraphe laissait ouverte (« soit emprunter un autre
> chemin de données, soit s'exécuter en service-role ») est résolue **dans le premier sens**.
> `companies`, `v_active_account_signals`, `contacts` et `persons` portent toutes le motif RLS
> workspace standard : la lecture ligne à ligne sous le client de l'utilisateur suffit, et
> `get_account_knowledge_context` n'est appelée nulle part côté Next.js. Deuxième raison, qui
> n'était pas anticipée ici : la RPC rend un **unique blob JSON**, donc une seule référence
> citable, là où la lecture ligne à ligne donne au LLM un identifiant réel par signal et par
> contact — ce dont L3 a besoin pour reconstituer un `SourceRef`. La clause de M-5 sur la garde
> de workspace reste **appliquée quand même**, en seconde serrure : le provider revérifie
> l'appartenance de la company avant toute autre requête, et le retrait de ce verrou fait
> échouer trois tests.

### 5.2 Réutiliser `/api/n8n/trigger` — **acceptée, elle corrige une incohérence interne**

`03` §4.3 (M-5) plaçait la résolution dans la route de trigger existante, mais son
arborescence listait `actions/launch-mission.ts`. Contradiction réelle.

**Retenu** : un seul chemin de lancement, la gateway existante, qui fait déjà
authentification → résolution du workspace → création du run → `triggerN8nRun`, et qui
**résout déjà un corpus côté serveur pour INTEL-020 en écrasant tout `refs` du navigateur**.

```
UI → POST /api/n8n/trigger { missionSlug, … }
       → chargement du preset TS → résolution corpus → budget
       → assemblage prompt → triggerN8nRun("mission-001-run")
```

`actions/launch-mission.ts` est supprimé du plan.

### 5.3 🔴 Un seul contrat de sortie — **acceptée, avec un ajout nécessaire**

`03` prévoyait un `outputSchema` par preset et un `QaRule[]` interprété. C'est un
mini-framework construit pour des usages qui n'existent pas. Contraire à P7 et D10.

**Retenu** :

```ts
export type MissionReportV1 = {
  schemaVersion: 1
  title: string
  executiveSummary: string
  findings: Finding[]
  recommendations: Recommendation[]
  sourceRefs: SourceRef[]
}
```

Un seul validateur écrit à la main, quelques contrôles QA codés une fois. Pas de moteur de
JSON Schema, pas de DSL de QA.

**Ajout imposé par le pilote.** `intel-021` produit aujourd'hui **six sections typées** :
tendances, signaux faibles, réglementation, opportunités, risques, actions prioritaires.
Un `findings[]` plat ferait perdre cette structure, et la comparaison ancien/nouveau
dégénérerait en « ça a produit quelque chose » au lieu de « qualité équivalente ».

> **`Finding` porte donc un discriminant `category`**, dont l'énumération couvre au minimum
> les six sections d'`intel-021`. C'est un champ, pas un schéma par mission — la
> simplification est préservée, la preuve du pilote reste vérifiable.

### 5.4 `resultType` non configurable — **acceptée, version plus forte que la proposition initiale**

`03` §6.2 verrouillait `resultType` côté serveur mais laissait `resultType: string` dans le
contrat du preset — porte laissée entrouverte.

**Retenu, plus strict** : le champ **disparaît du preset**. Le callback détecte
`run_type LIKE 'mission:%'` et impose lui-même `resultType = 'mission_report'` et
`documentType = 'mission_report'`. Il n'y a plus de configuration à compromettre.

Rappel de l'enjeu : le callback aiguille en **service-role, hors RLS**, vers des écritures
métier réelles (`materializeAccountIssues` crée N lignes dans `account_issues`). Sans ce
verrou, une intention rédigée en texte libre pourrait faire écrire un LLM dans le CRM.
P5 devient garanti par construction, non par convention.

### 5.5 Ne pas généraliser `phase` — **acceptée**

Techniquement, `UNIQUE(run_id, phase)` + `CHECK phase BETWEEN 1 AND 10` supportent
immédiatement le multi-étapes. Ce n'est pas une raison pour en faire un concept.

**Retenu** : `mission ⇒ phase = 1`. Les phases 2-10 ne sont pas documentées comme étapes
futures. Seule subsiste l'exigence opérationnelle de M-4 : les vues et composants
interprétant `phase` doivent exclure les `run_type` de mission.

### 5.6 Incohérence factuelle de l'audit — **acceptée, corrigée**

`01` annonçait en en-tête « aucun chiffre repris d'un document antérieur » alors que deux
lignes du §9 étaient explicitement créditées à `CLAUDE.md`. Contradiction interne réelle.

Relevés live du 2026-08-18 substitués : `companies` **112** (et non 96),
`account_signals` **839** (et non 745), `ai_intelligence_runs` **422**,
`ai_intelligence_results` **354**. Les autres comptages sont inchangés.

**L'écart renforce l'arbitrage** de `02` §3.1 : les données compte (112 comptes,
839 signaux) sont un corpus pilote incomparablement plus pertinent que les collections
utilisateur (5 items).

### 5.7 Estimation — **partiellement acceptée**

La revue propose 4 à 6 sessions contre 8. Les coupes sont réelles et je les reprends
toutes, mais elles n'atteignent pas le lot risqué.

| Lot | `03` | Révisé | Effet des coupes |
|---|---:|---:|---|
| L0 — contrats, catalogue, 1 preset, garde M-4 | 1 | **1** | Inchangé : la garde sur les vues reste à écrire |
| L1 — 3 providers + budget + trace | 2,5 | **2** | Providers simplifiés, **mais** le mode d'exécution service-role + garde workspace (§5.1) est du travail neuf non compté par la revue |
| L2 — `mission-001-run` + harnais + import VPS | 2 | **2** | **Aucune coupe TypeScript n'atteint ce lot** : c'est un aller-retour manuel hors du contrôle de l'agent |
| L3 — callback + `MissionReportV1` + enum | 1,5 | **1** | Coupe réelle : un validateur écrit à la main ≪ un moteur de schéma |
| L5 — pilote `intel-021` | 1 | **1** | Inchangé |
| | **8** | **7** | |

> **Les simplifications font gagner ~1 session, pas 4.** L2 concentre le risque et
> n'est atteint par aucune d'elles. Estimation retenue : **5 optimiste, 7 réaliste**,
> composeur exclu.

### 5.8 Périmètre réel de la garde M-4 — mesuré, plus étroit que prévu

`03` §3.1 supposait qu'il faudrait auditer « les vues et composants lisant `phase` ».
Inventaire effectué le 2026-08-18 avant d'accepter l'ADR :

- **Aucun code TypeScript ne filtre ni n'interprète la colonne `phase`** de
  `ai_intelligence_results`. Les nombreuses occurrences de `phase` dans `src/components/`
  désignent un **état de machine UI** sans rapport (`tracker.phase === "tracking" |
  "succeeded" | "failed" | "timeout"`), ou les **jalons de projet** (`project_phases`).
  `src/app/api/n8n/callback/route.ts` ne fait que vérifier sa présence.
- **Un seul consommateur sémantique, en SQL** — `v_ai_intelligence_summary` :

  ```sql
  bool_or((r.phase = 1)) AS has_client_analysis,
  bool_or((r.phase = 2)) AS has_sector_analysis,
  bool_or((r.phase = 3)) AS has_process_diagnostic,
  bool_or((r.phase = 4)) AS has_roadmap
  FROM ai_intelligence_results r
  WHERE r.company_id = c.id AND r.status = 'succeeded'
  ```

  Le filtre porte sur `company_id` et `status`, **jamais sur `run_type`**. Une mission
  ouverte depuis un compte, écrivant `phase = 1`, ferait donc passer `has_client_analysis`
  à `true` — un compte paraîtrait analysé sans l'être.
- `v_ai_result_costs` expose `phase` en simple colonne de passage, sans interprétation :
  **aucune correction nécessaire**.

> **Conséquence pour le lot L0** : la garde M-4 est **un correctif ciblé sur une vue**, pas
> un balayage de composants. Le sous-requête latérale doit joindre `ai_intelligence_runs`
> et exclure `run_type LIKE 'mission:%'`. C'est la **seule régression connue** de ce
> chantier sur l'existant, et elle est cadrée.

---

## Conséquences

### Ce qui devient plus facile

- **Ajouter une intention d'analyse ne demande plus aucun import n8n** — une entrée de
  catalogue, un test, un `git push`. C'est le test de sortie de la V1.
- **Le métier IA devient testable en Vitest** : assemblage de prompt et validation de
  sortie sont des fonctions pures. Aucun nœud n8n ne l'est aujourd'hui.
- **Itérer sur un prompt cesse d'être un aller-retour humain** avec le VPS.
- Les 16 RPC existantes restent intactes : **zéro SQL réécrit, zéro régression** sur les
  12 workflows en production.

### Ce qui devient plus difficile

- **Le premier import VPS reste manuel** et concentre le risque (L2). Il doit être préparé
  en un seul passage : JSON généré par script, `node --check`, exécution réelle vérifiée
  par harnais dont **on lit le compteur d'assertions, jamais le seul code de sortie**.
- **`phase` porte désormais deux sémantiques** selon le `run_type`. M-4 est une dette
  volontaire : tout nouveau consommateur de `phase` doit connaître l'exclusion.
- **Une sortie invalide n'est plus relancée automatiquement** par n8n (M-2).
- L'ajout de `mission_report` à `intelligence_document_type` **cassera le `typecheck`** sur
  quatre `Record` exhaustifs (`document-display.tsx` ×2, `DocumentCard.tsx`,
  `DocumentMobileDetail.tsx`, `communication-result-documents.ts`). C'est du périmètre du
  lot L3, pas un suivi.

### Ce qu'il faudra rouvrir

- **Le composeur multi-corpus (L4, ~2,5 sessions)** — hors périmètre, décidé après la
  preuve du pilote. Sans lui, chaque preset reste lançable depuis
  `intelligence-registry.ts`. *Un moteur sans composeur reste un moteur ; un composeur sans
  moteur n'est qu'un formulaire.*
- **Les missions multi-étapes**, quand une mission réelle l'exigera (M-4).
- **Les presets en base et les templates utilisateur**, seulement avec un `resultType`
  resté non configurable (M-7).
- **Le retrieval sémantique**, si un corpus dépasse durablement le budget malgré la
  troncature. `vector` v0.8 est installé ; la porte reste ouverte.

### Le risque qui n'est pas technique

Le corpus reste le facteur limitant : `content_collection_items` = 5,
`source_corpora` = 2. Le moteur ne crée pas de matière. C'est pourquoi le périmètre de
validation retenu (`02` §3.1) vise **veille, documents (137) et compte (112 / 839)**, et
non les trois ensembles proposés en `00` §11, qui sont les plus vides de la base.

---

## Action items

> État au **2026-08-18** — L0 et L1 livrés, L2 est le prochain lot.

1. [x] **Arbitrer cette ADR** — ✅ **Acceptée le 2026-08-18**, sans retour sur aucune des 7 décisions.
2. [x] **L0 — livré le 2026-08-18** (puis audité) : `mission-contracts.ts`, `mission-catalog.ts`,
       1 preset, et la **garde M-4** sur `v_ai_intelligence_summary`. Il a fallu **deux**
       migrations : `20260818101855` ne guardait que la latérale `res`, `20260818110944`
       a complété la latérale `runs` (`count_runs` / `latest_run_*` restaient pollués).
3. [x] **L1 — livré le 2026-08-18** : 3 providers, budget déterministe, résolveur à allowlist
       stricte, assembleur de prompt pur, branche `missionSlug` dans la gateway existante.
       **Les trois providers déclarent `user_rls` : aucun n'est en service-role** — l'option
       laissée ouverte au §5.1 est tranchée dans l'autre sens (note de résolution *in situ*).
       La garde de workspace est appliquée quand même, en seconde serrure, et **vérifiée par
       mutation** : la retirer fait échouer 3 tests sur 6.
4. [x] **L1 — livré** : budget + troncature déterministe + trace dans `input_snapshot`.
       Piège non anticipé : `createRun` écrivait `input_snapshot = input`, ce qui aurait
       recopié tout le corpus (P2). D'où `inputSnapshot` en option de `createRun` /
       `triggerN8nRun` — par défaut inchangé pour tous les appelants existants.
5. [ ] **L2 — PROCHAIN** : `mission-001-run` (zéro code métier), harnais `test:n8n`,
       **un seul import VPS préparé** ; lire le compteur d'assertions.
6. [ ] **L3** — extraire l'aiguillage du callback à comportement **strictement identique**
       (4 chemins en production), validateur `MissionReportV1`, migration de l'enum + les
       4 `Record`.
7. [ ] **L5** — rejouer `intel-021` en preset sur une période déjà analysée et **comparer
       les sorties**, `Finding.category` couvrant ses six sections (§5.3).
8. [ ] Décider de L4 **après** la preuve du pilote, jamais avant.

### Hors périmètre — à traiter séparément

9. [x] 🔴 **Sécurité, sans rapport avec cette ADR mais découvert en la préparant —
       CORRIGÉ le 2026-08-18** : `public.get_manager_summary_facts` était `SECURITY
       DEFINER`, sans `search_path` fixé, `EXECUTE` accordé à `anon`/`authenticated`/
       `PUBLIC`. Elle prend `p_workspace_id` en paramètre et filtre dessus sans vérifier
       l'appartenance de l'appelant : un porteur de la clé anon publique pouvait lire des
       données métier (RDV, top clients, candidats, opportunités) de n'importe quel
       workspace, hors RLS.
       Migration `20260818092506_harden_get_manager_summary_facts_privileges.sql` :
       `EXECUTE` révoqué à `public`/`anon`/`authenticated` (seul `service_role` conserve
       l'accès — c'est l'unique appelant réel, via
       `src/app/api/reports/manager-summary/trigger/route.ts`), `search_path = ''` posé
       (corps déjà entièrement qualifié `public.*`, sans effet sur le résultat). Vérifié
       en base : `anon_exec=false`, `auth_exec=false`, `service_exec=true`, appel
       service-role fonctionnel. Boucle de validation complète passée (`typecheck` →
       1393 tests → `check:server-boundary` → `lint` → `build`).

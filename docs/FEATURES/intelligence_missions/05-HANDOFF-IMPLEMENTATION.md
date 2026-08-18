# 05 — Handoff d'implémentation « Missions d'intelligence »

> **Statut** : opérationnel — document de reprise pour tout agent entrant.
> **Autorité** : `docs/adr/ADR-0020-missions-intelligence.md` (**Accepté** le 2026-08-18).
> En cas de divergence avec `02` ou `03`, **l'ADR fait foi**.
> **Dernière mise à jour** : 2026-08-18 — **L0 et L1 livrés**. Le lot courant est **L2**,
> dont le cahier des charges complet est le **§8**.

Ce document est **autoportant**. Un agent qui le lit doit pouvoir reprendre le chantier
sans relire la conversation de cadrage. Il donne : l'état d'avancement, la configuration
optimale par lot (skills, MCP, modèle, profondeur de réflexion), les pièges vérifiés, et
les invariants à ne jamais casser.

---

## 1. En une page — de quoi il s'agit

Kredo transforme son métier IA — aujourd'hui écrit en JavaScript **à l'intérieur de
fichiers JSON n8n importés à la main sur un VPS** — en **données déclaratives TypeScript
versionnées**, interprétées par un exécuteur unique.

```
1. MissionPreset (TypeScript, git)
        ↓
2. 3 CorpusProviders — veille · documents · compte
        ↓
3. Résolveur + budget + traçabilité   (dans /api/n8n/trigger EXISTANT)
        ↓
4. mission-001-run   (n8n : HMAC + statut + appel LLM + retry + callback)
        ↓
5. MissionReportV1   (validation TypeScript + intelligence_document)
```

### Le seul critère de succès

> **Ajouter une nouvelle intention d'analyse à Kredo ne demande aucun import n8n :
> une entrée de catalogue TypeScript, un test, un `git push`.**

Si un lot s'éloigne de ce critère, il faut s'arrêter et le signaler, pas continuer.

### Ce que le chantier n'est PAS

- Ce n'est **pas** une refonte : les 12 workflows métier existants ne sont pas migrés.
- Ce n'est **pas** un framework agentique : une mission = **un** appel LLM déterministe.
- Ce n'est **pas** une nouvelle infrastructure : zéro table nouvelle, une seule valeur
  d'enum ajoutée, la gateway de déclenchement existante est réutilisée.

---

## 2. État d'avancement

| Lot | Contenu | État | Sessions |
|---|---|---|---:|
| Cadrage | Vision, audit, critique, architecture, ADR | ✅ **Terminé** — ADR Accepté | — |
| Sécurité | Durcissement `get_manager_summary_facts` | ✅ **Livré** — migration `20260818092506` | — |
| **L0** | Contrats, catalogue TS, 1 preset, **garde M-4** | ✅ **Livré et audité** — 2026-08-18 | 1 |
| **L1** | 3 CorpusProviders + budget + trace + garde de workspace | ✅ **Livré** — 2026-08-18 | 2 |
| **L2** | `mission-001-run` + harnais + **import VPS unique** | ⬜ **À FAIRE — prochain** | 2 |
| L3 | Callback : aiguillage, validateur, enum `mission_report` | ⬜ À faire | 1 |
| L5 | Pilote : `intel-021` rejoué en preset + comparaison | ⬜ À faire | 1 |
| L4 | Composeur UX desktop + mobile | ⏸️ **Décidé après L5**, jamais avant | 2,5 |

**Total moteur + preuve (L0→L3 + L5) : 7 sessions réalistes, 5 optimiste.**
L'ordre `L0 → L1 → L2 → L3 → L5` est **strict** : chaque lot consomme le précédent.

### Ce que L1 a livré (2026-08-18) — surface exacte

```
src/features/intelligence-missions/
  domain/
    apply-corpus-budget.ts      ← budget + troncature, fonction PURE (ADR §4.4)
    mission-selectors.ts        ← analyse des sélecteurs reçus du navigateur, PURE
    mission-catalog.ts          ← + findMissionSpec(slug)
    mission-contracts.ts        ← + CorpusProviderResult / CorpusExclusion / CorpusTraceReason
  data/
    corpus/
      veille-period-provider.ts          user_rls · weight 50
      intelligence-document-provider.ts  user_rls · weight 70
      account-context-provider.ts        user_rls · weight 90
      corpus-provider-registry.ts
    resolve-mission-corpus.ts   ← allowlist stricte + budget
    assemble-mission-prompt.ts  ← preset + corpus → { systemPrompt, userPrompt }, PURE
    build-mission-launch.ts     ← enveloppe n8n vs snapshot persisté, PURE
```

Gateway : une branche `missionSlug` **dans `/api/n8n/trigger`**, placée avant la validation
`workflowId`/`input` (une mission n'en porte aucun). Aucune action serveur concurrente,
`actions/launch-mission.ts` n'existe pas.

**Boucle de validation rejouée intégralement** : `typecheck` ✅ · **1485 tests / 148 fichiers,
0 échec** (1401 avant le lot, soit **+84 tests**) · `check:server-boundary` ✅ ·
`lint` ✅ **0 problème sur les fichiers du lot** (le dépôt en compte 1617 par ailleurs,
préexistants) · `build` ✅ exit 0, 64/64 pages, après `rm -rf .next` (faux `TS6200`/`TS2300`
rencontrés, piège documenté §6).

**Critère de sortie vérifié sur données réelles** — période juillet 2026 : 2 digests +
10 articles = **12 sources, 11 900 caractères**, aucun élément au-dessus des 4 000 caractères
par item. Le budget (120 000 / 120) n'est donc **pas** le facteur limitant aujourd'hui : la
matière l'est, exactement comme l'annonce l'ADR §« le risque qui n'est pas technique ».

### Les cinq écarts entre le plan et le code livré — à connaître avant L2/L3

| # | Écart | Pourquoi |
|---|---|---|
| **1** | 🔴 **`account_context` s'exécute en `user_rls`, PAS en `service_role`** | Le plan L1 l'annonçait en service-role via `get_account_knowledge_context`. Vérification live : cette RPC est `security invoker`, `EXECUTE` révoqué à `authenticated`, accordé au seul `service_role` — en service-role elle tourne **sans aucune RLS** et ne se protège que par son paramètre `p_workspace_id`. Or `companies` / `v_active_account_signals` / `contacts` / `persons` portent toutes le motif RLS workspace standard : **le chemin sous RLS utilisateur suffit**, et l'ADR §5.1 l'autorisait explicitement (« soit emprunter un autre chemin de données, soit s'exécuter en service-role »). Bénéfice non accessoire : la RPC rend un blob JSON unique donc **une seule référence citable**, là où la lecture ligne à ligne donne un identifiant réel par signal et par contact — ce dont L3 a besoin. **Il n'y a donc aucun provider service-role dans le moteur.** |
| **2** | `CorpusProvider.resolve` rend `{ items, exclusions }` et non `CorpusItem[]` | Un document archivé ou une référence illisible est écarté **avant** le budget. Sans ce canal il disparaîtrait sans trace, ce qu'ADR §4.4 interdit (« jamais silencieux »). |
| **3** | `trace.reason` gagne `archived`, `not_found`, `provider_limit` | Corollaire du précédent. `provider_limit` trace l'atteinte d'une borne dure de requête — une garde de volume, jamais une règle métier. |
| **4** | `CorpusResolveContext` porte le client Supabase | Le contrat L0 ne portait que `workspaceId` ; un provider ne pouvait alors rien lire. Le client est **injecté**, jamais fabriqué — même doctrine que `resolveKnowledgeScope`. |
| **5** | `createRun` / `triggerN8nRun` gagnent `inputSnapshot` (en plus de `runType` et `extraConfig` prévus) | **Non anticipé, et obligatoire.** `createRun` écrivait `input_snapshot = input`. Une mission envoie à n8n un prompt **contenant le corpus** : sans ce champ, tout le contenu aurait été recopié dans `input_snapshot`, en violation directe de P2. Les deux objets sont désormais construits par deux fonctions distinctes (`buildMissionEnvelope` / `buildMissionInputSnapshot`) précisément pour qu'on ne puisse pas se tromper de champ. Par défaut `input_snapshot` reste `input` : **aucun appelant existant n'est modifié.** |

`N8nWorkflowId` porte désormais `"mission-001-run"` — nécessaire pour que la branche compile.
**Le JSON du workflow reste entièrement à écrire : c'est L2.**

### Ce que L2 et L3 doivent savoir

- **L2** reçoit un `MissionRunEnvelope` (`src/lib/n8n/types.ts`) : `systemPrompt`, `userPrompt`,
  `model`, `budget`, `corpus` (compteurs). **Zéro hydratation, zéro assemblage, zéro validation
  côté n8n** — le workflow poste le texte brut du LLM au callback.
- **L3** trouvera dans `ai_intelligence_runs.input_snapshot` : `{ schemaVersion, missionSlug,
  missionVersion, requestedAt, selectors, budget, stats, trace }`. **`trace` porte `ref` + `title`
  + `provenance` sur CHAQUE élément considéré, conservé ou non** : c'est exactement ce qu'il faut
  pour reconstituer un `SourceRef` à partir du seul identifiant rendu par le LLM. Ne pas
  l'appauvrir. `config` porte `{ workflowId, missionSlug, missionVersion, corpusBudget }`.
- **Injection de prompt** : le contenu du corpus arrive dans `userPrompt`. Il provient toujours du
  workspace de l'utilisateur, et M-7 verrouille déjà le `resultType` — mais le validateur L3 doit
  **refuser tout `SourceRef` absent de la trace** plutôt que de faire confiance au modèle.

---

## 3. Les 7 décisions normatives — à ne jamais renégocier en cours d'implémentation

Reprises de l'ADR §Décision. Un agent qui pense devoir en enfreindre une doit **s'arrêter
et le signaler**, pas contourner.

| # | Décision |
|---|---|
| **M-1** | Le métier vit en **TypeScript** (`src/features/intelligence-missions/`). Aucune logique métier dans n8n. |
| **M-2** | La sortie du LLM est validée **une seule fois, côté Next.js, dans le callback**. Aucun validateur en nœud n8n. |
| **M-3** | Un run de mission est une ligne `ai_intelligence_runs` ordinaire (`run_type = 'mission:<slug>'`). **Aucune table ni colonne nouvelle.** |
| **M-4** | Une mission écrit **`phase = 1`**. Les consommateurs de `phase` excluent `run_type LIKE 'mission:%'`. Pas de multi-étapes. |
| **M-5** | Corpus résolu **côté serveur, dans `/api/n8n/trigger`**. Chaque provider **déclare son mode d'exécution** ; tout provider service-role porte une **garde de workspace testée**. |
| **M-6** | `mission-001-run` est importé **une seule fois** et n'est plus jamais modifié. |
| **M-7** | Une mission produit **`MissionReportV1`** et le type documentaire **`mission_report`**. Le `resultType` **n'est pas configurable** — le callback le dérive du préfixe `mission:`. |

### L'invariant de sécurité, en clair

Le callback (`src/app/api/n8n/callback/route.ts`) aiguille sur `resultType` **en
service-role, hors RLS**, vers des écritures métier réelles — `materializeAccountIssues`
crée N lignes dans `account_issues`. Si une mission pouvait porter son propre `resultType`,
une intention rédigée en texte libre ferait écrire un LLM dans le CRM.

> 🔴 **Aucune mission ne doit jamais pouvoir produire un `resultType` autre que
> `mission_report`.** `account_issues_map` et `account_knowledge` restent la propriété
> exclusive des workflows dédiés.

---

## 4. Configuration optimale par lot

Légende **profondeur de réflexion** : `think` < `think hard` < `ultrathink`.
Le modèle se règle par `/model`, la profondeur en l'écrivant dans le prompt.

### Règle générale

- **Opus 5** quand la décision engage la suite (contrats, sécurité, refactor de code en
  production). Le coût est marginal face à une erreur de contrat propagée sur 5 lots.
- **Sonnet 5** pour le travail mécanique cadré (JSON n8n, UI, tests répétitifs).
- **Haiku 4.5** : jamais sur ce chantier — chaque lot touche des invariants.

---

### L0 — Contrats, catalogue, garde M-4

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Opus 5** |
| **Réflexion** | **think hard** |
| **Skills** | `supabase` (migration de vue), `supabase:supabase-postgres-best-practices` |
| **MCP** | `supabase` — `execute_sql`, `apply_migration`, `list_migrations`, `generate_typescript_types` |
| **Agents** | aucun — le périmètre est cadré, un agent coûterait plus qu'il n'apporte |

**Pourquoi Opus** : les types écrits ici (`MissionSpec`, `CorpusSelector`,
`MissionReportV1`) sont consommés par les 4 lots suivants. Une erreur de forme se paie
cinq fois. C'est le lot le moins cher et le plus structurant.

**Pourquoi pas d'agent** : le périmètre de la garde M-4 est **déjà mesuré** (ADR §5.8) —
une seule vue. Lancer un `Explore` reviendrait à refaire un inventaire déjà fait.

---

### L1 — Résolveur de corpus, budget, traçabilité

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Opus 5** |
| **Réflexion** | **ultrathink** |
| **Skills** | `supabase`, `supabase:supabase-postgres-best-practices`, `engineering:testing-strategy`, puis `security-review` en sortie |
| **MCP** | `supabase` — `execute_sql`, `get_advisors` (lint sécurité après toute RPC touchée) |
| **Agents** | `Explore` (« très minutieux ») **en amont uniquement**, pour cartographier les chemins de données de `veille_digests`/`veille_articles` et du compte |

**Le lot le plus dense et le plus risqué en sécurité.** Il porte :
- l'hydratation **de contenu** (elle n'existe nulle part aujourd'hui — le registre existant
  ne rend que des métadonnées d'affichage) ;
- le budget et la troncature **déterministe** ;
- la **garde de workspace** pour tout provider service-role.

**Pourquoi ultrathink** : 4 des 16 RPC ne sont pas exécutables par `authenticated`. Se
tromper de mode d'exécution = contourner la RLS en silence. C'est le seul endroit du
chantier où une erreur crée une faille.

---

### L2 — Workflow n8n générique

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Sonnet 5** |
| **Réflexion** | **think** (mais **think hard** sur la configuration de l'appel LLM) |
| **Skills** | **`claude-api` (OBLIGATOIRE** — ids de modèles, `max_tokens`, format Messages API), `n8n-builder` |
| **MCP** | ❌ **`n8n-mcp` est bloqué en session agent** — ne pas tenter |
| **Agents** | aucun |

**Pourquoi Sonnet** : le workflow ne contient **aucune logique métier** (M-1/M-2). C'est
de la plomberie JSON calquée sur 12 workflows existants. Opus n'apporterait rien.

> ℹ️ **Ce lot peut être confié à un autre modèle que ceux de cette table** (Gemini par exemple) :
> il est mécanique et entièrement borné. Dans ce cas, **le §8 fait foi et se suffit à lui-même** —
> il énumère les trois fichiers autorisés, les 11 nœuds, le contrat de callback figé et la
> checklist de sortie. Ne pas résumer le §8 en le transmettant : sa longueur EST la garantie.

**Pourquoi `claude-api` est obligatoire** : le nœud `Call LLM` porte l'id de modèle et les
paramètres de l'API Messages. Ne jamais les écrire de mémoire.

🔴 **Trois règles absolues sur ce lot :**
1. **L'import et l'activation sur le VPS sont manuels, faits par Guillaume.** Préparer
   **un seul aller-retour** : JSON généré par script Python, `node --check` sur chaque
   nœud `Code`, exécution réelle vérifiée par harnais.
2. **Ne jamais proposer de handoff terminal pour n8n** — approche explicitement rejetée
   par Guillaume (coût de contexte). Rester sur JSON + import manuel, toujours.
3. **`npm test` n'inclut PAS les harnais n8n.** Lancer `npm run test:n8n`, et **lire le
   compteur final d'assertions, jamais le seul code de sortie** : une exception dans un
   nœud `Code` (globale n8n absente du sandbox : `$execution`, `$workflow`, `$env`) fait
   sauter silencieusement toutes les assertions suivantes. `intel-020` et `intel-040` ont
   vécu ainsi avec 117 assertions muettes.

---

### L3 — Callback : aiguillage, validateur, enum

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Opus 5** |
| **Réflexion** | **think hard** |
| **Skills** | `supabase` (migration d'enum), puis `code-review` en sortie |
| **MCP** | `supabase` — `apply_migration`, `execute_sql` |
| **Agents** | `feature-dev:code-reviewer` **après** le refactor, pour vérifier la non-régression des 4 chemins |

**Pourquoi Opus** : c'est un refactor de code **en production** qui aiguille des écritures
métier en service-role. Les 4 chemins (`account_knowledge`, `account_issues_map`,
document, `account_watch_refresh`) doivent conserver un **comportement strictement
identique**. C'est le lot où une régression silencieuse est la plus probable.

⚠️ **Piège certain** : `ALTER TYPE intelligence_document_type ADD VALUE 'mission_report'`
**casse le `typecheck`**, pas le build. Quatre `Record` exhaustifs le réclament aussitôt.
Méthode fiable : appliquer la migration, lancer `npm run db:types`, puis `npm run
typecheck` — le compilateur **désigne lui-même** les fichiers à patcher. Les corriger fait
partie du lot, pas d'un suivi.

---

### L5 — Pilote : `intel-021` rejoué en preset

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Opus 5** |
| **Réflexion** | **think hard** |
| **Skills** | aucun spécifique |
| **MCP** | `supabase` — `execute_sql` (comparer les `content_json` ancien/nouveau) |
| **Agents** | aucun |

**Pourquoi Opus** : le livrable est un **jugement de qualité comparée**, pas du code. Il
faut savoir dire « le générique est moins bon » si c'est le cas — c'est précisément la
valeur du pilote.

**Critère de sortie** : sur **la même période déjà analysée**, la sortie générique couvre
les **six sections** d'`intel-021` (tendances, signaux faibles, réglementation,
opportunités, risques, actions) via `Finding.category`, à qualité au moins équivalente.

> `intel-021` a tourné **3 fois en tout**. Le migrer ne met aucune valeur en risque —
> c'est exactement pourquoi c'est le bon pilote.

---

### L4 — Composeur UX (⏸️ suspendu)

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Sonnet 5** |
| **Réflexion** | **think** |
| **Skills** | `frontend-design`, `mobile-design`, `vercel:react-best-practices` |
| **MCP** | aucun |

**Ne pas démarrer avant la preuve du pilote L5.** Sans L4, chaque preset reste lançable
depuis `intelligence-registry.ts`.

> *Un moteur sans composeur reste un moteur ; un composeur sans moteur n'est qu'un
> formulaire.*

⚠️ Rappels : la **QA visuelle est faite par Guillaume** — ne pas ouvrir Chrome de sa
propre initiative. Et un canal Supabase Realtime souscrit **sans jeton** se souscrit « avec
succès » puis ne délivre jamais rien : `ensureRealtimeAuth()` avant `subscribe()`, sans
exception.

---

## 5. Faits vérifiés en base — ne pas les redécouvrir

Mesures live du 2026-08-18 sur `jvzgmhvwirsbdkjpmvla`. **Revérifier avant de s'appuyer sur
un chiffre**, mais ne pas refaire l'analyse.

| Fait | Valeur | Conséquence |
|---|---|---|
| `ai_intelligence_runs.run_type` | `text` libre, **20 valeurs**, aucun CHECK | M-3 tenable sans migration |
| `ai_intelligence_results` | `UNIQUE(run_id, phase)`, `CHECK phase 1..10` | Une mission = 1 ligne, `phase = 1` |
| Consommateurs sémantiques de `phase` | **1 seul** : `v_ai_intelligence_summary` | Garde M-4 = **un correctif de vue** |
| Code TS filtrant la colonne `phase` | **aucun** | Pas de balayage de composants |
| RPC non exécutables par `authenticated` | **4/16** | M-5 : mode d'exécution déclaré |
| RPC `SECURITY DEFINER` | **2/16** | Idem |
| Volumes corpus | `veille_articles` 31 · `veille_digests` 7 · `intelligence_documents` 137 · `companies` 112 · `account_signals` 839 | Périmètre pilote |
| Volumes à éviter | `content_collection_items` **5** · `source_corpora` **2** | **Ne pas piloter dessus** |
| Runs par workflow | `intel-010` 176 · `intel-020` 92 · **`intel-021` 3** | Ne jamais migrer les deux premiers |

### Faits ajoutés par l'audit de L0 (2026-08-18, revérifiés live)

| Fait | Valeur | Conséquence |
|---|---|---|
| Garde M-4 en base | **deux** migrations : `20260818101855` (latérale `res`) **+ `20260818110944`** (latérale `runs`) | La première ne guardait que `has_*`/`count_results` ; `count_runs`/`latest_run_*` restaient pollués |
| `v_crm_account_list` | lit `v_ai_intelligence_summary`, ne relit jamais `phase` | Hérite du garde-fou, rien à corriger |
| Fonctions SQL interprétant `phase` | **aucune** (`pg_proc` balayé) | L'inventaire §5.8 de l'ADR est complet |
| `run_type` en base | 20 valeurs, **0 NULL**, aucune préfixée `mission:` | Pas de collision possible |
| `createRun` (`src/lib/n8n/runs.ts`) | porte **déjà** `runType?: string` (`run_type = runType ?? workflowId`) | M-3 sans modifier `runs.ts` — il faut seulement le faire traverser `triggerN8nRun` |
| `createRun.config` | écrit en dur `{ workflowId }` | À étendre en L1 pour `{ missionSlug, missionVersion, corpusBudget }` (ADR §3) |
| `get_account_knowledge_context` | `auth_exec=false`, **pas** `SECURITY DEFINER`, signature `(p_workspace_id, p_company_id)` | En service-role : **aucune RLS**, et le workspace vient d'un paramètre → garde obligatoire (même schéma que la faille `get_manager_summary_facts`) |
| Hydratation veille | `veille_digests(titre_digest, resume_hebdo, digest_date)` · `veille_articles(titre_fr, resume, analyse_kredo, action_commerciale, published_at, digest_id, source_name)` | Matière réelle du provider `veille_period` |
| Hydratation documents | `intelligence_documents.current_content_text` / `current_content_json` | Matière réelle du provider `intelligence_document` |

### Les fichiers qui comptent

| Rôle | Chemin |
|---|---|
| Gateway de déclenchement (**à étendre**, ne pas dupliquer) | `src/app/api/n8n/trigger/route.ts` |
| Callback (aiguillage à extraire en L3) | `src/app/api/n8n/callback/route.ts` |
| Patron du résolveur, **déjà durci** | `src/features/content-collections/data/resolve-knowledge-scope.ts` |
| Patron de registre par type | `src/features/content-collections/domain/content-type-registry.ts` |
| Types n8n (à étendre) | `src/lib/n8n/types.ts` |
| Déclenchement n8n | `src/lib/n8n/trigger-run.ts`, `src/lib/n8n/runs.ts` |
| Points d'entrée UX (L4) | `src/lib/intelligence/intelligence-registry.ts` |
| Workflow pilote à migrer | `n8n/workflows/intel-021-monthly-watch-analysis.json` |
| Workflow de référence (anatomie type) | `n8n/workflows/intel-031-issues-map.json` |

---

## 6. Boucle de validation — non négociable

À la fin de **chaque** lot, dans cet ordre :

```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
```

**Ajouter `npm run test:n8n` dès qu'un fichier de `n8n/workflows/` est touché** —
`vitest` n'inclut que `src/**/*.test.ts`, donc `npm test` reste vert même quand un
workflow est cassé.

### Quatre pièges documentés au prix d'une session perdue chacun

1. **`tsc` ne voit pas tout.** Un composant client important une *valeur* depuis un module
   `server-only` passe le typecheck et casse `next build`. Seul le build le révèle.
2. **`.next/` périmé** produit de faux `TS6200`/`TS2300`. Purger avant de conclure à une
   régression (`rm -rf .next`).
3. **`build:webpack`** est la seule application réelle de la frontière serveur/client —
   Turbopack la tolère en silence.
4. **Un harnais n8n qui « passe » peut n'avoir rien exécuté.** Lire le compteur
   d'assertions.

### Migrations

- Appliquer via le MCP `supabase` (`apply_migration`), qui assigne le **vrai timestamp**.
- Puis **créer le fichier local aligné sur ce timestamp** dans `supabase/migrations/`.
  Le fichier local dérive du remote dès sa création — piège rencontré 3 fois.
- Puis `npm run db:types`.
- **Ne jamais modifier une migration déjà appliquée.**

---

## 7. Contraintes de collaboration

- **L'import n8n sur le VPS est manuel, fait par Guillaume.** Le MCP n8n est bloqué en
  session agent. Ne jamais proposer d'automatisation ni de handoff terminal pour n8n :
  approche explicitement rejetée.
- **La QA visuelle est faite par Guillaume**, sauf s'il donne explicitement la main sur un
  navigateur. Ne pas ouvrir Chrome de sa propre initiative.
- **Trancher et assumer** plutôt que présenter un menu d'options. Ne pas pivoter en cours
  de route.
- **Vérifier à la source.** Ne jamais qualifier quelque chose de factice, absent ou cassé
  sans avoir ouvert le fichier et suivi ses imports.
- **En fin de session significative** : entrée en tête de `docs/JOURNAL-SESSIONS.md`, et ne
  remonter dans `CLAUDE.md` que ce qui devient une règle durable ou change l'état de la base.

---

## 8. Lot L2 — `mission-001-run` : le workflow n8n générique

> **Le prompt du lot L1 est en historique git** (commit `5da91db4`), comme celui de L0 avant lui.
> L1 est livré ; §8.1 à §8.11 ci-dessous forment le **cahier des charges complet du lot L2**.

### 8.0 Prompt de démarrage — à copier tel quel dans une session neuve

> Contrairement à L0 et L1, ce prompt ne réexplique pas le détail : il pointe vers §8.1-§8.11,
> qui font foi et se suffisent à eux-mêmes. Ne les résume pas en les transmettant — leur longueur
> EST la garantie. En revanche les points ci-dessous sont dupliqués en dur dans ce prompt parce
> qu'une lecture en diagonale ne doit jamais pouvoir les manquer.

```text
Contexte : chantier « Missions d'intelligence » de Kredo, acté dans
docs/adr/ADR-0020-missions-intelligence.md (statut Accepté). Les lots L0 et L1 sont livrés.

Tu réalises le LOT L2, et RIEN d'autre. Lis dans cet ordre, intégralement, avant d'écrire quoi
que ce soit :
  1. docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md §8.1 à §8.11 — c'est le
     cahier des charges complet du lot, il fait foi sur tout le reste de ce prompt en cas de
     divergence.
  2. n8n/workflows/intel-021-monthly-watch-analysis.json — le workflow de référence, patron de
     plomberie (webhook, HMAC, callback signé). Son métier (hydratation, assemblage de prompt,
     validation de sortie) N'A PAS d'équivalent dans ton lot et ne doit pas être recopié.
  3. src/lib/n8n/types.ts — cherche `MissionRunEnvelope` : c'est EXACTEMENT ce que ton workflow
     reçoit dans `input`. Ne devine rien, ce type est déjà écrit et figé.
  4. src/lib/n8n/hmac.ts — un seul secret (`N8N_WEBHOOK_SECRET`) signe les deux sens. Le
     workflow de référence porte deux placeholders différents qui laissent croire à deux
     secrets : c'est trompeur, n'en crée pas deux.

Ne relis rien d'autre du chantier (ADR en entier, L0, L1, code de src/features/intelligence-missions/) :
leur substance utile à ce lot est déjà résumée dans le §8 du handoff.

──────────────────────────────────────────────────────────────────────
CE QUE TU PRODUIS — exactement trois fichiers, aucun de plus
──────────────────────────────────────────────────────────────────────
  1. n8n/workflows/mission-001-run.json          (11 nœuds — liste exacte en §8.6)
  2. n8n/workflows/mission-001-run.SETUP.md      (notice d'import, calquée sur les SETUP.md existants)
  3. n8n/workflows/__tests__/mission-001-run.test.js   (harnais Node, exécuté par npm run test:n8n)

──────────────────────────────────────────────────────────────────────
CE QUE TU NE TOUCHES SOUS AUCUN PRÉTEXTE (détail et pourquoi : §8.2)
──────────────────────────────────────────────────────────────────────
  ✗ Rien dans src/. Pas une ligne. "mission-001-run" est DÉJÀ dans N8nWorkflowId
    (src/lib/n8n/types.ts). Si tu penses avoir besoin d'un changement dans src/, ARRÊTE-TOI
    et signale-le au lieu de le faire : c'est le signe que tu as mal lu l'enveloppe.
  ✗ Aucune migration SQL, aucun apply_migration.
  ✗ Ne touche pas au callback (src/app/api/n8n/callback/route.ts) — c'est le lot L3, pas le tien.
  ✗ Ne modifie aucun autre fichier de n8n/workflows/.
  ✗ N'essaie pas d'importer le workflow sur le VPS ni de proposer un handoff terminal pour n8n
    — l'import est manuel, fait par Guillaume, et cette approche a déjà été explicitement
    rejetée. Le MCP n8n est bloqué en session agent.
  ✗ N'invente aucune logique métier : ton workflow ne parse pas la sortie du LLM, ne calcule
    aucun resultType, ne connaît même pas ce qu'est une « mission ». Il reçoit deux chaînes
    déjà prêtes (systemPrompt, userPrompt) et les transmet. Détail intégral en §8.3.

──────────────────────────────────────────────────────────────────────
TROIS RÈGLES QUI CASSENT LE CHANTIER SI TU LES RATES
──────────────────────────────────────────────────────────────────────
  1. Aucun identifiant de modèle en dur (ni "claude-*", ni un nombre de tokens). Tout vient de
     `input.model` dans l'enveloppe reçue. Le workflow de référence code son modèle en dur —
     NE LE RECOPIE PAS sur ce point précis. C'est ce qui permet de ne plus jamais réimporter
     ce workflow (décision M-6) : changer de modèle se fait dans le catalogue TypeScript.
  2. Le corps posté au callback ne contient AUCUN JSON.parse de la sortie LLM. `contentJson.rawOutput`
     est le texte brut, tel quel. La validation se fait une seule fois, côté Next.js, dans un
     lot ultérieur (M-2).
  3. `resultType` est le littéral "mission_report", écrit en dur dans ton code — jamais une
     valeur qui transite depuis l'enveloppe ou depuis la sortie du LLM (M-7). Le contrat de
     callback complet, avec exemple JSON, est en §8.5 : ne t'en écarte pas, il est immuable.

──────────────────────────────────────────────────────────────────────
MÉTHODE
──────────────────────────────────────────────────────────────────────
1. Génère le JSON du workflow par un script Python (dans le scratchpad, pas dans le repo) —
   jamais à la main : l'échappement du JavaScript en JSON est la source d'erreur n°1.
2. `node --check` sur chacun des 3 nœuds `Code` avant tout commit (§8.8).
3. Écris le harnais de test AVANT de déclarer le lot fini, et lis son compteur final
   d'assertions — jamais le seul code de sortie. Un harnais n8n qui « passe » peut n'avoir rien
   exécuté si une globale n8n (`$execution`, `$workflow`, `$()`) manque dans le mock (§8.7).
4. Boucle de validation complète, dans cet ordre :
   npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build && npm run test:n8n
   `test:n8n` est OBLIGATOIRE sur ce lot (un fichier de n8n/workflows/ est touché) — c'est le
   seul lot du chantier où il l'est. Les cinq premières commandes doivent rester vertes SANS
   qu'aucun fichier de src/ n'ait changé ; si l'une casse, tu es sorti du périmètre.
   Si le build échoue sur ENOTEMPTY ou de faux TS6200/TS2300 : rm -rf .next, puis relance.
5. Rapporte les compteurs réels — tests Vitest passés, assertions n8n exécutées, échecs éventuels.
   Jamais un simple « ça passe ».
6. Ne déclare jamais « le workflow fonctionne » : dis explicitement ce qui est vérifiable hors
   ligne (structure, nœuds Code testés, forme du contrat) versus ce qui ne l'est qu'après
   import manuel sur le VPS par Guillaume (§8.9).
7. Termine par la checklist de sortie du §8.11, point par point, dans ton rapport final.

Critère de sortie du lot : les 3 fichiers existent, git status ne montre AUCUN autre fichier
modifié, le workflow reproduit le squelette à 11 nœuds sans aucun code métier, le contrat de
callback du §8.5 est respecté à la lettre, et la boucle de validation complète (test:n8n inclus)
passe avec des compteurs réels rapportés.
```

---

### 8.1 Ce que tu dois produire — exactement trois fichiers

| # | Fichier | Nature |
|---|---|---|
| 1 | `n8n/workflows/mission-001-run.json` | Le workflow, **11 nœuds**, généré par script Python |
| 2 | `n8n/workflows/mission-001-run.SETUP.md` | Notice d'import pour Guillaume (~35 lignes, calquée sur `intel-021-monthly-watch-analysis.SETUP.md`) |
| 3 | `n8n/workflows/__tests__/mission-001-run.test.js` | Harnais Node, exécuté par `npm run test:n8n` |

### 8.2 🔴 Ce que tu ne dois toucher sous AUCUN prétexte

Cette liste n'est pas indicative. Toute modification hors des trois fichiers ci-dessus est un
échec du lot, même si elle « améliore » quelque chose.

- ❌ **Rien dans `src/`.** Aucune ligne. L1 a déjà tout posé côté TypeScript, et
  `"mission-001-run"` est **déjà** dans `N8nWorkflowId` (`src/lib/n8n/types.ts`). Si tu crois
  avoir besoin d'un changement dans `src/`, **arrête-toi et signale-le** : c'est le signe que tu
  as mal lu l'enveloppe.
- ❌ **Pas de migration SQL**, pas de `apply_migration`, pas de MCP Supabase en écriture.
- ❌ **Ne touche pas au callback** `src/app/api/n8n/callback/route.ts` — c'est le lot L3.
- ❌ **Ne modifie aucun autre workflow** de `n8n/workflows/`.
- ❌ **N'essaie pas d'importer le workflow sur le VPS.** Le MCP n8n est bloqué en session agent.
  L'import est **manuel, fait par Guillaume**. Ne propose pas non plus de « handoff terminal »
  pour n8n : approche explicitement rejetée, ne jamais la reproposer.
- ❌ **N'invente pas de logique métier.** Voir §8.4, c'est le cœur du lot.

---

### 8.3 Comprendre ce que tu construis (lis ce paragraphe deux fois)

Kredo a 19 workflows n8n. Douze d'entre eux contiennent du **métier** : ils hydratent des données
depuis Supabase, assemblent un prompt en JavaScript, appellent un LLM, valident sa sortie, puis
postent un callback. Ce métier vit donc dans du JSON importé à la main sur un VPS — impossible à
tester, impossible à relire, et sa dérive n'est pas détectée.

L'ADR-0020 renverse cela. **Le métier est remonté en TypeScript (déjà fait, lots L0 et L1).**
Ce qui reste à n8n, et c'est tout ce que tu construis :

```
recevoir un appel signé → marquer le run "running" → appeler le LLM → reposter le texte brut
```

> 🎯 **`mission-001-run` ne contient AUCUNE logique métier. Zéro.**
> Pas d'hydratation. Pas d'assemblage de prompt. Pas de validation de sortie. Pas de règle QA.
> Il ne sait même pas ce qu'est une « mission » : il reçoit deux chaînes de caractères déjà
> prêtes et les transmet.

**Pourquoi garder n8n si on lui retire le métier ?** Deux raisons, et deux seulement :
le **retry** sur l'appel LLM, et l'**historique d'exécution** déjà instrumenté par les vues
`v_ai_*_costs` et `v_workflow_health`. Refaire cela dans Vercel serait un recul.

**Pourquoi c'est important que tu n'ajoutes rien** — décision **M-6** : *ce workflow est importé
une seule fois sur le VPS et n'est plus jamais modifié.* Chaque nouvelle mission d'intelligence
(analyse de veille, synthèse de compte, note sectorielle…) réutilisera **ce même workflow**, sans
réimport. C'est tout l'intérêt du chantier. Si tu y mets quoi que ce soit de spécifique à une
mission, tu casses cette propriété et le chantier perd sa raison d'être.

---

### 8.4 Ce que le workflow reçoit — l'enveloppe (contrat figé par L1)

Next.js poste sur `{N8N_WEBHOOK_BASE_URL}/webhook/mission-001-run` un corps signé HMAC de cette
forme exacte (type `N8nTriggerPayload`, `src/lib/n8n/types.ts`) :

```jsonc
{
  "runId": "uuid du run déjà créé en base, statut 'queued'",
  "workflowId": "mission-001-run",
  "entityType": "workspace",           // ou "company" si la mission porte sur un compte
  "entityId": "uuid",
  "workspaceId": "uuid",
  "userId": "uuid",
  "callbackUrl": "https://.../api/n8n/callback",
  "input": {                            // ← type MissionRunEnvelope
    "schemaVersion": 1,
    "missionSlug": "veille-analyse-mensuelle",
    "missionVersion": 1,
    "systemPrompt": "…déjà assemblé par Next.js, à transmettre tel quel…",
    "userPrompt":   "…déjà assemblé par Next.js, corpus inclus, à transmettre tel quel…",
    "model": { "provider": "anthropic", "model": "claude-sonnet-5", "maxOutputTokens": 5000 },
    "corpus": { "kept": 12, "requested": 12, "dropped": 0, "totalChars": 11900 },
    "budget": { "maxTotalChars": 120000, "maxCharsPerItem": 4000, "maxItems": 120 },
    "requestedAt": "2026-08-18T08:00:00.000Z"
  }
}
```

> 🔴 **`model` et `maxOutputTokens` viennent de l'enveloppe, PAS du workflow.**
> C'est exactement ce qui permet à M-6 de tenir : changer de modèle pour une mission se fait
> dans le catalogue TypeScript et un `git push`, sans jamais retoucher n8n.
> **Ne code EN DUR ni `claude-sonnet-5`, ni `5000`, ni aucun identifiant de modèle.**
> Le workflow de référence `intel-021` les code en dur — **ne le recopie pas sur ce point.**

`systemPrompt` et `userPrompt` sont **déjà complets**. Tu ne les concatènes pas, tu n'y ajoutes
aucune consigne, tu n'y injectes aucune variable. Tu les passes à l'API.

---

### 8.5 Ce que le workflow doit reposter — le contrat de callback (IMMUABLE)

C'est la partie la plus importante du lot. Le workflow étant figé à vie (M-6), **ce contrat ne
pourra plus changer**. L3 sera écrit pour le consommer tel quel.

Corps du POST vers `callbackUrl`, signé HMAC :

```jsonc
{
  "n8nExecutionId": "<$execution.id>",
  "n8nWorkflowId":  "<$workflow.id>",
  "runId": "<repris de l'enveloppe>",
  "phase": 1,
  "resultType": "mission_report",
  "status": "succeeded",
  "contentJson": {
    "schemaVersion": 1,
    "missionSlug": "<repris de l'enveloppe>",
    "rawOutput": "<LE TEXTE BRUT DU LLM, NON PARSÉ, NON NETTOYÉ>"
  },
  "contentText": "<le même texte brut>",
  "title": "Mission — <missionSlug>",
  "modelProvider": "anthropic",
  "modelUsed": "<champ `model` de la réponse Anthropic>",
  "tokensInput":  "<usage.input_tokens>",
  "tokensOutput": "<usage.output_tokens>"
}
```

Quatre points à comprendre, pas seulement à appliquer :

1. **`rawOutput` est le texte BRUT.** Tu ne fais **pas** de `JSON.parse`, tu ne retires **pas**
   les balises de code, tu ne valides **rien**. Décision **M-2** : la sortie du LLM est validée
   **une seule fois, côté Next.js, dans le callback** (lot L3). Un `JSON.parse` dans n8n ferait
   échouer le run **avant** que Next.js puisse produire un message d'erreur exploitable, et
   imposerait de maintenir un validateur en double.
2. **`resultType` est le littéral `"mission_report"`, écrit en dur.** Il ne vient **jamais** de
   l'enveloppe. Raison — décision **M-7** : le callback aiguille en service-role, hors RLS, vers
   des écritures métier réelles (`account_issues_map` crée N lignes dans le CRM). Si une mission
   pouvait choisir son `resultType`, une intention rédigée en texte libre ferait écrire un LLM
   dans le CRM. En L3, le callback **re-dérivera** lui-même cette valeur depuis
   `run_type LIKE 'mission:%'` et ignorera ce que tu envoies : double verrou, c'est voulu.
3. **`phase: 1`, toujours.** Décision **M-4**. La vue `v_ai_intelligence_summary` a déjà été
   corrigée (migrations `20260818101855` + `20260818110944`) pour exclure `run_type LIKE
   'mission:%'`. Tu n'as rien à faire de ce côté, mais n'écris pas une autre valeur.
4. **`title` est un repli déterministe.** Le vrai titre est dans la sortie du LLM, que tu ne
   parses pas — L3 l'écrasera après validation.

**`n8nExecutionId` / `n8nWorkflowId` sont obligatoires dès le premier jour.** Onze workflows
existants ne les envoient pas encore, ce qui rend muet le lien « Ouvrir dans n8n » de
`/automations`. Ne reproduis pas cette dette sur un workflow neuf.

#### Le callback d'échec

Même forme, avec `"status": "failed"`, `"contentJson": { "error": "<message>" }`,
`"contentText": ""`, `"errorMessage": "<message>"`, `"title": "Mission — <slug> — échec"`.
Il doit fonctionner **même si l'enveloppe était invalide** : récupère `runId` et `callbackUrl`
en repli direct depuis le corps du webhook (patron `Prepare Failure Callback` d'`intel-021`).

---

### 8.6 Les 11 nœuds, un par un

Modèle de référence à ouvrir avant d'écrire : **`n8n/workflows/intel-021-monthly-watch-analysis.json`**.
Recopie-en la plomberie (webhook, crypto, callback signé) ; **ignore-en tout le métier**
(`Load Digests`, `Load Articles`, `Assemble Prompt`, `Validate Output` n'ont pas d'équivalent ici).

| # | Nom du nœud | Type n8n | Rôle |
|---|---|---|---|
| 1 | `Webhook — Mission Run` | `n8n-nodes-base.webhook` v2 | `path: "mission-001-run"`, POST, `responseMode: onReceived`, `options: { rawBody: true, responseCode: 202 }` |
| 2 | `Verify Signature` | `n8n-nodes-base.crypto` v1 | `action: hmac`, `binaryData: true`, `binaryPropertyName: "data"`, `type: SHA256`, `dataPropertyName: "computedSignature"`, `encoding: hex` |
| 3 | `Validate Envelope` | `n8n-nodes-base.code` v2 | Compare la signature, vérifie les champs, **aplatit l'enveloppe** |
| 4 | `Mark Run Running` | `n8n-nodes-base.httpRequest` v4.2 | PATCH Supabase REST, statut `running` |
| 5 | `Call LLM` | `n8n-nodes-base.httpRequest` v4.2 | POST `https://api.anthropic.com/v1/messages` |
| 6 | `Prepare Callback` | `n8n-nodes-base.code` v2 | Construit le corps du §8.5 et le sérialise |
| 7 | `Sign Callback` | `n8n-nodes-base.crypto` v1 | HMAC du `rawBody` |
| 8 | `Callback` | `n8n-nodes-base.httpRequest` v4.2 | POST signé vers `callbackUrl` |
| 9 | `Prepare Failure Callback` | `n8n-nodes-base.code` v2 | Idem, branche d'échec |
| 10 | `Sign Failure Callback` | `n8n-nodes-base.crypto` v1 | |
| 11 | `Callback (Failure)` | `n8n-nodes-base.httpRequest` v4.2 | |

Racine du fichier : `{ "name", "nodes", "connections", "active": false, "settings": { "executionOrder": "v1" }, "pinData": {} }`.

#### Nœud 3 — `Validate Envelope` (le seul code non trivial)

Il fait **de la validation de transport, pas du métier**. Rien de plus que ceci :

```js
const item = $input.first().json;
const body = item.body || {};
const headers = item.headers || {};
const received = headers['x-kredo-signature'] || headers['X-KREDO-Signature'] || '';
const expected = 'sha256=' + (item.computedSignature || '');
if (!received || received !== expected) throw new Error('Signature HMAC invalide');
for (const f of ['runId','workflowId','workspaceId','userId','input','callbackUrl']) {
  if (!body[f]) throw new Error('Champ requis manquant : ' + f);
}
if (body.workflowId !== 'mission-001-run') throw new Error('workflowId invalide');
const env = body.input;
if (env.schemaVersion !== 1) throw new Error('schemaVersion doit valoir 1');
for (const f of ['missionSlug','missionVersion','systemPrompt','userPrompt','model']) {
  if (env[f] === undefined || env[f] === null || env[f] === '') throw new Error('Champ enveloppe manquant : ' + f);
}
if (!env.model.model || !env.model.maxOutputTokens) throw new Error('model.model / model.maxOutputTokens requis');
return [{ json: {
  runId: body.runId, workspaceId: body.workspaceId, userId: body.userId,
  callbackUrl: body.callbackUrl,
  missionSlug: env.missionSlug, missionVersion: env.missionVersion,
  systemPrompt: env.systemPrompt, userPrompt: env.userPrompt, model: env.model,
} }];
```

#### Nœud 5 — `Call LLM`

```jsonc
{
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "anthropicApi",
  "sendHeaders": true,
  "headerParameters": { "parameters": [{ "name": "anthropic-version", "value": "2023-06-01" }] },
  "sendBody": true, "contentType": "json", "specifyBody": "json",
  "jsonBody": "={{ { model: $json.model.model, max_tokens: $json.model.maxOutputTokens, thinking: { type: 'disabled' }, system: $json.systemPrompt, messages: [{ role: 'user', content: $json.userPrompt }] } }}",
  "options": { "timeout": 180000 }
}
```

Et sur ce nœud **uniquement**, active le retry — c'est l'une des deux raisons de garder n8n :
`"retryOnFail": true, "maxTries": 3, "waitBetweenTries": 3000`.
Timeout à **180 000 ms** (et non 90 000 comme `intel-021`) : un corpus de mission peut atteindre
120 000 caractères. Vercel n'attend pas, le callback est asynchrone.

#### Extraction de la réponse, dans `Prepare Callback`

L'API Messages rend `content` comme un **tableau de blocs**. Ne prends pas `content[0]`
aveuglément :

```js
const blocks = llm.content || [];
const text = blocks.filter(b => b && b.type === 'text').map(b => b.text).join('');
if (!text) throw new Error('Réponse LLM vide');
```

#### Câblage des erreurs

Sur les nœuds **3, 4, 5 et 6**, pose `"onError": "continueErrorOutput"`, et relie leur
**sortie `main[1]`** à `Prepare Failure Callback`. Chaîne nominale :
`1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`. Chaîne d'échec : `9 → 10 → 11`.

#### ⚠️ Le piège des deux secrets

`intel-021` porte deux placeholders différents, `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` et
`REMPLACE_PAR_TON_N8N_CALLBACK_SECRET`, ce qui laisse croire à deux secrets distincts.
**Il n'y en a qu'un.** `src/lib/n8n/hmac.ts` signe et vérifie les deux sens avec le même
`N8N_WEBHOOK_SECRET`. Utilise **un seul placeholder**, `REMPLACE_PAR_N8N_WEBHOOK_SECRET`, dans
les deux nœuds `crypto` de signature, et dis-le explicitement dans le SETUP.

---

### 8.7 Le harnais de test — et le piège qui a déjà coûté 117 assertions muettes

Crée `n8n/workflows/__tests__/mission-001-run.test.js`, sur le modèle de
`intel-040-workspace-diagnostic.test.js` (compteurs `passed`/`failed`, fonction `check()`,
affichage final `${passed} passed, ${failed} failed`).

> 🔴 **`npm test` (Vitest) n'inclut PAS ces harnais** — il ne prend que `src/**/*.test.ts`.
> C'est `npm run test:n8n` qui les exécute. Un workflow cassé laisse `npm test` parfaitement vert.

> 🔴 **Un harnais qui « passe » peut n'avoir rien exécuté.** Ces harnais sont des scripts Node
> nus : une exception dans un nœud `Code` — typiquement une globale n8n absente du sandbox
> (`$execution`, `$workflow`, `$input`, `$()`) — fait sauter **toutes les assertions restantes**
> sans faire échouer le script. `intel-020` et `intel-040` ont vécu ainsi avec **117 assertions
> muettes**. **Lis toujours le compteur final, jamais le seul code de sortie.**
> Dans ton rapport, cite le nombre d'assertions exécutées.

**Assertions structurelles** (lecture du JSON) :
- exactement **11 nœuds**, et les 11 noms attendus sont présents ;
- **aucun** nœud nommé `Assemble Prompt`, `Hydrate*`, `Load *`, `Validate Output`, `Quality Check` ;
- le `jsonBody` de `Call LLM` référence `$json.model.model` et `$json.model.maxOutputTokens`,
  et **ne contient aucune chaîne `claude-`** — c'est l'assertion qui protège M-6 ;
- `Call LLM` porte `retryOnFail: true` ;
- les nœuds 3/4/5/6 portent `onError: "continueErrorOutput"` et sont câblés en `main[1]` vers
  `Prepare Failure Callback` ;
- le code de `Prepare Callback` contient `resultType` avec le littéral `'mission_report'`,
  `phase` à `1`, et **ne contient ni `JSON.parse` ni `mapResultType`** ;
- le webhook a `path === "mission-001-run"` et `rawBody: true`.

**Assertions exécutables** (les plus utiles — exécute réellement les nœuds `Code` dans un
`vm` avec des globales mockées) :
- `Validate Envelope` sur une enveloppe valide → rend `systemPrompt`, `userPrompt`, `model` ;
- sur une signature fausse → **lève** `Signature HMAC invalide` ;
- sur `schemaVersion: 2` → lève ;
- `Prepare Callback` sur une réponse Anthropic réaliste (blocs `content`, `usage`, `model`)
  → `rawBody` est un JSON dont `resultType === 'mission_report'`, `phase === 1`,
  `contentJson.rawOutput` **égale exactement** le texte du LLM (aucune transformation) ;
- `Prepare Failure Callback` avec `Validate Envelope` en échec → produit quand même un corps
  avec le bon `runId` et `status: 'failed'`.

Globales à mocker dans le `vm` : `$input`, `$json`, `$execution` (`{ id: 'exec-1' }`),
`$workflow` (`{ id: 'wf-1' }`), et `$('Nom du nœud')` renvoyant `{ item: { json: … } }`.

---

### 8.8 Méthode de production du JSON

**Génère le fichier par un script Python**, pas à la main : l'échappement du JavaScript dans du
JSON est la source d'erreur n°1 sur ce type de fichier. Mets le script dans le scratchpad, pas
dans le repo.

Puis, avant tout commit :
```bash
node --check <(python3 -c "import json;print(json.load(open('n8n/workflows/mission-001-run.json'))['nodes'][2]['parameters']['jsCode'])")
```
— et fais-le pour **chacun** des trois nœuds `Code` (indices à adapter). Un `jsCode`
syntaxiquement invalide passe la validation JSON sans problème et n'explose qu'à l'exécution
sur le VPS, c'est-à-dire trop tard.

---

### 8.9 Ce que tu peux prouver, et ce que tu ne peux pas

| Vérifiable par toi, hors ligne | Vérifiable seulement par Guillaume, après import |
|---|---|
| Structure du workflow, absence de métier | Que le webhook répond 202 |
| Exécution réelle des 3 nœuds `Code` | Que la credential `anthropicApi` est bien résolue |
| Forme exacte du corps de callback | Que le HMAC passe de bout en bout |
| Cohérence avec l'enveloppe produite par L1 | Que le run passe `queued → running → succeeded` |

**Ne déclare jamais « le workflow fonctionne ».** Dis : *« le workflow est conforme au contrat et
ses nœuds `Code` sont testés ; l'exécution réelle reste à valider après import. »*

**Bonne nouvelle qui borne le risque** : `ai_intelligence_results.result_type` est du **`text`
libre**, et l'aiguillage du callback est une **allowlist stricte**
(`mapResultTypeToDocumentType` rend `null` pour toute valeur inconnue). Donc, **avant même que
L3 existe**, un run de mission qui aboutit écrit sa ligne de résultat **sans créer aucun
document et sans déclencher aucune écriture métier**. L2 est donc testable de bout en bout
tout seul, et ne peut rien casser dans le CRM. C'est vérifié, pas supposé.

---

### 8.10 Boucle de validation — dans cet ordre, sans en sauter

```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build && npm run test:n8n
```

`npm run test:n8n` est **obligatoire ici** (un fichier de `n8n/workflows/` est touché) — et c'est
le seul lot où il l'est. Les cinq premières commandes doivent rester vertes **sans que tu aies
touché à `src/`** : si l'une casse, c'est que tu es sorti du périmètre.

Si le build échoue sur `ENOTEMPTY` ou de faux `TS6200`/`TS2300` : `rm -rf .next`, puis relance.

**Rapporte les compteurs réels** — nombre de tests passés, nombre d'assertions n8n exécutées,
échecs éventuels. Jamais un simple « ça passe ».

### 8.11 Checklist de sortie du lot

- [ ] 3 fichiers créés, **aucun autre fichier modifié** (`git status` le prouve)
- [ ] 11 nœuds, aucun nœud de métier
- [ ] Aucun identifiant de modèle en dur — tout vient de l'enveloppe
- [ ] `resultType: 'mission_report'` littéral, `phase: 1`
- [ ] `rawOutput` = texte brut, aucun `JSON.parse` nulle part
- [ ] `n8nExecutionId` / `n8nWorkflowId` envoyés
- [ ] Branche d'échec câblée sur les 4 nœuds faillibles
- [ ] `node --check` passé sur les 3 `jsCode`
- [ ] Harnais : compteur final lu et cité dans le rapport
- [ ] Boucle de validation complète, compteurs rapportés
- [ ] `SETUP.md` écrit, avec le secret unique et les credentials à configurer
- [ ] Le rapport final dit explicitement ce qui reste à valider après import VPS

---

## 9. Journal du chantier

| Date | Événement |
|---|---|
| 2026-08-18 | Vision fondatrice reçue (`00`), audit mesuré (`01`), critique et périmètre (`02`), architecture v0 (`03`) |
| 2026-08-18 | Revue contradictoire (ChatGPT) : 5 objections, **5 acceptées** — dont une invalidant la rédaction initiale de M-5 |
| 2026-08-18 | **ADR-0020 Accepté**. Périmètre de la garde M-4 mesuré : un seul consommateur sémantique (§5.8) |
| 2026-08-18 | Hors périmètre, découvert en préparant l'ADR : faille `get_manager_summary_facts` **corrigée** (migration `20260818092506`, boucle de validation complète passée) |
| 2026-08-18 | **L0 livré** (ChatGPT) — contrats, catalogue, `run_type`, garde M-4 partielle (`20260818101855`) |
| 2026-08-18 | **L1 livré** (Claude Code) — 3 providers **tous en `user_rls`** (le service-role s'est révélé inutile, cf. écart #1), budget déterministe pur, résolveur à allowlist stricte, assembleur de prompt pur, branche `missionSlug` dans la gateway existante. Boucle complète : typecheck ✅ · **1485 tests, 0 échec** (+84) · server-boundary ✅ · lint ✅ sur les fichiers du lot · build ✅. **La garde de workspace est vérifiée par mutation** : retirer le `.eq("workspace_id", …)` du verrou d'entrée d'`account-context-provider.ts` fait échouer 3 tests sur 6 d'`account-context-provider.test.ts`. `get_advisors` (sécurité) : 16 avertissements, **tous préexistants et étrangers au lot** — L1 ne crée ni RPC, ni policy, ni migration |
| 2026-08-18 | **L0 audité et corrigé** (Claude Code) — boucle de validation rejouée localement (typecheck ✅ · 1401 tests ✅ · server-boundary ✅ · build ✅ après `rm -rf .next` · lint : 0 problème sur les fichiers du lot). Deux correctifs : garde M-4 complétée sur la latérale `runs` (migration `20260818110944`, empreinte des 112 lignes inchangée) et `MissionSpec.corpus.requiredAtLaunch` ajouté — sans lui le preset pilote décrivait une mission sans corpus. `Recommendation.horizon` ajouté pour la fidélité au pilote L5 |

# 05 — Handoff d'implémentation « Missions d'intelligence »

> **Statut** : opérationnel — document de reprise pour tout agent entrant.
> **Autorité** : `docs/adr/ADR-0020-missions-intelligence.md` (**Accepté** le 2026-08-18).
> En cas de divergence avec `02` ou `03`, **l'ADR fait foi**.
> **Dernière mise à jour** : 2026-08-18.

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

## 8. Prompt de démarrage du lot L1 — ⚠️ LOT LIVRÉ, conservé pour mémoire

> 🔴 **L1 est livré (2026-08-18). Ne pas rejouer ce prompt.** Il est conservé parce qu'il
> documente les contraintes du lot, mais le prochain lot est **L2**. Lire d'abord le §2
> (surface livrée, cinq écarts, ce que L2 et L3 doivent savoir), puis le §4 « L2 ».

### Prompt d'origine du lot L1

> À copier tel quel dans une session neuve, après avoir réglé `/model claude-opus-5`.
> Le prompt est autoportant. **Le prompt du lot L0 est en historique git** (commit du
> cadrage) — il n'est plus reproduit ici, L0 étant livré et audité.

```text
Contexte : chantier « Missions d'intelligence » de Kredo, acté dans
docs/adr/ADR-0020-missions-intelligence.md (statut Accepté). Lis d'abord, dans cet ordre :
  1. docs/adr/ADR-0020-missions-intelligence.md — les 7 décisions M-1 à M-7 font autorité,
     et particulièrement §5.1 (mode d'exécution des providers) et §5.2 (gateway unique)
  2. docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md — §3, §5, §6
  3. docs/FEATURES/intelligence_missions/03-ARCHITECTURE-CIBLE.md §4 — le résolveur
  4. Le code livré en L0 : src/features/intelligence-missions/domain/*.ts
Ne relis pas 00/01/02 : leur substance est reprise dans l'ADR.

Tu réalises le LOT L1, et RIEN d'autre. Ultrathink : c'est le seul lot du chantier où
une erreur crée une faille de sécurité, pas seulement un bug.

──────────────────────────────────────────────────────────────────────
CE QUI EXISTE DÉJÀ (L0 livré et audité — ne pas le réécrire)
──────────────────────────────────────────────────────────────────────
  * src/features/intelligence-missions/domain/mission-contracts.ts
      MissionSpec, CorpusKind, CorpusSelector, CorpusItem, ResolvedCorpus, CorpusBudget,
      CorpusProvider (avec `execution: "user_rls" | "service_role"`), CorpusResolveContext,
      MissionReportV1, Finding (6 catégories), Recommendation, SourceRef.
      MissionSpec.corpus porte `base`, `requiredAtLaunch`, `userAddition`, `budget`.
      `ResolvedCorpus.trace` porte ref + title + provenance + kept + reason.
  * domain/mission-catalog.ts — un seul preset, `veille-analyse-mensuelle`,
    `base: []` et `requiredAtLaunch: ["veille_period"]` (la période vient du lancement).
  * domain/mission-run-type.ts — buildMissionRunType / isMissionRunType, testés.
  * Garde M-4 en base : migrations 20260818101855 + 20260818110944. Ne pas y revenir.

──────────────────────────────────────────────────────────────────────
PÉRIMÈTRE — quatre livrables, aucun de plus
──────────────────────────────────────────────────────────────────────

A. LES TROIS CORPUS PROVIDERS, dans src/features/intelligence-missions/data/corpus/
   Un fichier par origine, chacun exportant un CorpusProvider complet.
   Ils HYDRATENT DU CONTENU : c'est ce qui n'existe nulle part aujourd'hui
   (content-type-registry.ts ne rend que des métadonnées d'affichage — le lire comme
   patron de registre, PAS comme source d'hydratation).

   1. veille_period  (execution: "user_rls")
      veille_digests (titre_digest, resume_hebdo, digest_date) +
      veille_articles (titre_fr, resume, analyse_kredo, action_commerciale,
      published_at, source_name, digest_id) sur [periodStart, periodEnd].
      RLS workspace standard : le client utilisateur suffit, ne pas passer en service-role.

   2. intelligence_document  (execution: "user_rls")
      intelligence_documents.current_content_text / current_content_json, par ids.
      Ignorer les documents archivés (archived_at non nul) et le dire dans la trace.

   3. account_context  (execution: "service_role" — À VÉRIFIER avant d'écrire)
      🔴 get_account_knowledge_context est `auth_exec = false` et n'est PAS
      SECURITY DEFINER : appelée en service-role elle s'exécute SANS AUCUNE RLS, et
      elle filtre sur son paramètre p_workspace_id. C'est exactement le schéma de la
      faille get_manager_summary_facts corrigée le 2026-08-18.
      Donc, sans exception :
        * le workspaceId provient de profiles.workspace_id résolu côté serveur à partir
          de la session — JAMAIS d'un champ du body ;
        * le provider revérifie explicitement que la company demandée appartient à ce
          workspace AVANT de retourner quoi que ce soit ;
        * ce contrôle porte un test dédié qui échoue si la garde est retirée.
      Vérifie d'abord si un chemin sous RLS utilisateur suffit (lecture directe de
      companies + account_signals + contacts). Si oui, prends-le et déclare "user_rls" :
      le service-role est un dernier recours, pas un confort.

B. LE BUDGET ET LA TRONCATURE — déterministes, jamais aléatoires, jamais délégués au LLM
   Ordre imposé (ADR §4.4) :
     1. troncature de chaque item à maxCharsPerItem, coupe en fin, marqueur explicite ;
     2. tri par (weight du provider DESC, date DESC) ;
     3. conservation jusqu'à maxTotalChars / maxItems ;
     4. tout élément écarté est compté ET tracé, jamais silencieux.
   Fonction pure, testée sur les cas limites : corpus vide, un seul item plus gros que
   maxTotalChars, égalité de weight, dates nulles (ordre stable et reproductible exigé).

C. LE RÉSOLVEUR ET SON BRANCHEMENT DANS LA GATEWAY EXISTANTE
   * data/resolve-mission-corpus.ts : preset + sélecteurs de lancement → ResolvedCorpus.
     Refuse le lancement si un kind de `requiredAtLaunch` n'a pas de sélecteur, et si un
     sélecteur porte un kind absent de `base`/`requiredAtLaunch`/`userAddition.kinds`
     (allowlist stricte : l'appelant ne choisit pas ses corpus).
   * data/assemble-mission-prompt.ts : preset + corpus → { systemPrompt, userPrompt }.
     Fonction PURE et testée — c'est le cœur du critère de succès du chantier.
   * src/app/api/n8n/trigger/route.ts : une branche `missionSlug`, dans la route
     EXISTANTE. Ne crée pas de second chemin de lancement, ne crée pas
     actions/launch-mission.ts (ADR §5.2). Patron à suivre : le bloc « 3ter. Résolution
     du Knowledge Scope », qui repart déjà du seul identifiant serveur et écrase tout
     `refs` venu du navigateur.
   * run_type : `createRun` porte DÉJÀ `runType?: string` (run_type = runType ?? workflowId).
     Il suffit de le faire traverser `triggerN8nRun` (TriggerN8nRunInput) et de passer
     buildMissionRunType(slug). Étendre aussi `config` — aujourd'hui `{ workflowId }` en
     dur — pour porter { missionSlug, missionVersion, corpusBudget } (ADR §3).

D. LA TRAÇABILITÉ
   `ResolvedCorpus.trace` est écrite dans ai_intelligence_runs.input_snapshot.
   Références, titres et provenance UNIQUEMENT — jamais de contenu copié (P2).
   Contrainte inter-lots à respecter : la trace doit suffire au callback L3 pour
   reconstituer un SourceRef à partir du seul identifiant rendu par le LLM. Ne pas
   l'appauvrir.

──────────────────────────────────────────────────────────────────────
HORS PÉRIMÈTRE — ne rien commencer de tout cela
──────────────────────────────────────────────────────────────────────
  ✗ Tout JSON n8n, y compris mission-001-run (L2)
  ✗ Toute modification du callback, le validateur MissionReportV1, l'enum
    mission_report et ses 4 Record exhaustifs (L3)
  ✗ Toute UI, y compris un bouton de lancement (L4, suspendu)
  ✗ Toute migration d'un workflow existant, et tout retour sur la garde M-4
  ✗ Tout nouveau CorpusKind : content_collection et source_corpus attendent d'avoir
    de la matière (5 et 2 lignes)

──────────────────────────────────────────────────────────────────────
MÉTHODE
──────────────────────────────────────────────────────────────────────
1. Un agent Explore (« très minutieux ») en AMONT uniquement, pour cartographier les
   chemins de données veille et compte. Aucun agent ensuite.
2. Lire avant d'écrire. Ne jamais qualifier quelque chose d'absent ou de cassé sans
   avoir ouvert le fichier et suivi ses imports.
3. `import "server-only"` sur tout module touchant le client Supabase serveur.
4. Passer `security-review` sur le provider service-role avant de déclarer le lot fini,
   et `get_advisors` (MCP supabase) si une RPC ou une policy est touchée.
5. Boucle de validation complète, dans l'ordre, avant de déclarer le lot fini :
   npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
   (test:n8n inutile ici : aucun fichier de n8n/workflows/ n'est touché.)
   Si le build échoue sur ENOTEMPTY ou de faux TS6200/TS2300 : rm -rf .next, puis relancer.
   Rapporter les compteurs réels (tests passés, échecs), jamais un simple « ça passe ».
6. Terminer en mettant à jour le §2 et le §9 de
   docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md, et en signalant tout
   écart constaté entre l'ADR et la réalité du code.

Critère de sortie du lot : depuis la gateway existante, le preset veille-analyse-mensuelle
produit un prompt assemblé et un ResolvedCorpus tracé, borné par son budget, sur une
période de veille réelle — sans qu'aucune ligne ne soit lue hors du workspace de
l'utilisateur, et avec un test qui échoue si la garde de workspace est retirée.
```

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

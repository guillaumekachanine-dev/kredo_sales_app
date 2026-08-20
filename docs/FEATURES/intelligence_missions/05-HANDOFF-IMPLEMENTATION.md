# 05 — Handoff d'implémentation « Missions d'intelligence »

> ---
> 🗄️ **HISTORIQUE D'IMPLÉMENTATION L0 → L3. Ne plus utiliser comme état courant.**
> Ce document annonce encore L3 et L5 comme travaux futurs : ils sont livrés et validés.
> **État courant et suite du chantier : [`07-HANDOFF-L6-RENTABILITE-PORTEFEUILLE.md`](./07-HANDOFF-L6-RENTABILITE-PORTEFEUILLE.md).**
> Son contenu est conservé intact : il documente précisément comment L0 → L3 ont été construits.
> *(bandeau ajouté le 2026-08-20)*
> ---

> **Statut** : opérationnel — document de reprise pour tout agent entrant.
> **Autorité** : `docs/adr/ADR-0020-missions-intelligence.md` (**Accepté** le 2026-08-18).
> En cas de divergence avec `02` ou `03`, **l'ADR fait foi**.
> **Dernière mise à jour** : 2026-08-18 — **L0, L1 et L2 livrés**. Le lot courant est **L3**,
> dont le cahier des charges complet est le **§8**. L2 reste importable manuellement sur le
> VPS par Guillaume dès que possible ; **rien de L3 n'en dépend**, il peut démarrer avant.

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
| **L2** | `mission-001-run` + harnais + **import VPS unique** | ✅ **Livré** — 2026-08-18 (le JSON, les tests et la notice ; **l'import VPS reste manuel, à faire par Guillaume**) | 2 |
| **L3** | Callback : aiguillage, validateur, enum `mission_report` | ✅ **Livré** — 2026-08-18 (migration `20260818140533`) | 1 |
| **L5** | Pilote : `intel-021` rejoué en preset + comparaison | ⬜ **À FAIRE — prochain** | 1 |
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

> **Précision ajoutée après lecture du code (2026-08-18), avant de démarrer L3.** Le
> compilateur ne désigne pas les QUATRE fichiers avec la même netteté. Dans
> `document-display.tsx`, `DOCUMENT_OBJECT_LABELS: Record<DocumentType, string>` est
> directement dérivé de l'enum (via `DocumentListItem["documentType"]` /
> `DocumentDetail["documentType"]`) et sera flagué proprement, comme les Records de
> `DocumentCard.tsx`, `DocumentMobileDetail.tsx` et
> `communication-result-documents.ts` (`FALLBACK_TITLE_BY_DOCUMENT_TYPE`).
> **Mais le type `ReportDocumentType`, le `Set REPORT_DOCUMENT_TYPES` et le second Record
> `DOCUMENT_TYPE_LABELS` (`Record<CommunicationDocumentType | ReportDocumentType, string>`)
> du même fichier sont indexés sur une union maintenue À LA MAIN, pas dérivée de l'enum.**
> `tsc` ne les réclamera qu'indirectement (une erreur d'indexation au site d'appel de
> `getDocumentCategory`/`getDocumentTypeLabel`, pas sur leur définition). Les patcher fait
> partie du lot au même titre : sans `"mission_report"` dans `REPORT_DOCUMENT_TYPES`, un
> document de mission serait classé `"communication"` au lieu de `"report"` — en silence,
> sans erreur de compilation.

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

## 8. Lot L3 — Callback : aiguillage, validateur, enum `mission_report`

> **Le cahier des charges du lot L2 est en historique git** (commit `09e8dff3` pour le prompt,
> les 3 fichiers livrés eux-mêmes dans un commit distinct). Le workflow `mission-001-run.json`
> et sa notice `mission-001-run.SETUP.md` sont désormais la référence vivante de ce que L2 a
> produit — ne les reproduis pas ici.
>
> §8.1 à §8.12 ci-dessous forment le **cahier des charges complet du lot L3**. C'est le lot que
> l'ADR désigne explicitement comme **le plus risqué du chantier** : *« c'est un refactor de
> code en production qui aiguille des écritures métier en service-role […] c'est le lot où une
> régression silencieuse est la plus probable »* (§4, config L3). Lis-le en entier, une seule
> fois, avant d'écrire quoi que ce soit — pas en diagonale.

### 8.0 Prompt de démarrage — à copier tel quel dans une session neuve

```text
Contexte : chantier « Missions d'intelligence » de Kredo, acté dans
docs/adr/ADR-0020-missions-intelligence.md (statut Accepté). Les lots L0, L1 et L2 sont livrés.
L2 (le workflow n8n mission-001-run) attend encore son import manuel sur le VPS par Guillaume,
mais RIEN de ton lot n'en dépend : tu testes le callback avec un client Supabase simulé, jamais
avec un vrai run n8n.

Tu réalises le LOT L3, et RIEN d'autre. Ultrathink : l'ADR désigne ce lot comme celui où une
erreur crée le plus probablement une régression silencieuse EN PRODUCTION, pas seulement un bug
dans du code neuf. Le fichier que tu modifies (src/app/api/n8n/callback/route.ts) est sur le
chemin critique de 12 workflows n8n déjà en production. Une erreur ici casse des flux qui
tournent aujourd'hui, pas seulement le flux missions.

Lis dans cet ordre, intégralement, avant d'écrire quoi que ce soit :
  1. docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md §8.1 à §8.12 — cahier
     des charges complet, fait foi sur tout le reste de ce prompt en cas de divergence.
  2. src/app/api/n8n/callback/route.ts, EN ENTIER (196 lignes). Comprends les 4 chemins déjà
     en production avant d'en ajouter un cinquième : account_knowledge (L90-112),
     account_issues_map (L153-167), document générique (L169-175), account_watch_refresh
     (L187-189, un cas particulier de revalidation, pas un chemin d'écriture).
  3. src/app/api/n8n/callback/route.test.ts, EN ENTIER (387 lignes) — c'est ta preuve de
     non-régression. Chaque test qui y existe DOIT continuer à passer, sans qu'aucun ne soit
     modifié pour "s'adapter" à ton changement.
  4. src/lib/intelligence/account-knowledge-ingest.ts — le PATRON à suivre. C'est le seul
     autre endroit du callback qui fait déjà ce que tu vas faire : refuser un artefact LLM
     structurellement invalide ou dont les citations ne sont pas vérifiables, AVANT
     persistance, en basculant le run en `failed` avec un message exploitable. Note en
     particulier comment il vérifie que chaque UUID cité dans source_refs appartient
     RÉELLEMENT au workspace du run — c'est exactement le contrôle que tu vas faire, mais
     contre la trace du corpus au lieu de la table intelligence_sources.
  5. src/lib/intelligence/intelligence-validators.ts — cherche `ValidationIssue` et
     `ValidationResult<T>` : réutilise ces deux types plutôt que d'en inventer d'autres.
  6. src/features/intelligence-missions/domain/mission-contracts.ts — MissionReportV1,
     Finding, Recommendation, SourceRef, ResolvedCorpus["trace"] sont DÉJÀ écrits et figés
     (lots L0/L1). Ne les redéfinis pas, importe-les.
  7. src/lib/communication/communication-result-documents.ts — cherche
     RESULT_DOCUMENT_TYPE_BY_RESULT_TYPE, FALLBACK_TITLE_BY_DOCUMENT_TYPE,
     buildResultContentText, isEligibleDocumentResultType.

Ne relis rien d'autre du chantier (ADR en entier, L0, L1, L2, le JSON de mission-001-run) :
leur substance utile à ce lot est déjà résumée dans le §8 du handoff.

──────────────────────────────────────────────────────────────────────
CE QUE TU PRODUIS
──────────────────────────────────────────────────────────────────────
  1. src/features/intelligence-missions/domain/validate-mission-report.ts   (pur, §8.4)
  2. src/features/intelligence-missions/domain/render-mission-report-text.ts (pur, §8.5)
  3. Tests Vitest pour les deux fichiers ci-dessus, dans
     src/features/intelligence-missions/__tests__/
  4. src/app/api/n8n/callback/route.ts — ÉTENDU, jamais réécrit (détail exact en §8.6)
  5. src/app/api/n8n/callback/route.test.ts — ÉTENDU avec de nouveaux cas, les existants
     RESTENT INTACTS (détail exact en §8.7)
  6. src/lib/communication/communication-result-documents.ts — deux entrées ajoutées à deux
     Records existants (§8.8)
  7. Trois fichiers UI patchés au minimum vital pour compiler (§8.9) :
     src/components/reports/document-display.tsx, DocumentCard.tsx, DocumentMobileDetail.tsx
  8. Une migration : ALTER TYPE intelligence_document_type ADD VALUE 'mission_report' (§8.10)

──────────────────────────────────────────────────────────────────────
CE QUE TU NE TOUCHES SOUS AUCUN PRÉTEXTE
──────────────────────────────────────────────────────────────────────
  ✗ Les 4 chemins EXISTANTS du callback (account_knowledge, account_issues_map, document
    générique, account_watch_refresh) : ni leur code, ni leur ordre, ni leurs conditions.
    Ton diff sur route.ts ne doit contenir QUE des ADDITIONS — de nouvelles colonnes dans
    le SELECT initial, et un nouveau bloc. Si `git diff` montre une ligne modifiée ou
    supprimée dans un bloc existant, tu es sorti du périmètre.
  ✗ Aucun fichier de n8n/workflows/. mission-001-run ne change plus jamais (M-6) — même si
    tu penses qu'un champ manque à l'enveloppe, ce n'est pas ton lot.
  ✗ Aucune UI de lancement, aucun composeur (L4, suspendu — décidé seulement après L5).
  ✗ Aucun rendu spécifique aux missions dans les composants de rapports (pas de badge
    "findings", pas d'affichage structuré des recommandations). Le point 7 ci-dessus est
    UNIQUEMENT pour que ça compile et s'affiche avec un libellé générique correct — pas
    pour construire une présentation dédiée.
  ✗ Aucun moteur de schéma JSON générique, aucun DSL de règles QA. Rejeté explicitement par
    l'ADR §5.3 : un seul contrat de sortie, un validateur écrit à la main.
  ✗ Ne relance rien sur la garde M-4 (déjà livrée, L0/L1).
  ✗ N'ajoute aucun CorpusKind.

──────────────────────────────────────────────────────────────────────
LES RÈGLES QUI CASSENT LA SÉCURITÉ DU CHANTIER SI TU LES RATES
──────────────────────────────────────────────────────────────────────
  1. Pour DÉTECTER une mission, dispatch sur `run.run_type` (lu depuis
     ai_intelligence_runs, donc contrôlé par TON code de L1, jamais par n8n) — JAMAIS sur
     `payload.resultType` (un champ que n8n envoie, donc en dehors de ta confiance). Ajoute
     `run_type` à la liste de colonnes du SELECT initial du run (actuellement il ne
     sélectionne que company_id/workspace_id/owner_id/trigger_source/status).
  2. Pour un run de mission, `resultType` ET `phase` sont IMPOSÉS par ton code
     ("mission_report" et 1), jamais lus depuis le payload — même si mission-001-run les
     envoie déjà correctement. C'est la garantie M-7 : aucune mission ne doit pouvoir
     produire un resultType différent, quelle que soit l'intention rédigée en texte libre
     dans son prompt, et quel que soit ce qu'un futur bug ou un futur workflow enverrait.
  3. Toute citation (`ref` dans findings[].evidence, recommendations[].evidence, ou
     sourceRefs[]) qui ne correspond à AUCUNE entrée `kept: true` de la trace du corpus
     REJETTE LE RAPPORT ENTIER. Ne prune jamais silencieusement une citation invalide — un
     rapport qui prétend s'appuyer sur une source absente du corpus a le même défaut de
     confiance qu'un rapport qui invente un chiffre. Le run bascule en `failed`, avec le
     détail des refs fautives dans le message d'erreur.
  4. `title` et `provenance` de chaque citation sont RECONSTRUITS depuis la trace, jamais
     recopiés depuis ce que le LLM a écrit dans son JSON. Seul le triplet `ref.kind` /
     `ref.table` / `ref.id` sert de clé de correspondance.
  5. Aucune heuristique de récupération sur une sortie LLM malformée (pas de retrait de
     balises ```json``` par regex, pas de réparation créative). `JSON.parse` strict ; en
     cas d'échec, le run passe `failed` avec un message clair. C'est voulu par M-2 : une
     sortie invalide n'est plus rejouée automatiquement par n8n, l'utilisateur relance.
     Contourner cette règle par une réparation silencieuse validerait des sorties que le
     contrat rejette explicitement.

──────────────────────────────────────────────────────────────────────
MÉTHODE
──────────────────────────────────────────────────────────────────────
1. Écris et teste les deux fonctions pures (validate-mission-report.ts,
   render-mission-report-text.ts) AVANT de toucher au callback. Elles n'ont besoin d'aucun
   client Supabase, d'aucun mock — juste des objets en dur dans les tests.
2. Applique la migration via le MCP supabase (apply_migration, JAMAIS écrite à la main) :
   ALTER TYPE intelligence_document_type ADD VALUE 'mission_report';
   Note le VRAI timestamp assigné, crée le fichier local dans supabase/migrations/ ALIGNÉ
   sur ce timestamp exact (le fichier local dérive du remote dès sa création — piège
   rencontré 3 fois sur ce projet), puis npm run db:types.
3. Lance npm run typecheck. Le compilateur désigne les fichiers cassés — mais lis §8.9
   avant de les patcher : un des quatre ne sera pas désigné aussi proprement que les
   autres, et son oubli est un bug SILENCIEUX (aucune erreur de compilation), pas une
   erreur qui t'arrêterait.
4. Étends route.ts en INSÉRANT un nouveau bloc, jamais en modifiant l'existant (§8.6).
5. Étends route.test.ts. Fais tourner la suite AVANT de considérer le lot fini : si un
   SEUL test préexistant change de comportement, tu as cassé un chemin en production.
6. Passe l'agent feature-dev:code-reviewer APRÈS le refactor de route.ts, spécifiquement
   pour vérifier la non-régression des 4 chemins existants (recommandé par le §4 de ce
   handoff pour ce lot précis).
7. Boucle de validation complète, dans cet ordre :
   npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
   test:n8n N'EST PAS nécessaire ici (aucun fichier de n8n/workflows/ n'est touché).
   Si le build échoue sur ENOTEMPTY ou de faux TS6200/TS2300 : rm -rf .next, puis relance.
8. Rapporte les compteurs réels — tests passés avant/après, diff exact de route.ts (nombre
   de lignes ajoutées vs modifiées/supprimées dans les 4 blocs existants), résultat de
   get_advisors (sécurité) si tu as touché une policy ou une fonction SQL (tu ne devrais
   pas en avoir besoin sur ce lot — la seule migration est un ALTER TYPE).

Critère de sortie du lot : une sortie LLM valide, rejouée dans un test contre le callback,
produit un ai_intelligence_results avec resultType/phase imposés et un intelligence_documents
de type mission_report retrouvable dans /reports ; une sortie invalide (JSON cassé, catégorie
hors énumération, citation absente de la trace) fait échouer le run proprement, sans écrire
aucun document et sans le laisser en `running` ; et route.test.ts passe intégralement, ses
tests préexistants inclus, sans qu'aucun n'ait été modifié.
```

---

### 8.1 Pourquoi ce lot est différent des trois précédents

L0 et L1 ont ajouté du code neuf, dans un dossier neuf, qui n'était appelé par rien encore.
L2 a ajouté un workflow neuf, sur un webhook neuf, que rien n'appelle encore (l'import VPS
reste à faire). **L3 modifie un fichier qui tourne aujourd'hui pour 12 workflows n8n en
production.** `src/app/api/n8n/callback/route.ts` est le point d'arrivée unique de tout run
IA de Kredo, mission ou pas. Une régression ici ne casse pas seulement les missions : elle
peut casser `intel-020-communication`, `intel-030-account-knowledge`, ou n'importe quel autre
flux qui poste vers ce même endpoint.

C'est pour cette raison précise que le §4 de ce handoff assigne Opus 5 et `think hard` à ce
lot, et recommande un agent `feature-dev:code-reviewer` en sortie — relis ce paragraphe avant
de commencer si tu ne l'as pas encore fait.

---

### 8.2 Les 4 chemins existants — à ne JAMAIS toucher, seulement comprendre

`route.ts` fait, dans l'ordre, pour CHAQUE callback reçu (mission ou non) :

1. Vérifie le HMAC (rejette avant toute lecture si invalide).
2. Parse le JSON, vérifie les champs obligatoires (`runId`, `phase`, `resultType`, `status`,
   `contentJson`).
3. Relit le run (`company_id`, `workspace_id`, `owner_id`, `trigger_source`, `status`).
4. Si le run est `cancelled`, ignore silencieusement (`{ ok: true, ignored: true }`).
5. **Chemin 1 — `account_knowledge`** (L90-112) : si `resultType ===
   ACCOUNT_KNOWLEDGE_RESULT_TYPE` et `status === "succeeded"`, valide l'artefact via
   `ingestAccountKnowledgeArtifact` AVANT toute sauvegarde ; rejeté → run `failed`,
   réponse 400, **`saveResult` n'est jamais appelé**.
6. Sauvegarde le résultat (`saveResult`, upsert `run_id,phase`), met à jour le statut du
   run, capture `n8nExecutionId`/`n8nWorkflowId` s'ils sont présents.
7. **Chemin 2 — `account_issues_map`** (L153-167) : si `resultType ===
   ACCOUNT_ISSUES_MAP_RESULT_TYPE` et succès, matérialise N lignes `account_issues` via
   `materializeAccountIssues`. Exige `company_id`.
8. **Chemin 3 — document générique** (L169-175) : si `isEligibleDocumentResultType(resultType)`
   et succès, crée un `intelligence_documents` via `saveResultAsDocumentWithSupabaseClient`.
   C'est CE chemin, déjà générique, qui créera le document de mission — voir §8.8, tu n'as
   pas besoin d'un chemin dédié pour ça.
9. **Chemin 4 — `account_watch_refresh`** (L187-189) : cas particulier de revalidation
   Next.js (`revalidatePath("/veille")`), pas un chemin d'écriture métier.
10. Répond `{ ok: true, runId, phase }`.

Ton nouveau bloc mission s'insère **entre l'étape 4 et l'étape 6**, au même niveau que le
chemin 1 (`account_knowledge`) — parce que comme lui, il doit pouvoir refuser l'artefact et
empêcher `saveResult` d'être appelé sur un contenu invalide. Regarde comment le chemin 1
réécrit `persistedPayload` (L89, L111) plutôt que `payload` directement, puis passe
`persistedPayload` à `saveResult` (L117-123) : ton bloc fait exactement la même chose.

---

### 8.2bis Ce que `mission-001-run` envoie réellement (rappel du contrat L2, figé)

```jsonc
{
  "runId": "...", "phase": 1, "resultType": "mission_report", "status": "succeeded",
  "contentJson": {
    "schemaVersion": 1,
    "missionSlug": "veille-analyse-mensuelle",
    "rawOutput": "<TEXTE BRUT — censé être un JSON MissionReportV1, jamais parsé par n8n>"
  },
  "contentText": "<le même texte brut>",
  "title": "Mission — veille-analyse-mensuelle",
  "modelProvider": "anthropic", "modelUsed": "claude-sonnet-5",
  "tokensInput": 1450, "tokensOutput": 820,
  "n8nExecutionId": "...", "n8nWorkflowId": "..."
}
```

`contentJson.rawOutput` est une CHAÎNE, pas un objet — c'est le texte que le LLM a produit,
censé être un JSON valide (le `systemPrompt` assemblé par L1 le lui impose), mais jamais
vérifié avant d'arriver ici. **C'est ce champ que tu vas `JSON.parse` puis valider.**

---

### 8.3 Ce qui est DÉJÀ écrit et figé — ne redéfinis rien de cela

Dans `src/features/intelligence-missions/domain/mission-contracts.ts` (lots L0/L1) :

```ts
export type SourceRef = { ref: CorpusItem["ref"]; title: string; provenance: string }

export type Finding = {
  category: "tendance" | "signal_faible" | "reglementaire" | "opportunite" | "risque" | "autre"
  statement: string
  evidence: SourceRef[]
}

export type Recommendation = {
  action: string
  rationale: string
  horizon?: "immediate" | "30_days" | "quarter"
  evidence: SourceRef[]
}

export type MissionReportV1 = {
  schemaVersion: 1
  title: string
  executiveSummary: string
  findings: Finding[]
  recommendations: Recommendation[]
  sourceRefs: SourceRef[]
}

export type ResolvedCorpus = {
  items: CorpusItem[]
  stats: { requested: number; kept: number; dropped: number; totalChars: number }
  trace: Array<{
    ref: CorpusItem["ref"]
    title: string
    provenance: string
    kept: boolean
    reason?: "budget_total" | "budget_items" | "truncated" | "archived" | "not_found" | "provider_limit"
  }>
}
```

`ai_intelligence_runs.input_snapshot` (colonne `jsonb`) contient, pour un run de mission, le
`trace` ci-dessus au complet (posé par L1 via `buildMissionInputSnapshot`) — c'est ta SEULE
source de vérité pour valider une citation. Le format exact persisté :

```jsonc
{ "schemaVersion": 1, "missionSlug": "...", "missionVersion": 1, "requestedAt": "...",
  "selectors": [...], "budget": {...}, "stats": {...}, "trace": [ /* le tableau ci-dessus */ ] }
```

---

### 8.4 `validate-mission-report.ts` — le validateur (pur, testé isolément)

Emplacement : `src/features/intelligence-missions/domain/validate-mission-report.ts`.
Aucune I/O, aucun import de client Supabase — c'est ce qui le rend testable sans mock.

**Contrat attendu** (l'implémentation exacte t'appartient, mais respecte ces entrées/sorties) :

```ts
import type { ValidationIssue, ValidationResult } from "@/lib/intelligence/intelligence-validators"
import type { MissionReportV1, ResolvedCorpus } from "./mission-contracts"

export function validateMissionReport(
  rawOutput: string,                    // contentJson.rawOutput, TEL QUEL, non parsé
  trace: ResolvedCorpus["trace"] | unknown,  // run.input_snapshot?.trace — peut être malformé/absent
): ValidationResult<MissionReportV1>
```

Réutilise `ValidationIssue` (`{ path: string; message: string }`) et `ValidationResult<T>`
(`{ valid: true; value: T; issues: [] } | { valid: false; value: null; issues:
ValidationIssue[] }`) depuis `src/lib/intelligence/intelligence-validators.ts` — ne réinvente
pas ces deux types.

Ce que la fonction DOIT vérifier, dans l'ordre :

1. **Parse JSON strict.** `JSON.parse(rawOutput)` dans un `try/catch` — un échec produit
   `{ valid: false, issues: [{ path: "$", message: "Sortie LLM non-JSON : <détail>" }] }`.
   Aucune tentative de réparation (pas de retrait de balises Markdown, pas de troncature
   au dernier `}` valide).
2. **`schemaVersion === 1`** exactement.
3. **`title`, `executiveSummary`** : chaînes non vides.
4. **`findings`** : tableau non vide ; chaque élément a un `category` PARMI les 6 valeurs
   exactes de l'union (rejette toute valeur hors énumération, y compris une variante mal
   orthographiée), un `statement` non vide, un `evidence` tableau (peut être vide — un
   constat peut légitimement n'avoir aucune preuve directe, mais ce n'est pas souhaitable ;
   à toi de juger si tu veux l'accepter avec un `issue` de sévérité faible ou le refuser —
   documente ton choix dans le commentaire du code).
5. **`recommendations`** : tableau (peut être vide) ; chaque élément a `action`,
   `rationale` non vides, et si `horizon` est présent, il vaut exactement l'une des 3
   valeurs de l'union.
6. **Chaque `evidence[]` de chaque finding/recommendation, ET chaque entrée de
   `sourceRefs[]` : le triplet `ref.kind`/`ref.table`/`ref.id` doit correspondre à une
   entrée de `trace` avec `kept === true`.** Construis une `Map` des entrées `kept` de la
   trace, clé = `` `${ref.kind}:${ref.table}:${ref.id}` ``, une fois, avant de parcourir le
   rapport. Toute citation absente de cette map produit un `issue` et invalide TOUT le
   rapport (pas seulement cette citation).
7. **Reconstruis `title` et `provenance`** de chaque `SourceRef` retenu à partir de
   l'entrée de la trace correspondante — jamais depuis ce que le LLM a écrit. La valeur
   finale de `MissionReportV1.findings[].evidence[].title` (etc.) après validation doit
   provenir de `trace`, pas de l'entrée brute du JSON du LLM.
8. Si `trace` n'est pas un tableau exploitable (absent, malformé), traite-le comme une
   trace vide — **toute** citation échoue alors la validation avec un message explicite
   (`"Trace de corpus indisponible pour ce run"`), sans lever d'exception.

**Tests à écrire** (dans `src/features/intelligence-missions/__tests__/`) — cas limites
obligatoires : JSON invalide, `schemaVersion` absent/faux, catégorie hors énumération,
`findings` vide, citation dont le `ref` n'existe pas dans la trace, citation dont le `ref`
existe mais `kept: false` (élément écarté par le budget — doit être refusé, pas juste les
refs totalement absentes), rapport valide avec plusieurs sources → `title`/`provenance`
bien reconstruits depuis la trace et non depuis le JSON du LLM, trace absente/malformée.

---

### 8.5 `render-mission-report-text.ts` — le rendu texte (pur, testé isolément)

Emplacement : `src/features/intelligence-missions/domain/render-mission-report-text.ts`.

```ts
export function renderMissionReportText(report: MissionReportV1): string
```

**Pourquoi ce fichier existe** : `buildResultContentText` (dans
`communication-result-documents.ts`) est un dispatcher par forme — il reconnaît
`CommunicationOutput`, `SpokenPitchOutput`, `MeetingBriefingOutput`, etc., et **tombe en
repli sur `fallbackText`** (le paramètre `content_text` brut) pour toute forme qu'il ne
reconnaît pas. `MissionReportV1` n'a AUCUNE des formes reconnues, et il serait hors
périmètre du lot d'apprendre à `buildResultContentText` une nouvelle forme (ce serait
recréer, côté Next.js, un couplage aux détails d'un type spécifique à une seule capacité —
contraire à P7). **Donc, si tu ne fais rien, le `content_text` d'un document de mission
sera le texte JSON brut renvoyé par le LLM — illisible.** Ce fichier produit le texte
lisible que tu écriras toi-même dans `persistedPayload.contentText` avant `saveResult`.

Doit produire, à minima : le titre en tête, `executiveSummary`, une section listant tous
les `findings` (regroupés ou non par catégorie, à ta discrétion — rien ne doit être omis),
une section listant toutes les `recommendations` (avec l'horizon si présent). Inspire-toi
du nœud `Prepare Callback` d'`intel-021` pour le STYLE (lignes Markdown simples), pas pour
le contenu — les champs sont différents.

**Test à écrire** : sur un `MissionReportV1` avec plusieurs findings de catégories
différentes et plusieurs recommendations (dont une sans `horizon`), vérifie qu'AUCUN champ
n'est silencieusement absent du texte produit.

---

### 8.6 Le nouveau bloc dans `route.ts` — insertion, jamais modification

Ajoute `run_type` et `input_snapshot` à la liste de colonnes du SELECT initial (L67-71 dans
la version livrée en L2) :

```ts
.select("company_id, workspace_id, owner_id, trigger_source, status, run_type, input_snapshot")
```

Puis, **entre le bloc `4a. Vérification du statut d'annulation` et le bloc `4 bis.
account_knowledge`** (ou juste après ce dernier — l'ordre entre les deux blocs de
validation n'a pas d'importance, ils sont mutuellement exclusifs par construction),
insère un bloc au même niveau, commenté `4 ter. Portail mission d'intelligence (ADR-0020
lot L3)` :

```ts
if (status === "succeeded" && isMissionRunType(run.run_type)) {
  let rawOutput: unknown
  try {
    rawOutput = JSON.parse(rawBody) // ou relis contentJson.rawOutput selon comment tu structures le parse
  } catch { /* … */ }

  const validation = validateMissionReport(/* contentJson.rawOutput */, run.input_snapshot)

  if (!validation.valid) {
    const detail = validation.issues.map((i) => `${i.path}: ${i.message}`).join(" | ")
    // même patron que le rejet account_knowledge (L100-108) : basculer le run en `failed`
    // AVANT de répondre, jamais le laisser en `running`.
    await updateRunStatus(runId, "failed", { phase, errorMessage: `Mission invalide — ${detail}`.slice(0, 2000) })
    return NextResponse.json({ error: "Rapport de mission invalide", issues: validation.issues }, { status: 400 })
  }

  persistedPayload = {
    ...payload,
    resultType: "mission_report",             // IMPOSÉ — jamais celui du payload (M-7)
    phase: 1,                                  // IMPOSÉ — jamais celui du payload (M-4)
    contentJson: validation.value as unknown as N8nCallbackPayload["contentJson"],
    contentText: renderMissionReportText(validation.value),
    title: validation.value.title,
  }
}
```

(Le fragment ci-dessus illustre la FORME attendue — l'accès exact à `contentJson.rawOutput`
et à `run.input_snapshot` typé dépend de comment tu structures les imports ; ne le recopie
pas caractère pour caractère sans vérifier qu'il compile contre les types réels.)

Importe `isMissionRunType` depuis
`src/features/intelligence-missions/domain/mission-run-type.ts` (déjà écrit, L0).

**Ce bloc doit être la SEULE nouvelle branche conditionnelle du fichier.** Le reste du
pipeline (`saveResult`, `updateRunStatus`, capture des ids n8n, chemin document générique,
`account_issues_map`, `account_watch_refresh`, revalidation) s'applique ENSUITE, sans
modification, à `persistedPayload` — exactement comme il le fait déjà pour
`account_knowledge`.

---

### 8.7 Étendre `route.test.ts` — non-régression prouvée, pas supposée

Le fichier existant structure ses tests par `describe`. Ajoute un nouveau bloc
`describe("POST /api/n8n/callback — mission d'intelligence", …)`, sur le modèle du bloc
`describe("POST /api/n8n/callback — account_knowledge V3", …)` déjà présent (même
`fakeSupabase`, même style d'assertions sur `mock.calls`).

Cas à couvrir, au minimum :
- un rapport valide → `saveResult` appelé avec `resultType: "mission_report"`, `phase: 1`,
  `contentJson` = l'objet structuré (pas le wrapper `{rawOutput}`), `contentText` non vide
  et différent du JSON brut ; un document est créé (chemin 3, déjà existant, doit se
  déclencher SANS modification de son code) ;
- un `rawOutput` non-JSON → run `failed`, `saveResult` **jamais appelé** ;
- une citation dont le `ref` n'existe pas dans la trace → run `failed`, `saveResult`
  jamais appelé, message d'erreur mentionne la référence fautive ;
- un `resultType` de payload différent de `"mission_report"` envoyé par erreur sur un run
  dont `run_type` commence par `mission:` → le chemin mission se déclenche quand même
  (preuve que le dispatch se fait sur `run.run_type`, pas sur `payload.resultType`) ;
- **tous les tests déjà présents dans le fichier passent, INCHANGÉS.** N'ajoute ce test
  qu'à la fin de ton travail, comme dernière vérification, pas comme première étape.

---

### 8.8 `communication-result-documents.ts` — deux ajouts, aucune restructuration

```ts
// dans RESULT_DOCUMENT_TYPE_BY_RESULT_TYPE :
mission_report: "mission_report",

// dans FALLBACK_TITLE_BY_DOCUMENT_TYPE :
mission_report: "Rapport de mission",
```

C'est la première ligne (`RESULT_DOCUMENT_TYPE_BY_RESULT_TYPE`) qui fait que le chemin 3
existant (`isEligibleDocumentResultType`, L169-175 de `route.ts`) reconnaît
`"mission_report"` et crée le document automatiquement — **tu n'as PAS besoin d'appeler
`saveResultAsDocumentWithSupabaseClient` toi-même dans ton nouveau bloc.** Laisse le
pipeline existant s'en charger.

---

### 8.9 Les trois fichiers UI — patch minimal, aucune fonctionnalité

🔴 Relis la précision ajoutée au §4 de ce handoff (bloc "Piège certain") avant de faire ce
paragraphe : un des quatre points ci-dessous n'est PAS désigné proprement par `tsc`.

1. **`document-display.tsx`** — ajoute `"mission_report"` :
   - au type `ReportDocumentType` (union manuscrite, ligne ~4) ;
   - au `Set REPORT_DOCUMENT_TYPES` (ligne ~35) ;
   - à `DOCUMENT_OBJECT_LABELS` (`Record<DocumentType, string>`, désigné par `tsc`) ;
   - à `DOCUMENT_TYPE_LABELS` (`Record<CommunicationDocumentType | ReportDocumentType,
     string>`, ligne ~81 — valeur suggérée : `"rapport"`, cohérent avec les autres types
     de rapport de cette table).
2. **`DocumentCard.tsx`** — `DOCUMENT_TYPE_LABELS: Record<DocumentListItem["documentType"],
   string>` (désigné par `tsc`) : ajoute `mission_report: "Rapport de mission"`.
3. **`DocumentMobileDetail.tsx`** — même chose sur `Record<DocumentDetail["documentType"],
   string>` (désigné par `tsc`).

**N'ajoute rien de plus.** Pas de rendu conditionnel des `findings`/`recommendations`, pas
de badge, pas d'icône dédiée. Un document de mission doit s'afficher dans `/reports` avec
un libellé "Rapport de mission" et son `contentText` lisible (rendu par §8.5) — exactement
comme n'importe quel autre type de rapport s'affiche aujourd'hui, sans traitement spécial.
Toute présentation dédiée est L4, suspendu.

---

### 8.10 La migration

```sql
ALTER TYPE intelligence_document_type ADD VALUE 'mission_report';
```

Applique-la via le MCP `supabase` (`apply_migration`), jamais en écrivant le fichier de
migration à la main en premier. Le nom du fichier local doit être aligné EXACTEMENT sur le
timestamp que l'outil assigne réellement — piège déjà rencontré 3 fois sur ce projet.
Ensuite `npm run db:types`, puis `npm run typecheck` pour laisser le compilateur désigner
les 3 des 4 fichiers qu'il sait détecter (§8.9 couvre aussi le quatrième, qu'il ne détecte
pas aussi proprement).

---

### 8.11 Ce que tu peux prouver, et ce que tu ne peux pas

| Vérifiable par toi, hors ligne, en Vitest | Reste à observer en usage réel |
|---|---|
| Le validateur rejette/accepte exactement les cas listés en §8.4 | Qu'un vrai run de mission, déclenché depuis l'UI existante (`intelligence-registry.ts`, hors périmètre), aboutisse jusqu'ici — dépend de l'import VPS de L2 |
| Les 4 chemins existants passent tous leurs tests préexistants, inchangés | Le comportement sous charge réelle, avec de vrais payloads n8n |
| Un document de mission apparaît dans le modèle de données avec le bon `document_type` | Son rendu visuel exact dans `/reports` (pas de QA visuelle demandée pour ce lot) |

Ne déclare jamais "le callback gère les missions correctement en production" — dis "le
callback route et valide les missions selon le contrat, prouvé par des tests qui simulent
n8n ; son comportement avec un vrai run reste à observer une fois L2 importé sur le VPS."

---

### 8.12 Checklist de sortie du lot

- [ ] `validate-mission-report.ts` + tests, tous les cas limites du §8.4 couverts
- [ ] `render-mission-report-text.ts` + tests, aucun champ omis
- [ ] Migration appliquée via MCP, fichier local aligné sur le vrai timestamp, `db:types` rejoué
- [ ] `route.ts` : diff = additions uniquement (colonnes du SELECT + nouveau bloc), les 4
      chemins existants n'ont pas une seule ligne modifiée
- [ ] Dispatch sur `run.run_type`, jamais sur `payload.resultType`
- [ ] `resultType`/`phase` imposés par le code, jamais lus depuis le payload sur le chemin mission
- [ ] Citation absente de la trace (ou `kept: false`) → rapport entier rejeté, pas prunée
- [ ] `title`/`provenance` des citations reconstruits depuis la trace, jamais depuis le LLM
- [ ] Aucune heuristique de réparation JSON — `JSON.parse` strict, échec → run `failed`
- [ ] `route.test.ts` : nouveaux cas ajoutés, TOUS les cas préexistants passent inchangés
- [ ] `communication-result-documents.ts` : 2 entrées ajoutées, aucune restructuration
- [ ] Les 3 fichiers UI compilent, `mission_report` a un libellé générique correct — et
      spécifiquement `REPORT_DOCUMENT_TYPES` de `document-display.tsx` (le point que `tsc`
      ne désigne pas proprement)
- [ ] Aucune fonctionnalité UI spécifique aux missions (findings/recommendations rendus)
- [ ] Agent `feature-dev:code-reviewer` passé sur `route.ts`, verdict rapporté
- [ ] Boucle de validation complète (`test:n8n` exclu), compteurs réels rapportés
- [ ] Le rapport final dit explicitement ce qui reste à observer en usage réel (§8.11)

---

## 9. Journal du chantier

| Date | Événement |
|---|---|
| 2026-08-18 | **Correctif d'aiguillage post-L3** (Claude Code) — la revue de sortie du lot L3 avait trouvé que `resultType`/`phase` n'étaient imposés que dans `persistedPayload`, pas dans les `const` lues par les blocs 5 à 9 (`account_issues_map`, chemin document, revalidation, `updateRunStatus`). Deux scénarios latents : un payload `resultType="account_knowledge"` sur un run de mission se faisait rejeter par le bloc 4 bis avant même d'atteindre le validateur mission ; un payload `resultType="account_issues_map"` laissait le rapport validé et persisté correctement, PUIS faisait échouer `materializeAccountIssues` sur la forme mission et répondre 500 à n8n après un succès complet. **Correctif** : `resultType`/`phase` en `let`, réassignés au même moment que `persistedPayload` dans le bloc mission ; le bloc `account_knowledge` exclut symétriquement `isMissionRunType(run.run_type)`. Diff `route.ts` : +93/−3 (3 lignes réécrites pour introduire les `let` et l'exclusion, comportement inchangé pour tout run non-mission). Deux scénarios de test ajoutés/renforcés, **13 tests au fichier, les 6 `account_knowledge V3` préexistants inchangés au caractère près**. Vérifié par mutation : retirer l'exclusion → le scénario `account_knowledge`-sur-mission repasse rouge ; retirer la réassignation → le test de dispatch repasse rouge. Boucle complète : typecheck ✅ · **1521 tests, 0 échec** (1520 avant, +1 net) · server-boundary ✅ · lint ✅ · build ✅ 64/64 pages. |
| 2026-08-18 | **L3 livré** (Claude Code, Opus 5) — le callback route et valide les missions. Deux fonctions PURES (`validate-mission-report.ts`, `render-mission-report-text.ts`, 29 tests), un bloc `4 ter` INSÉRÉ dans `route.ts` (**diff : 61 additions, 1 ligne modifiée — la liste de colonnes du SELECT, la seule autorisée par le §8.6** ; aucune ligne touchée dans les 4 chemins existants), 6 cas ajoutés à `route.test.ts` (les 6 préexistants inchangés et verts), 2 entrées dans `communication-result-documents.ts`, 8 sites patchés dans les 3 fichiers UI, migration `20260818140533_086_mission_report_document_type`. **Preuve par mutation, pas seulement par assertion** : dispatcher sur `payload.resultType` → 1 test rouge ; retirer l'imposition `resultType`/`phase` → 1 test rouge ; recopier le `title` d'une citation depuis le JSON du modèle → 2 tests rouges ; élaguer une citation absente de la trace au lieu de rejeter le rapport → 5 tests rouges ; accepter une entrée `kept: false` → 1 test rouge. Boucle complète : typecheck ✅ · **1520 tests / 150 fichiers, 0 échec** (1485 avant, **+35**) · server-boundary ✅ · lint ✅ 0 problème sur les 10 fichiers du lot · build ✅ exit 0, 64/64 pages (après `rm -rf .next`). **Deux choix assumés, documentés dans le code** : `evidence: []` est accepté sur un constat (un rapport de mission est lu par un humain et n'écrit rien dans le CRM — l'invariant est « aucune citation invérifiable », pas « aucun énoncé non cité »), et `horizon: null` vaut absence (idiome JSON, aucune interprétation, rien d'invalide persisté). **Résidu identifié par la revue `feature-dev:code-reviewer`, corrigé en Session 48 le jour même** : voir l'entrée suivante. |
| 2026-08-18 | **L2 livré** (Gemini) — `mission-001-run.json` (11 nœuds), `.SETUP.md`, harnais de test. Aucun fichier de `src/` touché. Modèle jamais en dur (`$json.model.model`/`maxOutputTokens`), `resultType: 'mission_report'` littéral, `phase: 1`, aucun `JSON.parse` de la sortie LLM, secret HMAC unique. **Revérifié indépendamment par Claude Code, pas seulement relu sur rapport** : câblage des 4 branches d'erreur (`onError: continueErrorOutput` → `main[1]` → callback d'échec) rejoué depuis le JSON brut, les 3 `jsCode` re-syntax-checkés, le harnais relu pour écarter le piège des « assertions muettes » (le `main().catch()` distingue une erreur fatale du résumé final), `npm run test:n8n` rejoué en entier : **`mission-001-run.test.js` → 109 passed, 0 failed**, exit 0. Boucle complète rejouée : typecheck ✅ (après `rm -rf .next`) · 1485 tests ✅ · server-boundary ✅ · lint ✅ (1617 problèmes / 454 erreurs, **identique à la baseline pré-L2**, aucune régression) · build ✅ 64/64 pages. **L'import sur le VPS reste manuel, à faire par Guillaume** — rien de ce qui suit (L3) n'en dépend. |
| 2026-08-18 | Vision fondatrice reçue (`00`), audit mesuré (`01`), critique et périmètre (`02`), architecture v0 (`03`) |
| 2026-08-18 | Revue contradictoire (ChatGPT) : 5 objections, **5 acceptées** — dont une invalidant la rédaction initiale de M-5 |
| 2026-08-18 | **ADR-0020 Accepté**. Périmètre de la garde M-4 mesuré : un seul consommateur sémantique (§5.8) |
| 2026-08-18 | Hors périmètre, découvert en préparant l'ADR : faille `get_manager_summary_facts` **corrigée** (migration `20260818092506`, boucle de validation complète passée) |
| 2026-08-18 | **L0 livré** (ChatGPT) — contrats, catalogue, `run_type`, garde M-4 partielle (`20260818101855`) |
| 2026-08-18 | **L1 livré** (Claude Code) — 3 providers **tous en `user_rls`** (le service-role s'est révélé inutile, cf. écart #1), budget déterministe pur, résolveur à allowlist stricte, assembleur de prompt pur, branche `missionSlug` dans la gateway existante. Boucle complète : typecheck ✅ · **1485 tests, 0 échec** (+84) · server-boundary ✅ · lint ✅ sur les fichiers du lot · build ✅. **La garde de workspace est vérifiée par mutation** : retirer le `.eq("workspace_id", …)` du verrou d'entrée d'`account-context-provider.ts` fait échouer 3 tests sur 6 d'`account-context-provider.test.ts`. `get_advisors` (sécurité) : 16 avertissements, **tous préexistants et étrangers au lot** — L1 ne crée ni RPC, ni policy, ni migration |
| 2026-08-18 | **L0 audité et corrigé** (Claude Code) — boucle de validation rejouée localement (typecheck ✅ · 1401 tests ✅ · server-boundary ✅ · build ✅ après `rm -rf .next` · lint : 0 problème sur les fichiers du lot). Deux correctifs : garde M-4 complétée sur la latérale `runs` (migration `20260818110944`, empreinte des 112 lignes inchangée) et `MissionSpec.corpus.requiredAtLaunch` ajouté — sans lui le preset pilote décrivait une mission sans corpus. `Recommendation.horizon` ajouté pour la fidélité au pilote L5 |

# STATE.md — Handoff de contexte (ADR-0012, chantier cockpit intelligence)

> Généré le 2026-07-07 en fin de session, à l'approche de la limite de fenêtre de
> contexte. Objectif : permettre à une nouvelle session de reprendre exactement
> là où celle-ci s'arrête, sans re-belayer le travail déjà fait ni re-découvrir
> les pièges déjà rencontrés. **Ce fichier est un handoff temporaire** — à
> supprimer une fois son contenu absorbé par CLAUDE.md/mémoire, il ne fait pas
> partie de la doc permanente du projet.

---

## 1. Contexte projet — lecture obligatoire avant tout

**Source de vérité permanente : `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/CLAUDE.md`**
Ce fichier contient l'intégralité de l'état du codebase (stack, schéma DB complet,
conventions, historique de 22 sessions). Le présent STATE.md ne le duplique pas
en entier — il pointe vers les sections pertinentes et ajoute le contexte
**volatile** (ce qui est en cours, non commité, ou pas encore documenté dans
CLAUDE.md au moment de la génération de ce fichier).

**Mémoire persistante (hors du repo) :**
`/Users/dosta/.claude/projects/-Users-dosta-Desktop-Projets-Dev-KREDO-kredo/memory/`
— `MEMORY.md` est l'index. Le fichier `adr-0012-cockpit-decision-chain.md` contient
le résumé complet de l'état de CE chantier (Lots 0-4). `folio-data-reality.md`
contient les découvertes terrain critiques sur les données FOLIO. Lire ces deux
fichiers en priorité.

### Stack technique (résumé — détail complet dans CLAUDE.md §Stack)
- **Front** : Next.js 16.2.7 (App Router), React 19, Server Components, déployé sur Vercel (`kredo-green.vercel.app`)
- **Styling** : Tailwind CSS v4 (`@theme` dans `globals.css`, **PAS** de `tailwind.config.*`)
- **UI** : composants maison sur `<dialog>` natif (`AppDrawer`, `AppDialog`, `SurfaceCard`...) — **PAS de shadcn/Radix**
- **DB** : Supabase Postgres, RLS actif sur ~100% des tables, projet `jvzgmhvwirsbdkjpmvla`
- **Async/IA** : n8n self-hosted sur VPS, déclenché via `/api/n8n/trigger` → webhook HMAC → callback `/api/n8n/callback`
- **Interdits fermes** : pas de recharts/chart.js/Tremor, pas de `tailwind.config.*`, pas de graceful degradation CSS mobile

### Architecture multi-tenant
Modèle workspace unique actuellement (`workspace_id = '98dcd39d-f87b-4f9d-add9-ce76d635953a'`).
Fonctions clés vivent dans le schéma **`private`** (pas `public`, malgré ce que dit
une section obsolète de CLAUDE.md) : `private.current_workspace_id()`,
`private.is_workspace_admin()`, `private.set_updated_at()`, `private.log_audit()`.

---

## 2. Le chantier en cours : ADR-0012 — refonte du cockpit intelligence

**Document directeur** : `docs/adr/ADR-0012-cockpit-intelligence-chaine-decision.md`
(statut Proposé, décisions D-1 à D-8 validées par Guillaume). **Lire ce document
en entier avant de continuer** — il contient la définition fonctionnelle complète
des 5 étapes, l'architecture data, l'architecture n8n, et le plan en 8 lots.

### Le concept en une phrase
Le cockpit intelligence (`/prospection/accounts/[companyId]`) passe d'un espace
documentaire (études FOLIO affichées telles quelles) à une **chaîne de décision
commerciale en 5 étapes** : Connaissance compte → Intelligence sectorielle →
Cartographie des enjeux → Stratégie commerciale → Roadmap commerciale. Scoring,
veille, rédaction assistée, synthèse compte et campagne deviennent des
**capacités transverses** (pas des étapes de la chaîne).

### État des 8 lots

| Lot | Statut | Contenu |
|---|---|---|
| **0** | ✅ Livré | Renommage taxonomie (5 étapes), purge runs zombies, fonction `ops-004` |
| **1** | ✅ Livré | Schéma spine (`account_issues`, `account_roadmap_actions`, enum `intelligence_provenance`), contrats TS, **fix bug live** (matching par `phase` → `result_type`) |
| **2** | ✅ Livré | Connaissance compte : RPC, blocs relationnels, curation, workflow `intel-030-account-knowledge` |
| **3** | ✅ Livré | Intelligence sectorielle : backfill `sector_id` (14→27/95), snapshot déterministe, `SectorSnapshotContent.tsx` |
| **4** | ✅ Livré | Cartographie des enjeux : RPC, matérialisation, workflow `intel-031-issues-map`, table/liste UI |
| **5** | ⏳ **PROCHAIN** | Stratégie commerciale — mapper enjeux↔offres, playbook, bibliothèque de pitchs |
| 6 | À venir | Roadmap commerciale (draft, table déjà créée Lot 1) |
| 7 | À venir | Matérialisation (tasks/calendar_events) + campagne — **gated, jamais automatique** |

**Détail complet de chaque lot livré** : voir CLAUDE.md, sections "Session 22 (suite) —
ADR-0012 Lot N" (5 sections, une par lot 0-4) — chacune documente précisément
les fichiers créés/modifiés, les décisions prises, et les validations effectuées.

---

## 3. Décisions actées de l'ADR (à connaître avant de continuer)

- **D-1** : process en 5 étapes, scoring/veille/rédaction/synthèse/campagne transverses.
- **D-2** : diagnostic process = enrichissement premium à la demande, jamais un prérequis (n'existe réellement que pour 4 comptes sur 95).
- **D-3** : provenance explicite à 5 valeurs — `relational` / `human_verified` / `engine_researched` / `folio_legacy` / `inferred`. **Un LLM ne peut émettre que 3 de ces 5 valeurs** (`relational`/`folio_legacy`/`inferred`) — `human_verified` est réservé à la curation manager, `engine_researched` à de futurs workflows de recherche web datée. Cette contrainte est validée durement dans `Parse & Validate Output` de chaque workflow (`intel-030`, `intel-031`).
- **D-4** : curation humaine à CHAQUE étape (confirmer/écarter/épingler), pas seulement à la roadmap finale.
- **D-5** : ligne de partage data — artefacts de génération pure (account_knowledge, sector_snapshot, commercial_strategy) restent en `content_json` (`ai_intelligence_results`). Les **enjeux et actions de roadmap** sont des entités opérationnelles → **tables normalisées** (`account_issues`, `account_roadmap_actions`), mutées ligne à ligne, contrairement aux tables append-only d'ADR-0011 (`account_score_*`).
- **D-6** : économie — l'intelligence sectorielle (étape 2) et le scoring restent **100% déterministes, zéro LLM, zéro workflow n8n**. Refresh incrémental, jamais massif. Tiering Haiku/Sonnet planifié mais **pas encore appliqué** (tous les workflows utilisent Sonnet actuellement).
- **D-7** : un workflow n8n fin par étape LLM (pas d'orchestrateur unique branchu).
- **D-8** : le rattachement `sector_id` (backfill) ne doit JAMAIS être forcé — seuls les clusters de 2+ comptes décrivant explicitement le même marché nommé sont rattachés. Voir mémoire `folio-data-reality.md`.

---

## 4. Pièges et contournements critiques (à ne pas re-découvrir)

### 4.1 Migrations Supabase
- **`apply_migration` avec du SQL contenant `insert into sector_intelligence` échoue** si `workspace_id` n'a pas de valeur explicite : la colonne a `default private.current_workspace_id()`, mais cette fonction retourne NULL hors session utilisateur authentifiée (le contexte `apply_migration` n'en a pas). **Contournement systématique** : injecter le `workspace_id` unique du système explicitement (`'98dcd39d-f87b-4f9d-add9-ce76d635953a'`) dans les migrations DML qui insèrent des lignes hors du contexte d'un compte déjà scopé.
- **Le nom du fichier de migration local doit matcher EXACTEMENT le timestamp réellement appliqué** (`supabase_migrations.schema_migrations.version`), pas le nom qu'on avait initialement prévu. Toujours vérifier via `select version, name from supabase_migrations.schema_migrations where name like '%...%' order by version desc limit 1` après `apply_migration`, puis nommer/renommer le fichier local en conséquence AVANT de l'écrire sur disque.
- **`generate_typescript_types` renvoie un JSON `{"types": "..."}`**, pas du TS brut — et le payload dépasse la limite de tokens de l'outil. Pattern systématique utilisé cette session :
  ```bash
  python3 -c "
  import json
  with open('<fichier .txt sauvegardé par l'outil>') as f:
      data = json.load(f)
  with open('src/types/database.generated.ts', 'w') as out:
      out.write(data['types'])
  "
  ```

### 4.2 Pattern RPC établi (à répliquer pour tout futur lot)
Toutes les RPC d'hydratation de contexte n8n suivent EXACTEMENT ce pattern (voir
`get_pitch_context`, `get_account_summary_facts`, `get_account_knowledge_context`,
`get_account_issues_context`) :
```sql
create or replace function public.get_XXX_context(p_workspace_id uuid, p_company_id uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(...)
$$;
revoke all on function public.get_XXX_context(uuid, uuid) from public;
grant execute on function public.get_XXX_context(uuid, uuid) to service_role;
```
`security invoker` + `grant ... to service_role` (PAS `security definer`) — le
service_role bypasse RLS nativement, pas besoin de `security definer`.
**Exception** : `get_account_score_context` (ADR-0011) grant à `authenticated`
au lieu de `service_role` car appelée par une Server Action en session
utilisateur, pas par n8n — bien identifier lequel des deux cas s'applique.

### 4.3 Pattern workflow n8n établi (15 nœuds)
`Webhook → Verify Signature (crypto/hmac) → Validate Entity (code) → Update Run
Status (httpRequest PATCH) → Hydrate Context (httpRequest POST rpc/get_XXX_context)
→ Assemble Prompt (code) → Call LLM (httpRequest Anthropic) → Parse & Validate
Output (code, throw si invalide) → Quality Check (code, qaFlags non-bloquants)
→ Prepare Callback (code) → Sign Callback (crypto/hmac) → Callback (httpRequest
POST)`. Branche d'erreur parallèle : `Prepare Failure Callback → Sign Failure
Callback → Callback (Failure)`, connectée depuis CHAQUE nœud à risque via
`onError: "continueErrorOutput"`.
**Toujours valider** : `node --check` sur chaque `jsCode`, PUIS un harnais Node
avec mocks réalistes qui exécute réellement chaque nœud de code (pas juste la
syntaxe) — inclure un **cross-check de contrat** entre la sortie `contentJson`
et ce que le parseur TypeScript consommateur attend exactement (a évité au moins
2 divergences silencieuses cette session).

### 4.4 Le champ `phase` est pollué — ne JAMAIS l'utiliser comme clé de matching
`ai_intelligence_results.phase` héberge plusieurs `result_type` différents sous
le même numéro (ex. phase 1 = `client_summary` ET `account_knowledge` ET
`activity_commercial` ET `weekly_manager`). **Toujours matcher par `result_type`**,
jamais par `phase` (conservé uniquement pour compat historique). Un bug réel a
été corrigé au Lot 1 à cause de cette confusion (4 comptes affichaient un
rapport comme fausse "analyse client moteur").

### 4.5 Deux mécanismes de callback distincts et coexistants
`/api/n8n/callback/route.ts` gère deux chemins de matérialisation différents
selon le `resultType`, appliqués l'un après l'autre (pas mutuellement exclusifs) :
- `isEligibleDocumentResult(resultType)` → **1 résultat → 1 document**
  (`intelligence_documents` via `save-as-document.ts`) : `communication`,
  `client_summary`, `commercial_pitch`, `campaign`, `pitch`, `pitch_mail`,
  `activity_commercial`, `activity_recruitment`, `weekly_manager`.
- `resultType === 'account_issues_map'` → **1 résultat → N lignes** dans
  `account_issues` (`materialize-account-issues.ts`). **Nouveau pattern introduit
  au Lot 4** — si le Lot 6 (roadmap) suit le même schéma que les enjeux
  (D-5 : `commercial_roadmap` → matérialisation dans `account_roadmap_actions`),
  il faudra une fonction `materialize-account-roadmap-actions.ts` symétrique,
  câblée de la même façon dans la route de callback.

### 4.6 `ClientIntelligenceContact` est utilisé bien au-delà du cockpit compte
Découvert au Lot 2 : ce type est aussi construit (avec un sous-ensemble minimal
de champs) par le panneau intelligence global, le composeur de communication,
et les rapports. **Toute extension de ce type doit rendre les nouveaux champs
optionnels** (`department?`, `decisionPower?`, etc.), jamais requis — sinon
`tsc` casse dans 4-5 fichiers non liés à la tâche en cours.

### 4.7 Travail en parallèle par Guillaume — vérifier avant de committer
**Découverte en fin de session** : Guillaume a lui-même committé le travail du
Lot 3 (`d89ed554`, "feat(reports): visual redesign of reports library and
intelligence drawers") en le combinant avec sa propre refonte visuelle sur des
fichiers que je ne contrôle pas (`CommunicationBriefForm.tsx`, `ContactSelector.tsx`,
`IntelligenceActionDrawers.tsx`, `OfferPicker.tsx`, `CommunicationComposerHost.tsx`,
`ReportGenerationDrawer.tsx`, `ReportGenerationHost.tsx`, `globals.css`). Il a
aussi modifié `ClientIntelligenceDesktopView.tsx`/`ClientIntelligenceMobileView.tsx`/
`intelligence-process.ts`/`intelligence-data.ts` — des fichiers que je modifie
aussi activement. **Avant de committer au prochain lot, `git log --oneline -10`
et `git status` pour vérifier qu'aucun changement parallèle n'est arrivé entre-temps.**
Un nouveau fichier `src/components/layout/AppOverlayHosts.tsx` et une modif de
`src/app/(app)/layout.tsx` sont apparus sans que je les aie créés — ne pas les
toucher/réverter, ils appartiennent au travail de Guillaume.

---

## 5. État exact du working tree au moment du handoff

**Dernière validation complète** (juste avant génération de ce fichier) :
`tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · `vitest run`
→ **200/200 tests, 30 fichiers**. Tout est cohérent, y compris avec les
changements parallèles de Guillaume mergés dans l'arbre.

**Commit le plus récent** : `d89ed554` (Guillaume, Lot 3 + sa refonte visuelle).
Mon dernier commit : `d0a70cfc` ("ADR-0012 Lots 1-2"). Entre les deux, le Lot 3
et une partie du Lot 4 ont été développés sans commit de ma part — **le Lot 3
a été committé par Guillaume**, le **Lot 4 est actuellement NON COMMITÉ**.

**Fichiers modifiés non commités** (Lot 4) :
```
M  CLAUDE.md
M  src/app/(app)/layout.tsx                              ← PAS créé par moi, ne pas toucher
M  src/app/api/n8n/callback/route.ts                      ← matérialisation account_issues_map
M  src/components/accounts-contacts/intelligence/ClientIntelligenceDesktopView.tsx
M  src/components/accounts-contacts/intelligence/ClientIntelligenceMobileView.tsx
M  src/components/accounts-contacts/intelligence/intelligence-process.ts
M  src/lib/intelligence/intelligence-data.ts
M  src/lib/n8n/types.ts
M  src/types/database.generated.ts
```
**Fichiers nouveaux non commités (Lot 4)** :
```
?? n8n/workflows/intel-031-issues-map.SETUP.md
?? n8n/workflows/intel-031-issues-map.json
?? src/components/accounts-contacts/intelligence/AccountIssuesBlocks.tsx
?? src/components/accounts-contacts/intelligence/set-account-issue-status.ts
?? src/lib/intelligence/materialize-account-issues.ts
?? supabase/migrations/20260707201824_051_account_issues_context_rpc.sql
```
**Fichier non créé par moi, à ignorer/laisser tel quel** :
```
?? src/components/layout/AppOverlayHosts.tsx    ← travail de Guillaume
?? test-results/                                 ← artefact de test, probablement à gitignore
```

**Migrations Supabase appliquées en base cette session (toutes déjà live, dans l'ordre)** :
| Version | Nom | Lot |
|---|---|---|
| `20260707162154` | `047_reap_stale_intelligence_runs` | 0 |
| `20260707181634` | `048_adr0012_lot1_issues_roadmap_schema` | 1 |
| `20260707183536` | `049_account_knowledge_context_rpc` | 2 |
| `20260707193641` | `050_adr0012_lot3_sector_backfill` | 3 |
| `20260707201824` | `051_account_issues_context_rpc` | 4 |

**Prochaine action recommandée à l'ouverture de la nouvelle session** : demander
à Guillaume s'il veut committer + déployer le Lot 4 maintenant (comme il l'a
demandé pour les lots précédents), avant d'attaquer le Lot 5 — pour éviter que
le non-commité s'accumule sur plusieurs lots.

---

## 6. Prochaine tâche exacte : Lot 5 — Stratégie commerciale

**Définition fonctionnelle** (ADR-0012 §4, étape 4) :
- **Question** : "Comment transformer les enjeux du compte en discours commercial, offres KREDO et séquences d'approche plausibles ?"
- **Entrées** : enjeux priorisés (`account_issues`, maintenant peuplée par le Lot 4) + catalogue offres KREDO (`offers`/`offer_practices`/`offer_pricing_grids`) + playbook sectoriel (`sector_intelligence.playbook`, alimenté par le Lot 3) + contacts + historique relationnel + pitchs déjà générés (`commercial_pitch` via `intelligence_documents`) + objections connues + contraintes du compte.
- **Livrables attendus** : matrice enjeu↔offre↔persona↔preuve (`content_json`, `result_type=commercial_strategy` — contrat déjà défini au Lot 1 dans `account-intelligence-contracts.ts` : `CommercialStrategyContent`, `CommercialStrategyOfferMatch`) · offres prioritaires par enjeu/contact · 2-4 angles d'approche · messages clés par persona · objections/réponses · bibliothèque de pitchs déjà branchée (ADR-0009, ne pas refaire) · fiche de préparation RDV.
- **Rendu desktop** : "atelier commercial" — matrice enjeu→offre→persona→preuve, playbook sectoriel consultable, bibliothèque des pitchs, boutons "générer pitch"/"préparer RDV"/"transformer en roadmap".
- **Rendu mobile** : angle recommandé, pitch 30s, objection probable, réponse courte, bouton copier.

### Ce qui existe DÉJÀ et qu'il ne faut PAS refaire
- `get_pitch_context` (RPC, ADR-0009) fait déjà le matching offre↔compte par
  practice (heuristique documentée, missions.practice texte libre → offer_practices.slug).
- L'onglet Stratégie a déjà `StrategieTab` (dans `ClientIntelligenceDesktopView.tsx`)
  qui affiche la bibliothèque de pitchs déjà générés (`pitchDocuments`) et un
  bouton `ContextualCommunicationButton entryPoint="account_pitch"` pour en
  générer de nouveaux. **Le Lot 5 doit ENRICHIR cet onglet, pas le recréer.**
- Le contrat `CommercialStrategyContent` existe déjà dans
  `src/lib/intelligence/account-intelligence-contracts.ts` (Lot 1) :
  ```ts
  export const COMMERCIAL_STRATEGY_RESULT_TYPE = "commercial_strategy" as const
  export type CommercialStrategyOfferMatch = { issue_id, offer_id, rationale, provenance }
  export interface CommercialStrategyContent {
    schema_version: 1, offer_matches: CommercialStrategyOfferMatch[],
    approach_angles: string[], key_messages_by_persona: Record<string,string[]>,
    objections: Array<{objection, response}>, generated_at: string
  }
  ```

### Séquence de travail attendue pour le Lot 5 (calquée sur le pattern des Lots 2/4)
1. **RPC `get_commercial_strategy_context`** — hydrater : `account_issues` ouverts
   du compte (le vrai nouvel input par rapport aux lots précédents) + catalogue
   offres complet (pas allégé cette fois — l'étape 4 EST l'étape de vente) +
   playbook sectoriel (`sector_intelligence.playbook`) + contacts + pitchs déjà
   générés. Copier le pattern `get_account_issues_context`/`get_pitch_context`.
2. **Workflow n8n `intel-032-strategy.json`** (nom à confirmer contre l'ADR —
   vérifier D-7 : 4 workflows fins prévus, celui-ci est le 3ᵉ après intel-030
   et intel-031). Prompt : mapper CHAQUE enjeu ouvert à une ou plusieurs offres
   avec justification, proposer 2-4 angles d'approche, messages par persona,
   objections/réponses. **Pas de génération de pitch ici** (ça reste
   `intel-020-communication`, déjà fonctionnel) — cette étape produit la
   STRATÉGIE (le mapping), pas le texte final du pitch.
3. **Callback** : `commercial_strategy` → probablement un simple `content_json`
   (pas de matérialisation en table comme les enjeux — D-5 le traite comme un
   artefact de génération pure). Vérifier si `isEligibleDocumentResult` doit
   inclure `commercial_strategy` (probablement oui, pour l'historiser dans
   `intelligence_documents` comme les autres analyses).
4. **UI** : enrichir `StrategieTab` existant avec la matrice enjeu↔offre + le
   playbook sectoriel consultable (actuellement le playbook n'est affiché que
   dans `SectorSnapshotContent.tsx`, onglet secteur — décider si le dupliquer
   ici ou y renvoyer par lien).
5. **Validation systématique** (répéter à chaque lot) : `node --check` sur les
   nœuds `code`, harnais Node avec mocks + cross-check de contrat, `tsc --noEmit`,
   `npm run build`, `npx vitest run` (viser 200+/200), `eslint` sur tous les
   fichiers touchés (0 erreur, warnings uniquement s'ils sont déjà pré-existants).
6. **SETUP.md** pour le nouveau workflow (même structure que
   `intel-030-account-knowledge.SETUP.md`/`intel-031-issues-map.SETUP.md`).
7. **Journalisation** : nouvelle section CLAUDE.md ("Session N (suite) — ADR-0012
   Lot 5..."), mise à jour du tableau de migrations, mise à jour de la mémoire
   `adr-0012-cockpit-decision-chain.md`.

### Après le Lot 5 : Lots 6-7 (pour référence, pas pour cette prochaine session)
- **Lot 6** — Roadmap draft : table `account_roadmap_actions` déjà créée (Lot 1),
  suivre le même pattern matérialisation que le Lot 4 (`account_issues_map` →
  `materialize-account-roadmap-actions.ts` symétrique, résultat
  `commercial_roadmap`). AUCUNE écriture dans `tasks`/`calendar_events` à ce stade.
- **Lot 7** — Matérialisation réelle (écriture `tasks`/`calendar_events`/
  `opportunities`) + campagne. **Classe de risque à part** — validation manager
  obligatoire avant toute écriture dans l'agenda réel (D-2), jamais automatique.

---

## 7. Rappels méthodologiques (comportement attendu, déjà établi cette session)

- **Toujours vérifier au réel avant d'agir** : lire le schéma DB exact
  (`information_schema.columns`), tester les RPC sur données réelles (comptes
  nommés : Voyage Privé a du relationnel riche mais pas de `sector_id` ; Ascoma
  a un `sector_id` riche en pain points/réglementaire — bons comptes de test
  pour respectivement tester le fallback et le cas enrichi).
- **Ne jamais commit/déployer sans demande explicite** de Guillaume — mais
  quand demandé, suivre le pattern déjà rodé : `git add` ciblé (jamais `-A`),
  commit avec message français décrivant le "pourquoi", `git push origin main`,
  puis `vercel --prod` (preflight déjà validé cette session — CLI présent,
  projet lié `guillaume-kasanins-projects/kredo`, domaine prod `kredo-green.vercel.app`).
- **Signaler les écarts de scope honnêtement** plutôt que de les cacher ou de
  les résoudre en douce — ex. la découverte du travail parallèle de Guillaume,
  les décisions de simplification (matrice visuelle → table triable au Lot 4),
  les limitations connues (pas de déduplication robuste des enjeux, tiering
  Haiku/Sonnet pas encore fait).
- **Pas de Chrome DevTools MCP disponible** dans get MCP servers actuellement
  connecté — la QA visuelle reste à faire par Guillaume en navigateur, jamais
  simulée par l'agent.

# KREDO — Prompt d'amorçage Claude Code

## Ton rôle

Tu agis en tant que Lead Développeur Full-Stack Senior sur le projet Kredo.
Avant toute action, tu LIS les fichiers existants (package.json, globals.css,
tsconfig.json, structure de /app) pour comprendre l'état réel du codebase.
Tu ne supposes rien. Tu lis, tu annonces ce que tu vas faire et pourquoi, tu exécutes.

---

## Contexte projet

Kredo est un outil B2B interne de type "Super-Assistant" pour la gestion d'un
centre de profit en ESN. Il centralise : CRM, pipe commercial, suivi financier
(P&L, TJM, TACI, marge), management RH, recrutement avec matching IA.

Philosophie : **Single Source of Truth.** Hub front-end unifié, base relationnelle
Supabase, tâches lourdes externalisées sur n8n via webhooks.

---

## Stack technique EXCLUSIVE — aucune alternative non sollicitée

> ⚠️ **Next.js 16 n'est pas le Next.js de ton corpus d'entraînement.** APIs, conventions et
> structure de fichiers ont changé. Lire le guide concerné dans `node_modules/next/dist/docs/`
> avant d'écrire du code Next, et tenir compte des avis de dépréciation.

- **Front-end** : Next.js **16.2.7** (App Router), React **19.2.4**, Server Components, API routes → Vercel
- **Styling** : Tailwind CSS v4 (directive `@theme` dans `src/app/globals.css`, **SANS** tailwind.config.*)
- **Design** : palette "Cobalt Franc" définie dans globals.css — lire ce fichier avant tout CSS
- **UI components** : composants **maison** sur primitives `<dialog>` natives (`AppDrawer`, `AppDialog`, `SurfaceCard`, `ReadyActionButton`…) + utilitaires Tailwind v4. **PAS de shadcn/Radix** (aucune dépendance installée) — ne pas faire `npx shadcn add`, étendre les primitives existantes
- **Dataviz** : SVG écrit à la main, module par module (`PnlBarChart`, `CostTimelineChart`, `Trajectory2026Chart`). Seule dépendance graphique tolérée : `d3-shape` (calcul de tracés, pas de rendu)
- **State client** : `zustand` v5 pour les rares stores globaux (panneau intelligence, drawers CRM). Pas de Redux, pas de Context global
- **Base de données** : Supabase (PostgreSQL, RLS actif, `vector` v0.8 installé)
- **Auth** : Supabase Auth + `@supabase/ssr` (App Router)
- **Async/IA** : n8n self-hosted sur VPS, déclenché via webhooks Supabase ou API routes
- **Tests** : Vitest (`npm test`) — ~100 fichiers de test, colocalisés en `__tests__/`

**Interdictions fermes :**
- PAS de recharts, chart.js, react-chartjs-2, Tremor, **ni shadcn/ui** (y compris ses DataTable et charts)
- PAS de tailwind.config.* (Tailwind v4 = @theme uniquement)
- PAS de graceful degradation CSS (charger lourd + cacher sur mobile)
- PAS de HEX en dur dans le JSX — uniquement les variables `@theme`

---

## Commandes

```bash
npm run dev                    # Next dev (Turbopack)
npm run build                  # Build de production — la seule vraie vérification
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint
npm test                       # vitest run — n'inclut QUE `src/**/*.test.ts`
npm run test:n8n               # 7 harnais n8n (309 assertions) — hors périmètre de `npm test`
npm run check:server-boundary  # invariant : tout module important le client Supabase serveur porte `import "server-only"`
npm run db:types               # régénère src/types/database.generated.ts depuis Supabase
npm run n8n:status             # dérive entre n8n/workflows/ (repo) et ce qui tourne sur le VPS
```

```bash
python3 scripts/audit-master-study.py docs/MASTER-STUDY/registre/<run>/   # gate G1 d'un run MASTER STUDY
```

**Boucle de validation avant de déclarer un travail fini** — dans cet ordre :
`typecheck` → `test` → `check:server-boundary` → `lint` (fichiers touchés) → `build`.
**Ajouter `test:n8n` dès qu'un fichier de `n8n/workflows/` est touché** — `vitest` n'inclut que
`src/**/*.test.ts`, donc `npm test` reste vert même quand un workflow est cassé.

Quatre pièges récurrents, tous documentés au prix d'une session perdue :
- **`tsc` ne voit pas tout.** Un composant client important une *valeur* (pas un type) depuis un
  module `server-only` passe le typecheck et casse `next build`. Seul le build le révèle.
- **`.next/` périmé** produit de faux `TS6200`/`TS2300` : purger avant de conclure à une régression.
- **`build:webpack`** est la seule application réelle de la frontière serveur/client (Turbopack la
  tolère en silence) ; `check:server-boundary` en est le contrôle statique rapide.
- **Un harnais n8n qui « passe » peut n'avoir rien exécuté.** Ces harnais sont des scripts Node
  nus : une exception dans un nœud Code (globale n8n absente du sandbox — `$execution`,
  `$workflow`, `$env`…) fait sauter toutes les assertions restantes. `intel-020` et `intel-040`
  ont vécu ainsi avec 117 assertions muettes. Toujours lire le compteur final, jamais le seul
  code de sortie.

---

## Supabase — état de la base

**Projet ID :** `jvzgmhvwirsbdkjpmvla`
**URL :** `https://jvzgmhvwirsbdkjpmvla.supabase.co`

### Migrations (159 en prod / 158 en repo au 2026-08-14)
> ⚠️ **Liste canonique = `supabase/migrations/` + `supabase_migrations.schema_migrations` en prod.**
> Au 2026-08-14 : **159 versions en prod, 158 fichiers en repo** — au moins une migration appliquée
> live sans fichier versionné (dernière prod : `20260809213755`, dernier fichier :
> `20260809180000`). **Réconcilier avant tout `db reset` / `migration list`.**
>
> Le tableau ci-dessous est un **extrait historique indicatif**, jamais tenu à jour et jamais
> exhaustif : ses timestamps ne correspondent pas tous aux versions réellement enregistrées.
> Pour connaître l'état réel : `ls supabase/migrations/` ou `list_migrations` via MCP.

| Version | Nom |
|---|---|
| 20260608230043 | 001_module_opportunite |
| 20260609051922 | add_rich_text_notes |
| 20260609142009 | 003_enrich_sales_opportunities_v1 |
| 20260609220228 | 0001_kredo_core_socle |
| 20260609221057 | 0002_kredo_crm_humain_skills |
| 20260609221615 | 0003_kredo_sales |
| 20260609224628 | 0003b_opportunities_stage_compat |
| 20260609230333 | staging_contacts_import_setup |
| 20260609235801 | add_test_consultant_missions_cra |
| 20260610000318 | seed_test_open_opportunities_mapped_companies |
| 20260611 | 006_ai_intelligence (ADR-0007) |
| … | 015_offer_catalog (référentiel offres) |
| 016 | 016_collaborator_compensation (RH/coût confidentiel + `is_workspace_admin()`) |
| 017 | 017_rename_taci_to_cjm (correction sémantique TACI → CJM) |
| 018a | 018a_seed_collaborators_entry_dates (spread entry_date 2018→2025) |
| 018b | 018_job_profiles_referentiel (référentiel profils recrutement + embedding) |
| 019a | 019a_seed_person_skills (75 compétences / 15 personnes, inference_ia) |
| 019b | 019_pgvector_pricing_grid_seed (grille tarifaire + pgvector) |
| 020 | 020_enrich_mission_activity_reports (business_days / pto_days / sick_days / activity_rate_percent GENERATED) |
| 021 | 021_seed_mission_activity_reports (80 CRA, 16 collab × 5 mois, Jan→Mai 2026) |
| 022 | 022_seed_mission_activity_reports_fixed (correctif post-seed, no-op local) |
| 023 | 023_missions_billing_description (billing_condition + description sur missions) |
| 024 | 024_pnl_monthly (P&L mensuel consolidé + seed 12 mois) |
| 025 | 025_activity_absences_profitability (absences datées, fermetures client, compensation C17-C19, 3 vues analytiques) |
| 20260702220731 | 042_intelligence_documents (bibliothèque documentaire IA) |
| 20260707162154 | 047_reap_stale_intelligence_runs (ADR-0012 Lot 0 — fonction ops-004 de reprise des runs bloqués) |
| 20260707181634 | 048_adr0012_lot1_issues_roadmap_schema (tables account_issues + account_roadmap_actions, enum intelligence_provenance) |
| 20260707183536 | 049_account_knowledge_context_rpc (ADR-0012 Lot 2 — hydratation déterministe intel-030-account-knowledge) |
| 20260707193641 | 050_adr0012_lot3_sector_backfill (3 nouvelles fiches sector_intelligence + rattachement de 13 comptes, 14→27/95 avec sector_id) |
| 20260707201824 | 051_account_issues_context_rpc (ADR-0012 Lot 4 — hydratation déterministe intel-031-issues-map) |
| 20260707225318 | 052_commercial_strategy_context_rpc (ADR-0012 Lot 5 — hydratation déterministe intel-032-strategy) |
| 20260707225628 | 053_commercial_strategy_document_type (ajout valeur enum intelligence_document_type) |
| 20260729203143 | 059_rls_initplan_wrapping (audit perf Lot 1 — 210 policies wrappées `(SELECT …)`) |
| 20260802225335 | 060_company_metadata_projection (audit perf Lot 5 — 6 colonnes générées `companies.meta_*` + réécriture des 2 vues de liste) |
| 20260802232433 | 061_planner_statistics_maintenance (seuils autoanalyze 10 + 5 % sur les 71 tables + cron `analyze-public-schema`) |
| 20260804000000 | 062_intelligence_hydration_rpcs (+ 063 correctif) |
| 20260804154634 | 064_remove_user_notifications_bell (**table `user_notifications` SUPPRIMÉE** — la cloche de notification décrite dans le journal Session 28 n'existe plus) |
| 20260804182934 | 065_ai_runs_owner_fk (FK `ai_intelligence_runs.owner_id → profiles`, débloque le journal d'exécution `/automations`) |
| 20260809142701 | taxonomie_segments_et_axes_orthogonaux (`companies.segment_id` → `sector_intelligence`, colonnes `classification_*`) |
| 20260809150511 | classification_tracabilite_et_bac_a_qualifier |
| 20260809165832 | value_chain_foundation (tables `value_chain_nodes` / `_actors` / `_links`) |
| 20260809180000 | seed_taxonomie_segments_et_classification_comptes (36 segments, **96/96 comptes classifiés**) |
| 20260810110011 | 066_companies_rationalisation_lot1 (`relation_type` = source de vérité, `lifecycle_status` devient sa **projection** par trigger) |
| 20260810110343 | 067_account_depth_socle (ADR-0019 — `companies.depth_level`/`origin`/`name_normalized`, `competitive_map_entries`) |
| 20260810204816 | 068_account_classification_apply (ADR-0019 Lot 4 — `apply_account_classification()`, application atomique des 7 axes) |
| 20260811232105 | 069_sector_knowledge_resolution_views (Lot 0 — `v_sector_knowledge_resolved` + `v_sector_knowledge_items`, résolution segment → macro **à la lecture**) |
| 20260811232234 | 070_sector_knowledge_functions_search_path (`search_path = ''` sur les 5 helpers `private.*`) |
| 20260811233206 | 071_sector_playbook_merge_drop_empty_keys (correctif : une clé vide des deux côtés disparaît du playbook fusionné) |
| 20260811234834 | 072_sector_intelligence_strip_display_numbering (numérotation « 5.1 » sortie de `name` → colonne `display_code`) |
| 20260812110000 | 073_account_facts_identite_france (socle identité France — `companies.siren`/`naf_code`, familles de faits `legal_id`…) |
| 20260812124353 | 074_competitive_map_ingestion (`competitive_map_entries`, comptes `depth_level='mapped'`) |
| 20260812153000 | 075_competitive_map_profile_extension (`profile_json`, `accessibilite_score`) |
| 20260813120000 | 076_master_study_document_type (`intelligence_document_type` += `master_study` — MASTER-STUDY lot 0.1) |
| 20260813233100 | account_signal_lifecycle_actions (`detected_at` comme date métier, archivage calendaire, vue défensive, promotions traçables) |
| 20260813234513 | index_account_signal_promotions (index couvrants des FK de promotion Playbook) |
| 20260818092506 | harden_get_manager_summary_facts_privileges (🔒 faille corrigée — `SECURITY DEFINER` sans `search_path`, `EXECUTE` ouvert à `anon`/`authenticated` sur une fonction filtrant sur son paramètre `p_workspace_id`) |
| 20260818101855 | guard_ai_intelligence_summary_mission_runs (ADR-0020 M-4 — exclut `run_type LIKE 'mission:%'` de la latérale `res`) |
| 20260818110944 | guard_ai_intelligence_summary_mission_runs_counters (M-4, complément — la latérale `runs` restait polluée : `count_runs`/`latest_run_*`) |
| 20260818140533 | 086_mission_report_document_type (ADR-0020 L3 — `intelligence_document_type` += `mission_report`, seule écriture de schéma du lot) |
| 20260820200000 | master_study_provenance_columns (ADR-0021 L1 — provenance atomique `source_run_id` sur 6 tables, `study_snapshot_date` et `resolution_locks jsonb` sur `sector_intelligence`, fonctions `private` de résolution scalaire, réécriture de `v_sector_knowledge_resolved` avec gestion `locked`) |
| 20260820200001 | master_study_value_chain_amorce_fix_workspace_scoping (ADR-0021 L2 — `value_chain_nodes.maillon` sans plafond, `vcn_capture_si_chaine` retirée pour l'amorce E4 sans captation ; RPC `ingest_master_study_e4` créée puis corrigée : `workspace_id` dérivé du segment cible et explicite sur tous les `INSERT`, pas de `private.current_workspace_id()`/`auth.uid()` sous service-role) |
| 20260820200002 | master_study_move_e4_rpc_to_public_schema (ADR-0021 L2 — `ingest_master_study_e4` déplacée de `private` vers `public` : PostgREST n'expose jamais `private.*`, trouvé en vérification indépendante avant tout appel `--live`) |


### Architecture multi-tenant (ACTIF)

Le projet utilise un modèle **workspace**. Chaque utilisateur appartient à un
workspace. Toutes les tables portent `workspace_id uuid` avec :
- DEFAULT automatique : `current_workspace_id()` — **le front n'a jamais besoin de l'envoyer**
- RLS actif sur 100% des tables, motif standard : `workspace_id = current_workspace_id()`

**Fonctions Postgres — schéma `private`, PAS `public` :**
> 🔴 Conséquence directe : **elles ne sont pas exposées par PostgREST, donc jamais appelables en
> `.rpc()` depuis le front.** Pour résoudre le workspace côté Server Action, lire
> `profiles.workspace_id` (patron : `src/lib/account-scoring/collect-account-score-input.ts`).

- `private.current_workspace_id()` — security definer, lit `profiles` → renvoie le workspace de l'user connecté
- `private.is_workspace_admin()` — security definer, TRUE si l'user courant est `owner`/`admin` du workspace ; utilisé par les RLS des données confidentielles (rémunération)
- `private.handle_new_user()` — trigger auth, crée le profil à l'inscription
- `private.log_audit()` — trigger AFTER INSERT/UPDATE/DELETE sur les tables auditées
- `private.set_updated_at()` — trigger BEFORE UPDATE, maintient `updated_at`

### Schéma public — 75 tables + 20 vues
> 📏 **Compteurs vérifiés live le 2026-08-14** (`information_schema`). L'inventaire détaillé
> ci-dessous a été réconcilié le **2026-07-16** et n'intègre pas les changements postérieurs,
> listés ici :
> - **+3 tables** `value_chain_nodes` (10 lignes) / `value_chain_actors` (50) / `value_chain_links` (20) — socle chaîne de valeur, pilote BTP.
> - **−1 table** `user_notifications` (supprimée par la migration 064).
> - **`companies`** porte désormais `segment_id → sector_intelligence`, `classification_confiance`, `classification_note`, `classified_at`, `classified_by`.
> - **`sector_intelligence` : 53 lignes** (14 au 07-16) et **96/96 comptes classifiés** via `segment_id`. ⚠️ Tout ce que le journal des sessions dit de « 27/95 comptes rattachés, ~68 volontairement sans secteur » est **périmé**.
>
> ⚠️ Migrations en double numérotation : les slots 018/019 sont occupés deux fois (seeds + référentiels). Supabase utilise le timestamp comme clé primaire, pas le nom.
> Row counts = snapshots, indicatifs seulement (dérivent vite : `account_signals`, `ai_intelligence_*`, `enrichment_proposals`). **Vérifier en base avant de s'appuyer sur un chiffre.**

#### Domaine Core
| Table | Rows | Description |
|---|---|---|
| `workspaces` | 1 | Tenant racine (id, name, owner_id, settings JSONB) |
| `profiles` | 1 | Étend auth.users (id, workspace_id, full_name, email, role, ui_prefs) — RLS 2 policies (SELECT/UPDATE), pas de INSERT/DELETE client |
| `audit_log` | 4856 | Traçabilité auto — RLS 1 policy (SELECT), lecture seule côté client |
| `tasks` | 27 | Actions transverses polymorphes (entity_type / entity_id) |

`profiles.role` valeurs : `owner` · `admin` · `sales` · `recruiter` · `viewer`

#### Domaine CRM & Humain
| Table | Rows | Description |
|---|---|---|
| `companies` | 96 | Comptes (lifecycle_status, priority, tags[], metadata JSONB, sector_id → `sector_intelligence`) |
| `persons` | 701 | Party model — `full_name` est une **colonne générée** (TRIM first+last) |
| `contacts` | 644 | Person dans son rôle chez un compte (relationship_role, decision_power, department) |
| `collaborators` | 23 | Person dans son rôle consultant interne (status, job_profile_id ; rémunération/coût → `collaborator_compensation`) |
| `candidates` | 38 | Person dans son rôle recrutement (status, expected_daily_rate, job_profile_id, practice_id) |
| `company_relationships` | 0 | Arêtes organigramme client (reporte_a, influence, collabore_avec) |
| `skills` | 130 | Référentiel contrôlé (name canonique + aliases[], category) |
| `person_skills` | 247 | Compétences (level 1-5, years, confidence 0-1, source) |

`companies.lifecycle_status` : `cible` · `prospect` · `client_actif` · `client_dormant` · `ancien_client` · `partenaire` · `non_prioritaire` · `exclu`

`contacts.relationship_role` : `decideur` · `prescripteur` · `acheteur` · `operationnel` · `sponsor` · `utilisateur_final` · `rh` · `manager_technique` · `dsi` · `direction_metier`

`skills.category` : `langage` · `framework` · `cloud` · `data` · `devops` · `methode` · `fonctionnel` · `secteur` · `soft_skill` · `langue` · `certification`

`companies.meta_logo_path` / `meta_contact_stats` / `meta_has_study` / `meta_has_analysis_data` / `meta_has_sector_analysis` / `meta_has_pitches` — colonnes **GÉNÉRÉES STORED** (migration 060) projetant les scalaires dérivés de `metadata`. **Toujours les lire plutôt que `metadata`** : le blob pèse 14 Ko en moyenne, il est TOASTé, et chaque déréférencement le décompresse intégralement (39,4 ms → 3,47 ms sur la liste comptes). `resolveCompanyEmbed()` privilégie `meta_logo_path`. `jsonb_build_object()` étant `STABLE`, aucune colonne générée ne peut la contenir.

`companies.size_band` — colonne **GÉNÉRÉE** à partir de `employee_count` (tranches 1-20/21-100/101-500/501-1000/1001-5000/+5k). `companies.legacy_folio_score` (ex-`ai_score`, renommé migration 027/ADR-0011 Lot 0) : score legacy FOLIO déprécié, non recalculé — voir [[ai-cost-monitoring-initiative]] et section ADR-0011 dans le journal de sessions.

#### Domaine Référentiels — Offres & Profils
| Table | Rows | Description |
|---|---|---|
| `offer_practices` | 8 | Practices Kredo (slug/name) — `cloud-engineering`, `cybersecurity`, `data-ai`, `digital-business-solutions`, `digital-experience`, `legacy-systems-mainframe`, `project-agile-delivery`, `quality-engineering-testing` |
| `offer_engagement_types` | 5 | Modalités d'engagement (slug/name) — `audit`, `centre_competences`, `conseil`, `forfait`, `regie` |
| `offers` | 41 | Catalogue d'offres commerciales, rattachées à une `offer_practices` |
| `offer_pricing_grids` | 120 | Grille tarifaire par practice/engagement_type/job_profile (seed pgvector, migration 019) — ⚠️ `offer_id` quasi jamais peuplé en pratique (0/120 constaté Session 20) : la jointure grille↔offre passe par `practice_id`, pas `offer_id` |
| `job_profiles` | 65 | Référentiel profils recrutement (migration 018b) — FK depuis `candidates`, `collaborators`, `candidate_hiring_processes`, `offer_pricing_grids`, `financial_models`, `client_pricing_agreement_lines` |

⚠️ `missions.practice` reste un **texte libre historique** (`Cloud`/`Cybersecurity`/`Data`/…) sans FK vers `offer_practices.slug` — mapping heuristique en CASE SQL dans plusieurs RPC (`get_pitch_context`, `get_commercial_strategy_context`), dette documentée et volontairement non corrigée (pas de `missions.practice_id`).

#### Domaine Recrutement — Process
| Table | Rows | Description |
|---|---|---|
| `candidate_hiring_processes` | 29 | Une tentative de recrutement interne (`current_step` aligné `HIRING_KANBAN_STAGES`, Session 13) — un candidat peut avoir plusieurs process (relances) |
| `candidate_hiring_milestones` | 115 | Jalons d'un process (plusieurs possibles par étape : reports, retries) |

#### Domaine Sales
| Table | Rows | Description |
|---|---|---|
| `opportunities` | 24 | Pipe commercial — pivot central de l'app |
| `opportunity_skills` | 55 | Besoins compétences côté demande (importance, min_level, weight) |
| `opportunity_contacts` | 18 | Interlocuteurs décideurs par opportunité (role) — max 2 par opportunité (trigger `enforce_opportunity_contacts_max_two`, migration `limit_opportunity_contacts_to_two`) |
| `opportunity_candidates` | 34 | Pipeline présentation profils (status de présentation) |
| `interactions` | 140 | Historique relationnel fusionné (type, sentiment, occurred_at, calendar_event_id) |
| `match_scores` | 18 | Résultats matching IA (overall_score, scores JSONB, model_version) |

**`opportunities.stage` — valeurs CANONIQUES à utiliser :**
`detection` · `qualification` · `besoin_confirme` · `recherche_profil` · `cv_envoyes` · `entretien_client` · `negociation` · `gagne` · `perdu` · `abandonne`

⚠️ **Valeurs legacy présentes en base mais à NE PAS réutiliser :**
`en_cours` · `cv_sent` · `rt` · `win` · `lost` · `non_traitee`

**Colonnes générées sur `opportunities` :**
- `weighted_gain` = `estimated_gain * conviction / 100`
- `acv` = `duration_days * target_daily_rate`

`opportunities.opportunity_type` : `regie` · `forfait` · `centre_de_service` · `conseil` · `audit` · `staffing` · `extension` · `renouvellement` · `upsell` · `cross_sell`

#### Domaine Agenda
| Table | Rows | Description |
|---|---|---|
| `calendar_events` | 475 | Source de vérité du module Agenda — 16 types en 3 familles Commerce/Management/Recrutement (migration 026, Session 10), `mission_id` (migration 041) |

#### Domaine Intelligence sectorielle
| Table | Rows | Description |
|---|---|---|
| `sector_intelligence` | 53 | Référentiel sectoriel à 2 niveaux via `parent_id` (15 `macro` + 38 `segment`) — name, slug, `level`, `display_code`, attractiveness_score, practices_fit JSONB, playbook JSONB, `source_run_id` uuid (FK `ai_intelligence_runs`), `study_snapshot_date` date, `resolution_locks` JSONB DEFAULT '{}' (ADR-0021 L1). UNIQUE(workspace_id, slug). **Le `slug` est la seule clé fonctionnelle** : `apply_account_classification()` et le workflow n8n INTEL-010 matchent dessus, jamais sur `name`. `display_code` (migration 072) garde la numérotation historique « 5.1 » **hors** du libellé — documentaire, à ne jamais réafficher devant un nom |
| `sector_news` | 7 | Actualités par secteur (published_at, relevance_score, is_trigger_event, tags[]) |
| `sector_events` | 15 | Événements commerciaux (event_type, event_date, commercial_opportunity) |
| `sector_pain_points` | 22 | Points de douleur consolidés (frequency_count, source_company_ids uuid[]) |
| `sector_regulatory_items` | 13 | Réglementations (urgency, deadline_date, is_commercial_window) |

🔴 **La connaissance sectorielle d'un compte se lit par `companies.segment_id`, jamais par
`companies.sector_id`** (Lot 0, migrations 069-071). `sector_id` reste une **projection** du macro
parent, écrite par `apply_account_classification()` seule, utile à l'affichage et à
`AccountScanDialog` — mais ce n'est plus une source de lecture. La résolution (héritage du macro
quand le segment est vide) n'existe **qu'en SQL**, dans les deux vues `v_sector_knowledge_*` : ne
jamais la réimplémenter en TypeScript. Deux règles à ne pas confondre — **substitution** champ par
champ pour les scalaires et le `playbook` (clé par clé, jamais le blob : 37 des 38 segments portent
un squelette de seed aux tableaux vides qui écraserait 13 playbooks macro remplis), **union** pour
les items. Invariants assertés par `supabase/tests/069_sector_knowledge_resolution.assertions.sql`
(14 assertions, à rejouer contre la base après toute évolution).

⚠️ **RLS sector tables** : policy unique `FOR ALL` (pas le motif 4-policies standard, confirmé live). Toutes FK vers `sector_intelligence.id`. Triggers `trg_*_updated_at` uniquement (pas de log_audit).

#### Domaine Intelligence commerciale (ADR-0007 / ADR-0008)
| Table | Rows | Description |
|---|---|---|
| `ai_intelligence_runs` | 137 | Une exécution d'analyse / rapport / scan (cycle de vie, `current_phase`, coûts/tokens, `input_snapshot`, `primary_entity_type`/`primary_entity_id`). **`run_type` est du `text` libre** : une mission d'intelligence y écrit `mission:<slug>` (ADR-0020 M-3, aucune table ni colonne nouvelle) |
| `ai_intelligence_results` | 113 | Un résultat **par phase** (`UNIQUE(run_id,phase)`) — **`content_json` = source unique** (pas de html) ; `result_type` = la vraie clé de classification (pas `phase`, pollué — cf. [[folio-data-reality]]) |
| `ai_intelligence_logs` | 0 | Append-only (coûts, erreurs, retries) — RLS 2 policies (INSERT/SELECT), pas de update/delete client |
| `intelligence_documents` | 59 | Couche documentaire exploitable par l'utilisateur — distincte de `ai_intelligence_results` (immuable, technique) |
| `intelligence_document_versions` | 59 | Historique append-only des versions d'un document |
| `intelligence_document_links` | 55 | Relation N:M polymorphe entre un document et les entités métier Kredo |

`intelligence_document_type` (enum, **24 valeurs**, vérifié live le 2026-08-18 via `pg_enum`) : `communication` · `client_summary` · `commercial_pitch` · `campaign` · `internal_note` · `activity_commercial` · `activity_recruitment` · `weekly_manager` · `planning_deadlines` · `financial` · `quarterly_review` · `staffing_capacity` · `delivery_profitability` · `account_portfolio` · `commercial_strategy` · `prise_de_parole` · `workspace_diagnostic` · `financial_reference` · `commercial_quote` · `strategic_watch_analysis` · `master_study` (migration 076) · `competitive_map_import` (080) · `manager_summary` · **`mission_report`** (086)

> ⚠️ **Ajouter une valeur à cet enum casse le `typecheck`**, pas le build : quatre fichiers la
> réclament aussitôt — `document-display.tsx`, `DocumentCard.tsx`, `DocumentMobileDetail.tsx`,
> `communication-result-documents.ts` (`FALLBACK_TITLE_BY_DOCUMENT_TYPE`). Les patcher fait partie
> de la migration, pas d'un suivi.
>
> 🔴 **Mais 8 sites sont à patcher, et `tsc` n'en désigne franchement que 4** (mesuré au lot
> ADR-0020 L3, 2026-08-18) :
> - **4 désignés sur leur définition** : `DOCUMENT_OBJECT_LABELS` (document-display), les deux
>   `DOCUMENT_TYPE_LABELS` de `DocumentCard`/`DocumentMobileDetail`, `FALLBACK_TITLE_BY_DOCUMENT_TYPE`.
> - **1 désigné seulement indirectement** (TS7053 au site d'appel, pas sur sa définition) : le
>   second `DOCUMENT_TYPE_LABELS` de `document-display.tsx`, indexé sur l'union manuscrite
>   `CommunicationDocumentType | ReportDocumentType`.
> - **2 jamais désignés** : le type `ReportDocumentType` et le `Set REPORT_DOCUMENT_TYPES` du même
>   fichier. Oublier le `Set` est un bug **silencieux** : `getDocumentCategory()` classe alors le
>   nouveau type en `"communication"` au lieu de `"report"`, ce qui change le rendu de
>   `DocumentPreviewPanel` et de `DocumentGenerationParameters` sans une seule erreur de compilation.
> - **1 hors exhaustivité** : `RESULT_DOCUMENT_TYPE_BY_RESULT_TYPE` (`Record<string, …>`, indexé sur
>   `result_type` qui est du texte libre) — jamais réclamé par `tsc`, mais c'est LUI qui décide
>   qu'un `result_type` devient un document (`isEligibleDocumentResultType`, chemin auto du callback).
>
> Contrôle : `grep -rl master_study src/` doit rendre 4 fichiers + `database.generated.ts`.

`intelligence_provenance` (enum, ADR-0012 D-3) : `relational` · `human_verified` · `engine_researched` · `folio_legacy` · `inferred`

**Phases** : `1=analyse client · 2=sectorielle (rattachée au SECTEUR, mutualisée) · 3=diagnostic process · 4=roadmap · 5=pitch` (ordre d'impl. `1→2→4→5→3`). `ai_run_status`/`ai_result_status` (enums) : `queued · running · succeeded · failed · cancelled` + `needs_review` **orthogonal**. Scoring legacy FOLIO déprécié (`companies.legacy_folio_score`) — remplacé par le Score de Priorité Commerciale ADR-0011 (domaine dédié ci-dessous).

> 🔴 **`phase` porte DEUX sémantiques depuis ADR-0020 (M-4), selon `run_type`.** Une mission
> d'intelligence écrit **toujours `phase = 1`**, qui ne signifie alors PAS « analyse client ».
> **Tout consommateur de `phase` doit exclure `run_type LIKE 'mission:%'`.** C'est une dette
> volontaire, et la seule régression connue de ce chantier sur l'existant. Périmètre mesuré le
> 2026-08-18 : un unique consommateur sémantique, la vue `v_ai_intelligence_summary`, corrigée
> par les migrations `20260818101855` + `20260818110944`. **Aucun code TypeScript n'interprète
> cette colonne** — s'assurer qu'il en va toujours ainsi avant d'en ajouter un.

**Surface (ADR-0008/0012)** : Hub `/prospection/accounts/[companyId]` en 5 étapes (Connaissance→Secteur→Enjeux→Stratégie→Roadmap, ADR-0012) lit `content_json` + fallback `companies.metadata` ; drawer `CompanyIdentityDrawer` = Quick View.

#### Domaine Intelligence — Enrichissement & Sources
| Table | Rows | Description |
|---|---|---|
| `intelligence_sources` | 42 | Sources factuelles individuelles (site officiel, registre légal SIRENE, presse…) rattachées aux faits/signaux |
| `intelligence_source_links` | 89 | Liaison N:M polymorphe source ↔ entité métier |
| `enrichment_proposals` | 71 | Propositions d'enrichissement CRM issues du scan compte (`intel-010-refresh`) — cycle `proposed → validated/rejected → applied/conflicting` |
| `account_facts` | 22 | Faits structurés publiés (cardinality single/multi), `source_proposal_id` → traçabilité |
| `account_signals` | 745 | Signaux d'achat — backfill FOLIO/`sector_news`/`sector_regulatory_items` (Session 21 Lot 1, migration `043_account_signals_backfill_v2`) |
| `account_watch_settings` | 3 | Cadrage minimal de veille par compte (cadence, état du dernier run) — ne stocke ni sources ni résultats bruts |
| `sector_playbook_signals` | 0 | Relation traçable et dédupliquée signal compte → playbook sectoriel existant ; écriture service-role après contrôle workspace |

⚠️ **RLS `intelligence_sources`/`intelligence_source_links`/`enrichment_proposals`/`account_facts`/`account_signals`** : **1 seule policy (SELECT)**, écriture exclusivement via fonctions `SECURITY DEFINER` scopées workspace (`apply_enrichment_proposal`, `decide_enrichment_proposal`, `validate_and_apply_enrichment_proposal(s)`, `import_account_scan_contacts`) — vérifié et documenté Session 26 (audit sécurité, cf. journal de sessions).

🔴 **La classification d'un compte ne passe JAMAIS par `enrichment_proposals`** (ADR-0019 Lot 4).
`private.perform_proposal_apply` applique **une proposition par attribut**, indépendamment des
autres ; or les contrôles du `REFERENTIEL-CLASSIFICATION.md` §10 sont **inter-champs** (le macro
doit être le parent du segment, trois axes sont obligatoires ensemble, la note dépend de la
confiance). Les 7 axes s'appliquent donc atomiquement via `public.apply_account_classification(
p_result_id, p_accepted_axes, p_reason)`, qui relit le contenu depuis `ai_intelligence_results` —
le client n'envoie jamais de valeur à écrire. Le macro n'est jamais proposé : il est déduit de
`segment.parent_id`. Ajouter un axe = modifier cette fonction, pas la whitelist de propositions.

#### Domaine Scoring de Priorité Commerciale (ADR-0011)
| Table | Rows | Description |
|---|---|---|
| `account_score_runs` | 6 | Un run = un calcul complet et historisé (append-only, jamais d'UPDATE). `score_band` : `A`/`B`/`C`/`D`/`U` (`U`="Unqualified", confidence trop faible) |
| `account_score_components` | 31 | Détail explicable par facteur C1-C6, `evidence_refs` JSONB pointant les lignes sources — `UNIQUE(score_run_id, component_key)` |
| `account_score_feedback` | 0 | Retour qualitatif utilisateur sur un run (trop haut/trop bas/juste) — pas branché en V1 (Lot 6+) |

**Vue `account_score_current`** : dernier run par compte (`DISTINCT ON (company_id) ... ORDER BY calculated_at DESC`) — seule vue à consommer côté app pour le score courant.

#### Domaine Cockpit Décisionnel — Enjeux & Roadmap (ADR-0012)
| Table | Rows | Description |
|---|---|---|
| `account_issues` | 22 | Enjeux priorisés par compte — matérialisés depuis `ai_intelligence_results` (`result_type='account_issues_map'`), mutés ligne à ligne (curation) |
| `account_roadmap_actions` | 0 | Plan d'actions draft par compte — matérialisation (écriture `tasks`/`calendar_events`/`opportunities`) strictement gated Lot 7, **jamais automatique** (D-2) |

`account_issue_status` : `open` · `dismissed` · `converted`. `account_issue_category` : `business` · `it` · `data` · `cloud` · `cyber` · `delivery` · `regulatory` · `people`. `account_issue_evidence_level` : `observed` · `inferred` · `weak`.

`account_roadmap_action_status` : `draft` · `validated` · `dismissed` · `materialized` · `done`. `account_roadmap_action_type` : `task` · `calendar_event` · `campaign` · `opportunity`.

#### Domaine Monitoring IA & Coûts
| Table | Rows | Description |
|---|---|---|
| `ai_model_pricing` | 2 | Grille tarifaire versionnée par modèle IA (effective-dated, même doctrine que `collaborator_compensation`) — alimente les vues `v_ai_*_costs`/`v_workflow_cost_stats` |

Voir [[ai-cost-monitoring-initiative]] pour le détail des 5 vues de coût/santé workflow associées.

#### Domaine Delivery / Finance
| Table | Rows | Description |
|---|---|---|
| `missions` | 23 | Contrats actifs (tjm, **cjm**, gross_margin_pct GÉNÉRÉ) |
| `mission_activity_reports` | 152 | CRA par période (billable_days, tjm_snapshot, **cjm_snapshot**, activity_rate_percent GÉNÉRÉ) |
| `collaborator_compensation` | 23 | **Rémunération datée confidentielle** (RLS owner/admin) — source du CJM |
| `collaborator_absences` | 78 | Absences datées (type enum, start/end, duration_days) — source du planning congés |
| `client_closures` | 6 | Fermetures de sites clients (company_id, dates, is_recurring) |
| `pnl_monthly` | 15 | P&L mensuel consolidé — inputs stockés, dérivés GENERATED ; `source` ∈ `import/cra_derived/budget/forecast` |
| `workforce_monthly_snapshots` | 15 | Effectif mensuel consolidé (active_consultants_count, intercontract_rate_pct) — alimente `v_commercial_performance_monthly` (baseline productivité) |

**`pnl_monthly`** — colonnes GENERATED : `gross_margin_value`, `gross_margin_percent`, `operating_profit_value`, `operating_profit_percent`. Ne jamais recalculer côté front. UNIQUE(workspace_id, period_month).

**`missions.gross_margin_pct`** = `ROUND((tjm - cjm) / NULLIF(tjm, 0) * 100, 2)` — colonne générée, ne jamais recalculer côté front.

> ⚠️ **Vocabulaire finance (corrigé) — ne plus jamais confondre :**
> - **TJM** = Taux Journalier Moyen (vendu au client).
> - **CJM** = Coût Journalier Moyen (coût interne chargé). C'est l'ex-`taci` renommé partout (migration 017).
> - **TACI** = **Taux d'Activité Congés Inclus** — un **TAUX (0–1)**, PAS un coût. Porté par `collaborator_compensation.taci`, il pondère les jours ouvrés → jours facturables → alimente le CJM.
> - **Marge brute** = (TJM − CJM) / TJM.

**`collaborator_compensation`** (effective-dated) : `gross_annual`, `charges_rate` (déf. 0.45), `working_days_per_year` (déf. 218), `taci` (taux 0–1), `cjm` **GÉNÉRÉ** = `round(gross_annual*(1+charges_rate)/(working_days_per_year*taci), 2)`. Une seule ligne en vigueur (`effective_to IS NULL`) par collaborateur. **RLS confidentielle** : les 4 policies exigent `is_workspace_admin()` (≠ motif uniforme).

`missions.status` : `active` · `paused` · `ended` · `cancelled`

`mission_activity_reports.status` : `draft` · `submitted` · `validated` · `rejected`

**`collaborator_absences`** : type enum `absence_type` = `conge_paye` · `rtt` · `maladie` · `sans_solde` · `contrainte_perso` · `formation` · `fermeture_client` · `autre`. Champs : `start_date`, `end_date`, `duration_days` (numeric 4,1). CHECK `end_date >= start_date` et `duration_days > 0`. RLS workspace standard.

**`client_closures`** : fermetures de sites clients rattachées à `companies.id`. Champs : `start_date`, `end_date`, `label`, `is_recurring`. RLS workspace standard.

#### Domaine Financial Modeling — Assistance Technique
| Table | Rows | Description |
|---|---|---|
| `financial_models` | 7 | Simulations TJM/coût/marge (Assistance Technique) — **outputs du moteur TypeScript**, jamais générés en SQL (`archive_financial_model`/`save_financial_model_snapshot` RPC, migration `financial_modeling_transaction_api`) |
| `financial_model_expenses` | 3 | Lignes de dépenses snapshot par modèle |
| `financial_assumption_sets` | 1 | Jeux d'hypothèses par défaut du moteur (workspace-scoped) |
| `financial_charge_rates` | 2 | Référentiel taux de charges rattaché à un assumption set |
| `client_pricing_agreements` | 0 | Accords tarifaires contractuels par client — distinct des grilles génériques `offer_pricing_grids` |
| `client_pricing_agreement_lines` | 0 | Lignes d'accord (profil, TJM min/max/recommandé) |

⚠️ **RLS confidentielle** : les 6 tables exigent `is_workspace_admin()` sur les 4 policies (même motif que `collaborator_compensation`) — vérifié live, non documenté avant cette réconciliation.

**`projects`** (voir domaine suivant) et **`missions`** alimentent `v_financial_model_pricing_anchors` comme ancrages tarifaires (avec `client_pricing_agreements`).

#### Domaine Projects — Missions au forfait
| Table | Rows | Description |
|---|---|---|
| `projects` | 3 | Missions au forfait (contract_amount, `target_margin_pct`/`actual_margin_pct` **GÉNÉRÉS**) — consommées par `/missions/projets` (Session 17) |
| `project_phases` | 10 | Jalons projet |
| `project_team_members` | 9 | Affectation collaborateurs à un projet |

`project_status` : `draft` · `active` · `delivered` · `closed` · `cancelled`. `project_phase_status` : `planned` · `in_progress` · `completed` · `blocked`. `project_ref_status` (référence commerciale) : `not_reference` · `draft` · `approved` · `archived`. `project_ref_visibility` : `named` · `anonymized` · `confidential`.

#### Domaine Performance Commerciale
| Table | Rows | Description |
|---|---|---|
| `performance_plans` | 1 | Objectifs annuels par commercial (fiscal_year, period_start/end, baseline_start/end) |
| `performance_criteria` | 4 | Critères pondérés (`billed_revenue`, `gross_margin_pct`, `net_recruitments`, `new_client_logos`), `weight_pct` |

Vues associées : `v_commercial_performance_monthly` (réalisé vs objectif par mois, productivité baseline dérivée de `pnl_monthly`×`workforce_monthly_snapshots`), `v_performance_criteria_compensation` (montant variable alloué par critère).

#### Domaine Veille
| Table | Rows | Description |
|---|---|---|
| `veille_articles` | 10 | Articles de veille sectorielle/actualité (migration `veille_actualite`) |
| `veille_digests` | 2 | Digests groupant des articles |

#### Domaine Notifications & Weekly Brief
| Table | Rows | Description |
|---|---|---|
| `weekly_brief_dismissals` | 0 | Items du brief hebdomadaire explicitement ignorés par un manager (ADR-0010) — append-only, pas de trigger `log_audit` |

### Vues (20)
| Vue | Description |
|---|---|
| `v_active_account_signals` (`security_invoker`) | Défense SQL de la file à traiter : exclut `archived`/`dismissed` et tout `detected_at < CURRENT_TIMESTAMP - INTERVAL '2 months'` |
| `v_ai_intelligence_summary` (`security_invoker`) | Par compte, présence par phase + **fallbacks FOLIO** (`has_legacy_analysis`/`sector`/`pitches`), dernier run, compteurs. **Migration 060** : 2 agrégats latéraux au lieu d'un produit cartésien runs × résultats ; drapeaux FOLIO lus sur les colonnes générées `companies.meta_has_*`. **Migrations 20260818101855 + 110944 (garde M-4)** : ses DEUX latérales excluent `run_type LIKE 'mission:%'` — sans quoi une mission ouverte depuis un compte, qui écrit `phase = 1`, ferait passer `has_client_analysis` à `true` sur un compte jamais analysé |
| `v_crm_account_list` (`security_invoker`) | Vue consolidée fiche compte — contacts, `has_study`, `has_dedicated_watch`, `has_client_analysis`/`sector_analysis`/`process_diagnostic`/`roadmap`, `has_account_issues`, `has_commercial_strategy`. Source de la liste comptes `/prospection`. **Migration 060** : lit `companies.meta_*` au lieu de dérefencer `metadata` 6 fois par ligne |
| `v_collaborator_activity_summary` (migration 025) | 1 ligne par collaborateur × mois — activité (business/billable/pto/sick/non_billable), finance (revenue, employer_cost, real_margin, real_margin_pct), marge théorique |
| `v_collaborator_ytd_activity` (migration 025) | Taux d'activité YTD pondéré (pas moyenne des %), gap vs TACI cible, finance YTD |
| `v_profitability_alerts` (migration 025) | Flags booléens : `alert_low_activity` (<70%), `alert_low_margin` (<15%), `alert_negative_margin`, `alert_high_sick_days` (≥5j), `alert_cra_not_validated` |
| `account_score_current` | Dernier run de score par compte (`DISTINCT ON`), source de vérité du score courant |
| `v_ai_run_costs` | Coût/durée/tokens agrégés par run — coût `NULL` explicite si un seul résultat a un trou de données (pas de sous-estimation silencieuse) |
| `v_ai_result_costs` | Coût par résultat/phase — distingue `tokens_missing` de `pricing_missing` |
| `v_ai_cost_timeline` | Coût agrégé par jour × workflow × owner |
| `v_workflow_health` | Taux succès 30j, p50/p95 de durée, runs bloqués (`stuck_running_now`/`stuck_queued_now`) |
| `v_workflow_cost_stats` | Stats coût par workflow (30j vs all-time) |
| `v_mission_quarterly_revenue` | CA/coût/marge trimestriel par mission (dérivé des CRA) |
| `v_financial_model_activity_rates` | Taux d'activité historique année en cours par collaborateur (moteur financial modeling) |
| `v_financial_model_collaborator_costs` | Coût employeur courant par collaborateur (rémunération en vigueur) |
| `v_financial_model_pricing_anchors` | Ancrages tarifaires (agreement/mission/opportunity) consommés par le moteur de simulation |
| `v_commercial_performance_monthly` | Réalisé vs objectif par mois et par plan de performance |
| `v_performance_criteria_compensation` | Montant variable alloué par critère de performance |
| `v_sector_knowledge_resolved` (`security_invoker`) | **Lot 0 + L1 ADR-0021** — 1 ligne par fiche `sector_intelligence` de niveau `segment`, champs scalaires / `playbook` / `practices_fit` résolus par **substitution** champ par champ depuis le macro parent. `description_level` / `playbook_level` / `practices_fit_level` / `attractiveness_score_level` / `market_size_eur_bn_level` / `market_growth_pct_level` portent la provenance (`segment`, `macro`, `locked` via `resolution_locks`). C'est la **seule** source de la connaissance sectorielle d'un compte |
| `v_sector_knowledge_items` (`security_invoker`) | **Lot 0** — 1 ligne par item (`regulatory` / `pain_point` / `event` / `news`) visible depuis un segment, par **UNION** segment + macro (jamais substitution : deux faits distincts). `resolved_level` porte la provenance |

### Triggers actifs
| Trigger | Tables |
|---|---|
| `set_updated_at` | workspaces, profiles, tasks, companies, persons, contacts, collaborators, candidates, opportunities, opportunity_candidates, missions, mission_activity_reports, collaborator_compensation, **pnl_monthly**, **collaborator_absences**, **client_closures** |
| `log_audit` | companies, persons, contacts, collaborators, candidates, opportunities, opportunity_candidates, collaborator_compensation, **pnl_monthly**, **collaborator_absences**, **client_closures** |

> ⚠️ `missions` et `mission_activity_reports` n'ont **pas** de trigger `log_audit` actuellement.

### RLS — motif uniforme
Toutes les tables sauf `workspaces` et `profiles` : 4 policies (SELECT/INSERT/UPDATE/DELETE).
- SELECT/UPDATE/DELETE : `workspace_id = current_workspace_id()`
- INSERT : sans check (le DEFAULT `current_workspace_id()` garantit l'isolation)

> 🔒 **Exception confidentielle :** `collaborator_compensation` ajoute `AND is_workspace_admin()` sur les 4 policies (rémunération réservée owner/admin).

---

## Modèle relationnel — le pivot

```
companies ──< opportunities >── opportunity_skills
                  │  │  │            (→ skills)
    contacts ─────┘  │  └── opportunity_contacts (→ contacts)
  (via N:N)          │
                     └── opportunity_candidates (→ candidates)
                     └── match_scores (→ persons)
                     └── missions (→ collaborators, companies)
                              └── mission_activity_reports
```

`persons` est le party model central : une personne peut être `contact`, `collaborator` ET `candidate` simultanément via des tables de rôle séparées.

---

## Règles d'architecture Adaptive Design

> 📘 **Fait autorité : `docs/adr/ADR-0006-strategie-device-adaptive-cible.md` (Accepté).**
> Il **amende** la règle d'or fondatrice de ce fichier, qui imposait un adaptive strict sur
> *chaque* écran. La version stricte est morte : elle coûtait 2× par écran et cassait le cache CDN.

Kredo = 50 % desktop / 50 % mobile. L'**intention UX** est conservée
(*Desktop = Analyse dense / Mobile = Action synthétique*) ; c'est le **mécanisme** qui a changé.

| Type d'écran | Approche |
|---|---|
| Dashboards, cockpit, pipeline, planning (~3-5 écrans denses) | **Adaptive plein** — `DesktopView.tsx` / `MobileView.tsx` séparés |
| CRUD, fiches, formulaires, listes simples (~80 % du reste) | **Responsive CSS** (Tailwind `lg:`), un seul arbre |

**Mécanisme, partout :** détection serveur comme *hint de premier paint*, **corrigée côté client
après hydratation**. `Vary: User-Agent` si l'UA serveur est conservé. Un seul point d'entrée
(`getDashboardDevice()`).

**Desktop = Analyse :** tableaux denses (`DataTable<T>` **maison**, `src/components/ui/`), filtres
avancés, arborescences ; graphiques complets en SVG écrit à la main ; sidebar fixe à gauche.

**Mobile = Action :** cartes minimalistes, jauges synthétiques, touch targets > 44 px, graphiques
en HTML+Tailwind pur (divs + `height` en %) — **ZÉRO librairie, et jamais de `DataTable`** ;
bottom navigation bar.

**Pattern quand l'adaptive plein se justifie :**
```
/components/[domaine]/[Feature]/
  index.tsx          ← Server Component : détecte device, distribue
  DesktopView.tsx    ← analyse dense
  MobileView.tsx     ← action synthétique
```
Corollaire non négociable : **ne jamais charger le composant lourd pour le masquer en CSS.**
Quand seule la vue mobile est rendue, ne pas charger non plus ses données (cf. `/missions/opps` :
~10 requêtes → ~3, et la rémunération confidentielle ne transite plus dans le payload RSC).

---

## Design System — palette Cobalt Franc

Variables définies dans `src/app/globals.css` via `@theme` (2 655 lignes).
**LIS globals.css avant de créer quoi que ce soit en CSS/Tailwind.**
Design : flat, minimaliste, premium. Zéro ombre superflue.
Utiliser EXCLUSIVEMENT les variables de couleurs du projet.

**Thème inversé cockpit :** le hub d'intelligence compte tourne en cobalt + or, scopé
`[data-theme="cockpit"]`. L'or n'est jamais utilisé en encre sur fond clair.

**Design systems documentés** — si une demande cite l'un de ces identifiants, lire le fichier
**avant** de toucher à l'UI ; l'identifiant seul vaut instruction :
- `edito_bright_design` → `docs/DESIGN/design-systems/global_design/kredo_actual_design/edito_bright_design.md`
- `cockpit_intelligence_design` → `docs/DESIGN/design-systems/cockpit_intelligence/cockpit_intelligence_design.md` (lire ensuite `edito_bright_design.md`)

---

## Où lire quoi

| Besoin | Fichier |
|---|---|
| Arborescence réelle de `src/` | `src/STRUCTURE.md` |
| Décisions d'architecture | `docs/adr/` (ADR-0001 → 0018 ; **0010 et 0011 manquants**) |
| Conventions de code / DB | `docs/init-projet/CONVENTIONS.md` |
| Journal des décisions | `docs/init-projet/DECISIONS_LOG.md` |
| Historique des sessions | `docs/JOURNAL-SESSIONS.md` |
| Audit de performance | `docs/audits/AUDIT-PERFORMANCE-KREDO.md` |
| Workflows n8n (JSON + SETUP) | `n8n/workflows/` |
| **Production de la connaissance commerciale** | **`docs/MASTER-STUDY/`** — source unique |
| **Missions d'intelligence** (moteur déclaratif ADR-0020) | **`docs/FEATURES/intelligence_missions/07-HANDOFF-L6-RENTABILITE-PORTEFEUILLE.md`** — point de reprise autoportant, à lire AVANT l'ADR. Les handoffs `05` et `06` sont de l'historique |
| Étude sectorielle (matière brute, archives) | `docs/FEATURES/sector_intelligence/` |

> 🔴 **`docs/MASTER-STUDY/` fait autorité sur tout ce qui concerne la production de
> connaissance commerciale** : taxonomie, corpus de sources, étude sectorielle, cartographie
> concurrentielle, chaîne de valeur, gates et ingestion. Les documents de
> `docs/FEATURES/sector_intelligence/` portent chacun un bandeau de statut — **PÉRIMÉ**,
> **ARCHIVE** ou **NORMATIF DÉLÉGUÉ** — fixé par `docs/MASTER-STUDY/README.md` §5.
> Ne jamais appliquer un document marqué PÉRIMÉ, quel que soit son air d'autorité.
>
> 🔴 **Le corpus a tourné une fois (13/08/2026) et le run est rejeté : trois défauts de
> contrat bloquent tout run futur, sur n'importe quel segment.** Point de reprise autoportant,
> à lire avant de relancer quoi que ce soit sur le sujet :
> `docs/MASTER-STUDY/registre/ROADMAP-CORRECTIONS.md`.

> ⚠️ **`docs/` a été réorganisé en août 2026 et la réorganisation n'est pas commitée.** Toute
> référence à `docs/CONVENTIONS.md`, `docs/ARCHITECTURE.md`, `docs/design-systems/…` trouvée
> ailleurs dans le repo pointe vers l'ancienne arborescence. Chercher avec `find docs -name`.

### Trois emplacements pour le code applicatif
- **`src/app/`** — routes App Router. `(app)/` = pages protégées sous `AppShell`, `(dev)/` = bancs de test hors navigation, `api/` = routes API (dont `api/n8n/trigger` et `api/n8n/callback`).
- **`src/lib/[domaine]/`** — data layer + logique métier par domaine (~30 domaines : `account-scoring`, `staffing-matching`, `intelligence`, `n8n`, `automations`…). C'est ici que vivent les Server Actions et les loaders Supabase.
- **`src/features/[domaine]/`** — **convention plus récente**, verticale complète (`data/`, `domain/`, `actions/`, `components/`, `__tests__/`) : `business-intelligence`, `financial-modeling`, `knowledge-hub`, `strategic-audits`, `commercial-activity`, `automation-metrics`, `legacy`. Pour un nouveau domaine, préférer ce patron à `lib/` + `components/`.

---

## Variables d'environnement

`.env.example` fait foi. Résumé :

```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY   # publiques
SUPABASE_SERVICE_ROLE_KEY                                  # secret — JAMAIS de préfixe NEXT_PUBLIC_
N8N_WEBHOOK_BASE_URL / N8N_WEBHOOK_SECRET / N8N_CRON_SECRET # déclenchement + HMAC
N8N_API_URL / N8N_API_KEY                                  # lecture seule, pour npm run n8n:status
NEXT_PUBLIC_N8N_BASE_URL                                   # URL publique, lien "Ouvrir dans n8n"
NEXT_PUBLIC_GLOBAL_WATCH_WORKFLOW_ID                       # id du workflow de veille globale
```

Toute nouvelle variable doit être posée **aussi sur Vercel** (prod + preview), pas seulement dans
`.env.local` — c'est le mode d'échec le plus courant du projet.

---

## Recettes par type de tâche

### Nouvelle page
1. Lire `src/app/globals.css` (variables couleurs) et `src/STRUCTURE.md`
2. Trancher adaptive plein vs responsive CSS selon ADR-0006 (§ Adaptive Design) — par défaut, **responsive**
3. Si adaptive : `index.tsx` Server Component qui distribue `DesktopView.tsx` / `MobileView.tsx`, et **ne charger que les données de la vue rendue**
4. Requête Supabase uniquement côté serveur — ne jamais exposer la service_role key
5. `import "server-only"` sur tout module important le client Supabase serveur, puis `npm run check:server-boundary`

### Nouvelle migration DB
1. Vérifier `docs/init-projet/CONVENTIONS.md` pour les contraintes (uuid, numeric, timestamptz…)
2. **Lire le schéma réel à la source** (`information_schema`, corps des fonctions) — ne jamais se fier au tableau de ce fichier pour écrire du DDL
3. Créer `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
4. Dry-run en transaction `ROLLBACK` avant d'appliquer, quand la migration touche des données
5. Ne JAMAIS modifier une migration déjà appliquée — en créer une nouvelle
6. **Aligner le nom du fichier local sur le timestamp réellement enregistré** dans `schema_migrations` (piège rencontré 3 fois : le fichier local dérive du remote dès la création)
7. `npm run db:types` puis mettre à jour la section **Supabase — état de la base** de ce fichier
8. Consigner dans `docs/init-projet/DECISIONS_LOG.md` si c'est un choix structurel

### Nouveau workflow n8n
Les workflows vivent en JSON versionné dans `n8n/workflows/` avec un `.SETUP.md` par workflow.
**Import et activation sur le VPS sont manuels, faits par Guillaume** — le MCP n8n est bloqué en
session agent. Générer/patcher le JSON par script Python plutôt qu'à la main (échappement),
valider la syntaxe des nœuds `code` (`node --check`) **et** leur exécution réelle via un harnais
Node avec mocks, puis cross-checker que le `contentJson` produit correspond aux clés attendues
côté TypeScript. Terminer par `npm run n8n:status` pour mesurer la dérive repo ↔ VPS.

### Nouveau composant financier
- `tjm`, `cjm`, `gross_margin_pct` viennent toujours de la base (`gross_margin_pct` et `cjm` de `collaborator_compensation` sont générés)
- Ne jamais recalculer la marge côté front — lire `missions.gross_margin_pct` directement
- Les snapshots financiers sont dans `mission_activity_reports` (tjm_snapshot, cjm_snapshot)

### Debug / correction
1. Lire les fichiers concernés AVANT de proposer quoi que ce soit
2. Identifier la cause racine, ne pas patcher le symptôme
3. Vérifier que la correction ne casse pas le RLS workspace

---

## État du chantier

### Journal des sessions
L'historique détaillé (Sessions 6 → 48, juin → août 2026 : décisions, pièges rencontrés,
lots livrés, ce qui reste non fait) vit dans **`docs/JOURNAL-SESSIONS.md`**.
Il pesait 164 Ko sur les 197 Ko de ce fichier — chargé à chaque session pour de l'historique
rarement consulté. **Le `grep`, ne le lis pas en entier** : cherche par nom de fichier, table,
workflow n8n ou numéro d'ADR.

**À la fin d'une session significative, ajouter l'entrée en tête de `docs/JOURNAL-SESSIONS.md`**
(pas ici), et ne remonter dans CLAUDE.md que ce qui devient une règle durable ou change l'état
de la base.

### Chantiers en cours (au 2026-08-10)

| Chantier | État | Où |
|---|---|---|
| **ADR-0020 — Missions d'intelligence** (moteur déclaratif : le métier IA en TypeScript, n8n en exécuteur sans métier) | **L0 → L5 livrés et prouvés (2026-08-20)** — contrats, catalogue, garde M-4, 3 providers de corpus, budget déterministe, résolveur, branche `missionSlug` dans `/api/n8n/trigger`, workflow générique `mission-001-run`, callback validé (`MissionReportV1`, `resultType`/`phase` imposés, enum `mission_report`), **composeur UX L4** (commit `08482338`) et **pilote L5 validé en production** (run `581e4732…`). Catalogue = **1 mission**. **Prochain : L6** — mission `rentabilite-portefeuille`, cadrée, à implémenter. Elle ne demande **ni JSON n8n ni import VPS** : `mission-001-run.json` ne porte aucune référence à la veille | `docs/FEATURES/intelligence_missions/07-HANDOFF-L6-RENTABILITE-PORTEFEUILLE.md` — **autoportant, commencer par le §2** |
| **ADR-0018 — refonte shell navigation desktop** (rail de section, 12 modules) | Proposé, en cours | `docs/adr/ADR-0018-*.md` + ledger `docs/FEATURES/dynamic_content_generator(redaction assistee)/SHELL-0018-implementation-ledger.md` — **commencer par le ledger** |
| **Taxonomie sectorielle + classification comptes** | Figé en migration (commit `a0338ab9`) | 98/98 comptes classifiés, 53 fiches `sector_intelligence` (15 macro + 38 segment) |
| **Connaissance & intelligence sectorielle** | **Lot 0 livré (2026-08-12)** — lecture à la maille segment avec héritage macro | `docs/FEATURES/sector_intelligence/HANDOFF-LOT0-RESOLUTION-SECTORIELLE.md` + `ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md`. Reste Lots 1-9. **Hors périmètre du Lot 0, à trancher** : `/prospection/approche-sectorielle` (`build-sector-activation-model.ts`) reste groupé au macro |
| **Chaîne de valeur** (BTP en pilote) | Socle livré | tables `value_chain_nodes/actors/links` |
| **Matching CV** (ADR non écrit) | Lots 0-1 livrés (moteur + UI) | `src/lib/staffing-matching/` — reste narratif LLM, ingestion CV, embeddings |
| **Audit de performance** | Lots 0-1-5 livrés | `docs/audits/AUDIT-PERFORMANCE-KREDO.md` — reste Lot 4 (bundle client) et Lot 6 (mesure terrain) |
| **Workflows n8n patchés non réimportés** | Bloquant côté VPS | 11 workflows portent `n8nExecutionId` depuis la Session 28 mais ne tournent pas encore : le lien « Ouvrir dans n8n » de `/automations` reste muet. **+ `intel-010-refresh`** (Session 34, ADR-0019 Lot 4) : sans réimport, le bloc de classification n'est jamais produit. ⚠️ `n8n:status` ne voit pas cette dérive — il compare les *compteurs de nœuds*, or seul du code interne a changé |

### Dettes connues, non traitées
- ~~`check:server-boundary` échoue sur `get-kredo-expertise-snapshot.ts`~~ — **vérifié vert le 2026-08-12**, dette résorbée.
- ESLint `react/no-unescaped-entities` dans `src/components/automations/VeilleSimulatorCard.tsx:43`.
- **ADR-0010 et ADR-0011 sont cités partout mais n'ont pas de fichier** dans `docs/adr/` — la seule trace de leurs décisions est le journal de sessions.
- La réorganisation de `docs/` (2026-08) n'est pas commitée : `git status` affiche 145 fichiers supprimés + 9 dossiers non suivis. Ce sont des **déplacements**, pas des pertes.
- `README 2.md` à la racine : doublon de `README.md`, à supprimer.

---

## Méthode de travail attendue

1. **Lire les fichiers concernés AVANT d'écrire quoi que ce soit.** Ne jamais qualifier quelque chose de factice, absent ou cassé sans avoir ouvert le fichier et suivi ses imports.
2. **Vérifier à la source, pas dans ce document.** Ce fichier dérive ; la base, le code et `git` font foi. Tout chiffre lu ici (lignes, comptes, tables) est un instantané.
3. Annoncer ce que tu vas faire et POURQUOI, puis exécuter.
4. **Trancher et assumer** plutôt que présenter un menu d'options — et ne pas pivoter en cours de route.
5. Pour chaque composant : préciser Data / Vue Desktop / Vue Mobile.
6. Signaler tout écart avec la stack ou les règles ci-dessus, même quand la demande l'implique.
7. Valider dans l'ordre : `typecheck` → `test` → `check:server-boundary` → `lint` → `build`. Rapporter les résultats réels, échecs compris.
8. **La QA visuelle est faite par Guillaume**, sauf s'il donne explicitement la main sur un navigateur. Ne pas ouvrir Chrome de sa propre initiative.
9. En fin de session significative : entrée en tête de `docs/JOURNAL-SESSIONS.md` ; ne remonter ici que les règles durables et l'état de la base.

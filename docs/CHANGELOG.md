# Changelog

> Une ligne par action concrète, datée. Format inspiré de *Keep a Changelog*.

## [Non publié]

### 2026-06-11
- **UI (Lot 2)** : `CompanyIdentityDrawer` enrichi — 6ème onglet "Pitchs" (objet, destinataire, ton, points clés, corps avec bouton Copier), section "Étude Sectorielle IA" dans l'onglet Marché (synthèse, volume, segments, acteurs, concurrence, normatif), badge IA vert sur données Phase 2, empty states pour données non encore générées. Score IA corrigé `/5` → `/10`. Types `SectorAnalysisData` + `PitchData` ajoutés.

### 2026-06-10
- **Base de données (Lot 1)** : migration `006_ai_intelligence` appliquée — 3 tables (`ai_intelligence_runs/results/logs`), 2 enums, 10 policies RLS, 17 index dont GIN JSONB + partiel erreurs, 2 triggers `updated_at`, vue `v_ai_intelligence_summary` security_invoker, contrainte `UNIQUE(run_id,phase)`. Types TypeScript régénérés (`src/types/database.ts`).
- **Base de données (Lot 0.5)** : backfill ETL FOLIO agent → KREDO — 84 comptes enrichis (81 études sectorielles + 38 pitchs) dans `companies.metadata`. Script idempotent `scripts/backfill-folio-intelligence.py`.
- **Sécurité (Lot 0)** : rotation clé Anthropic (`…RAAA` révoquée), credential n8n `Anthropic real API` créé, nœud `LLM enrichissement client` migré de clé en dur vers credential, fichiers `ba-phase1-webhook*.json` supprimés du repo FOLIO + historique Git purgé (356 commits réécrits, force push toutes branches).
- **Décision** : ADR-0007 — moteur d'intelligence commerciale internalisé (D-12). Audit critique de la proposition FOLIO→KREDO, vérifié contre la base live : 3 tables `ai_intelligence_*` (vs 5), `content_json` source unique, statut unifié, scoring déterministe 1–10, orchestration hybride durcie (callback HMAC/idempotent/service-role, `workspace_id` explicite), vue `security_invoker`, lot de backfill ETL FOLIO ajouté. Périmètre V1 = Lots 0→5.
- **Pilotage** : refonte de `docs/ROADMAP.md` (Now/Next/Later + phases + risques + capacité) après audit complet du codebase. Création de `docs/BACKLOG.md` (tickets K-001→K-092).
- **Décision** : ADR-0006 — stratégie device « adaptive ciblé + responsive par défaut » (D-11). Assouplit la règle stricte de CLAUDE.md/ARCHITECTURE.md §5.
- **Base de données (R1/K-001)** : résolution du drift schéma. `supabase/migrations/004_baseline_canonical.sql` générée par introspection du schéma live (20 tables canoniques, 73 policies RLS, 116 contraintes, 36 index, 16+1 triggers, 4 fonctions, vue `v_mission_quarterly_revenue`). Parité vérifiée objet par objet. Migrations 001-003 marquées historiques (`supabase/migrations/README.md`). Base confirmée `ACTIVE_HEALTHY`.

### 2026-06-09
- **Base de données** : projet Supabase dédié `Kredo_Sales_App` créé (ref `jvzgmhvwirsbdkjpmvla`).
- **Migration 001** appliquée : module Opportunité — 6 tables (`crm_accounts`, `crm_contacts`, `sales_opportunities`, `sales_opportunity_skills`, `sales_opportunity_contacts`, `sales_opportunity_events`), 5 types énumérés, colonne générée `weighted_gain`, trigger `set_updated_at()`, RLS activé sur les 6 tables (politique `owner_all`).
- **Vérification** : 6 tables confirmées, RLS actif, clés étrangères câblées.
- **Dépôt** : structure de travail initialisée (README, docs, ADR, migrations, squelette `src/`).
- **Types TypeScript** générés depuis le schéma live → `src/types/database.ts` (+ raccourcis : `Opportunity`, `Account`, `SalesStage`…).
- **Clients Supabase typés** : `createBrowserClient<Database>` / `createServerClient<Database>`.
- **Architecture de Dashboard** : 
  - Création des types principaux (`src/lib/dashboard/dashboard-types.ts`) et de détection de device serveur (`src/lib/dashboard/dashboard-device.ts`).
  - Développement des widgets réutilisables (`MetricCard`, `AlertCard`, `PriorityCard`, `AiSummaryCard`, `SyncStatusBadge`, `EmptyState`).
  - Développement des sections de mise en page (`DashboardHeader`, `DashboardKpiGrid`, `DashboardMainPanel`, `DashboardPriorityPanel`, `DashboardTablePanel`, `DashboardAiPanel`, `DashboardActivityFeed`, `DashboardQuickActions`) avec visualisations HTML/Tailwind personnalisées sans dépendances.
  - Implémentation des templates adaptatifs `SectionDashboardTemplate`, `SectionDesktopDashboard` et `SectionMobileDashboard`.
- **Navigation & App Shell** :
  - Création de la configuration de navigation centralisée (`src/lib/navigation/main-menu.config.ts`).
  - Développement de l'App Shell distribuant dynamiquement l'affichage selon le support (Sidebar + Header sur Desktop, Bottom navigation sur Mobile).
  - Création des pages pour les 7 modules actifs : `/cockpit`, `/sales`, `/prospection`, `/proposals`, `/finance`, `/knowledge`, `/automations` dans le groupe de routes `(app)`.
  - Intégration d'un module d'icônes SVG centralisé (`src/components/layout/navigation-icons.tsx`).
  - Amélioration de l'accessibilité par l'ajout conditionnel de l'attribut `aria-current="page"` sur les liens actifs de navigation.


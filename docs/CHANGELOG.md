# Changelog

> Une ligne par action concrète, datée. Format inspiré de *Keep a Changelog*.

## [Non publié]

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


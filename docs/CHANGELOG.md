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

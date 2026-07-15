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

- **Front-end** : Next.js 16 (App Router), React 19, Server Components, API routes → Vercel
- **Styling** : Tailwind CSS v4 (directive `@theme` dans globals.css, **SANS** tailwind.config.*)
- **Design** : palette "Cobalt Franc" définie dans globals.css — lire ce fichier avant tout CSS
- **UI components** : composants **maison** sur primitives `<dialog>` natives (`AppDrawer`, `AppDialog`, `SurfaceCard`, `ReadyActionButton`…) + utilitaires Tailwind v4. **PAS de shadcn/Radix** (aucune dépendance installée) — ne pas faire `npx shadcn add`, étendre les primitives existantes
- **Base de données** : Supabase (PostgreSQL, RLS actif, pgvector prévu phase 3)
- **Auth** : Supabase Auth + `@supabase/ssr` (App Router)
- **Async/IA** : n8n self-hosted sur VPS, déclenché via webhooks Supabase ou API routes

**Interdictions fermes :**
- PAS de recharts, chart.js, react-chartjs-2, Tremor
- PAS de tailwind.config.* (Tailwind v4 = @theme uniquement)
- PAS de graceful degradation CSS (charger lourd + cacher sur mobile)

---

## Supabase — état de la base

**Projet ID :** `jvzgmhvwirsbdkjpmvla`
**URL :** `https://jvzgmhvwirsbdkjpmvla.supabase.co`

### Migrations appliquées (14)
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


### Architecture multi-tenant (ACTIF)

Le projet utilise un modèle **workspace**. Chaque utilisateur appartient à un
workspace. Toutes les tables portent `workspace_id uuid` avec :
- DEFAULT automatique : `current_workspace_id()` — **le front n'a jamais besoin de l'envoyer**
- RLS actif sur 100% des tables, motif standard : `workspace_id = current_workspace_id()`

**Fonctions Postgres (public) :**
- `current_workspace_id()` — security definer, lit `profiles` → renvoie le workspace de l'user connecté
- `is_workspace_admin()` — security definer, TRUE si l'user courant est `owner`/`admin` du workspace ; utilisé par les RLS des données confidentielles (rémunération)
- `handle_new_user()` — trigger auth, crée le profil à l'inscription
- `log_audit()` — trigger AFTER INSERT/UPDATE/DELETE sur les tables auditées
- `set_updated_at()` — trigger BEFORE UPDATE, maintient `updated_at`

### Schéma public — 35 tables + 2 vues
> ⚠️ Migrations en double numérotation : les slots 018/019 sont occupés deux fois (seeds + référentiels). Supabase utilise le timestamp comme clé primaire, pas le nom. Se référer à la liste complète ci-dessus.

#### Domaine Core
| Table | Rows | Description |
|---|---|---|
| `workspaces` | 1 | Tenant racine (id, name, owner_id, settings JSONB) |
| `profiles` | 1 | Étend auth.users (id, workspace_id, full_name, email, role, ui_prefs) |
| `audit_log` | ~1426 | Traçabilité auto — lecture seule côté client |
| `tasks` | 0 | Actions transverses polymorphes (entity_type / entity_id) |

`profiles.role` valeurs : `owner` · `admin` · `sales` · `recruiter` · `viewer`

#### Domaine CRM & Humain
| Table | Rows | Description |
|---|---|---|
| `companies` | 96 | Comptes (lifecycle_status, priority, tags[], metadata JSONB) |
| `persons` | 659 | Party model — `full_name` est une **colonne générée** (TRIM first+last) |
| `contacts` | 643 | Person dans son rôle chez un compte (relationship_role, decision_power) |
| `collaborators` | 16 | Person dans son rôle consultant interne (status ; rémunération/coût → `collaborator_compensation`) |
| `candidates` | 0 | Person dans son rôle recrutement (status, expected_daily_rate) |
| `company_relationships` | 0 | Arêtes organigramme client (reporte_a, influence, collabore_avec) |
| `skills` | 20 | Référentiel contrôlé (name canonique + aliases[], category) |
| `person_skills` | 0 | Compétences (level 1-5, years, confidence 0-1, source) |

`companies.lifecycle_status` : `cible` · `prospect` · `client_actif` · `client_dormant` · `ancien_client` · `partenaire` · `non_prioritaire` · `exclu`

`contacts.relationship_role` : `decideur` · `prescripteur` · `acheteur` · `operationnel` · `sponsor` · `utilisateur_final` · `rh` · `manager_technique` · `dsi` · `direction_metier`

`skills.category` : `langage` · `framework` · `cloud` · `data` · `devops` · `methode` · `fonctionnel` · `secteur` · `soft_skill` · `langue` · `certification`

#### Domaine Sales
| Table | Rows | Description |
|---|---|---|
| `opportunities` | 9 | Pipe commercial — pivot central de l'app |
| `opportunity_skills` | 20 | Besoins compétences côté demande (importance, min_level, weight) |
| `opportunity_contacts` | 0 | Interlocuteurs décideurs par opportunité (role) |
| `opportunity_candidates` | 0 | Pipeline présentation profils (status de présentation) |
| `interactions` | 0 | Historique relationnel fusionné (type, sentiment, occurred_at) |
| `match_scores` | 0 | Résultats matching IA (overall_score, scores JSONB, model_version) |

**`opportunities.stage` — valeurs CANONIQUES à utiliser :**
`detection` · `qualification` · `besoin_confirme` · `recherche_profil` · `cv_envoyes` · `entretien_client` · `negociation` · `gagne` · `perdu` · `abandonne`

⚠️ **Valeurs legacy présentes en base mais à NE PAS réutiliser :**
`en_cours` · `cv_sent` · `rt` · `win` · `lost` · `non_traitee`

**Colonnes générées sur `opportunities` :**
- `weighted_gain` = `estimated_gain * conviction / 100`
- `acv` = `duration_days * target_daily_rate`

`opportunities.opportunity_type` : `regie` · `forfait` · `centre_de_service` · `conseil` · `audit` · `staffing` · `extension` · `renouvellement` · `upsell` · `cross_sell`

#### Domaine Intelligence sectorielle
| Table | Rows | Description |
|---|---|---|
| `sector_intelligence` | 0 | Référentiel sectoriel (name, slug, attractiveness_score, market_size_eur_bn, practices_fit JSONB, playbook JSONB) — UNIQUE(workspace_id, slug) |
| `sector_news` | 0 | Actualités par secteur (published_at, relevance_score, is_trigger_event, tags[]) |
| `sector_events` | 0 | Événements commerciaux (event_type, event_date, commercial_opportunity) |
| `sector_pain_points` | 0 | Points de douleur consolidés (frequency_count, source_company_ids uuid[]) |
| `sector_regulatory_items` | 0 | Réglementations (urgency, deadline_date, is_commercial_window) |

⚠️ **RLS sector tables** : policy unique `workspace_isolation FOR ALL` (pas le motif 4-policies standard). Toutes FK vers `sector_intelligence.id`. Triggers `trg_*_updated_at` uniquement (pas de log_audit).

#### Domaine Intelligence commerciale (ADR-0007 / ADR-0008)
| Table | Rows | Description |
|---|---|---|
| `ai_intelligence_runs` | — | Une exécution d'analyse / compte (cycle de vie, `current_phase`, coûts/tokens, `input_snapshot`) |
| `ai_intelligence_results` | — | Un résultat **par phase** (`UNIQUE(run_id,phase)`, phase 1–10) — **`content_json` = source unique** (pas de html) |
| `ai_intelligence_logs` | — | Append-only (coûts, erreurs, retries) — pas de policy update/delete client |
| `intelligence_documents` | 0 | Couche documentaire exploitable — distincte de ai_intelligence_results |
| `intelligence_document_versions` | 0 | Historique append-only des versions d'un document |
| `intelligence_document_links` | 0 | Relation N:M polymorphe entre un document et les entités métier Kredo |


**Vue `v_ai_intelligence_summary`** (`security_invoker`) : par compte, présence par phase + **fallbacks FOLIO** (`has_legacy_analysis`/`sector`/`pitches` sur `companies.metadata`), dernier run, compteurs.

**Phases** : `1=analyse client · 2=sectorielle (rattachée au SECTEUR, mutualisée) · 3=diagnostic process · 4=roadmap · 5=pitch` (ordre d'impl. `1→2→4→5→3`). `ai_run_status`/`ai_result_status` : `queued · running · succeeded · failed · cancelled` + `needs_review` **orthogonal**. Scoring = **fonction déterministe versionnée 1–10** (le LLM note des facettes, KREDO calcule).

**Surface (ADR-0008)** : Hub `/prospection/accounts/[companyId]` (`index/DesktopView/MobileView`) lit `content_json` + fallback `companies.metadata` ; drawer `CompanyIdentityDrawer` = Quick View. Référentiel `offers` (lot B) à venir. ⚠️ Échelle score à trancher : 1–10 (ADR-0007) vs `/5` (UI actuelle).

#### Domaine Delivery / Finance
| Table | Rows | Description |
|---|---|---|
| `missions` | 19 | Contrats actifs (tjm, **cjm**, gross_margin_pct GÉNÉRÉ) |
| `mission_activity_reports` | 89 | CRA par période (billable_days, tjm_snapshot, **cjm_snapshot**) |
| `collaborator_compensation` | 19 | **Rémunération datée confidentielle** (RLS owner/admin) — source du CJM |
| `collaborator_absences` | 56 | Absences datées (type enum, start/end, duration_days) — source du planning congés |
| `client_closures` | 6 | Fermetures de sites clients (company_id, dates, is_recurring) |
| `pnl_monthly` | 12 | P&L mensuel consolidé — inputs stockés, dérivés GENERATED ; `source` ∈ `import/cra_derived/budget/forecast` |

**`pnl_monthly`** — colonnes GENERATED : `gross_margin_value`, `gross_margin_percent`, `operating_profit_value`, `operating_profit_percent`. Ne jamais recalculer côté front. Seed fictif couvre 2025-06 → 2026-05. UNIQUE(workspace_id, period_month).

> Chemin d'évolution : quand les CRA couvriront 12 mois complets, les lignes récentes pourront être remplacées par `source='cra_derived'` via une vue ou un job n8n.

**`missions.gross_margin_pct`** = `ROUND((tjm - cjm) / NULLIF(tjm, 0) * 100, 2)` — colonne générée, ne jamais recalculer côté front.

> ⚠️ **Vocabulaire finance (corrigé) — ne plus jamais confondre :**
> - **TJM** = Taux Journalier Moyen (vendu au client).
> - **CJM** = Coût Journalier Moyen (coût interne chargé). C'est l'ex-`taci` renommé partout (migration 017).
> - **TACI** = **Taux d'Activité Congés Inclus** — un **TAUX (0–1)**, PAS un coût. Porté par `collaborator_compensation.taci`, il pondère les jours ouvrés → jours facturables → alimente le CJM.
> - **Marge brute** = (TJM − CJM) / TJM.

**`collaborator_compensation`** (effective-dated) : `gross_annual`, `charges_rate` (déf. 0.45), `working_days_per_year` (déf. 218), `taci` (taux 0–1), `cjm` **GÉNÉRÉ** = `round(gross_annual*(1+charges_rate)/(working_days_per_year*taci), 2)`. Une seule ligne en vigueur (`effective_to IS NULL`) par collaborateur. **RLS confidentielle** : `workspace_id = current_workspace_id() AND is_workspace_admin()` (≠ motif uniforme).

`missions.status` : `active` · `paused` · `ended` · `cancelled`

`mission_activity_reports.status` : `draft` · `submitted` · `validated` · `rejected`

**`collaborator_absences`** : type enum `absence_type` = `conge_paye` · `rtt` · `maladie` · `sans_solde` · `contrainte_perso` · `formation` · `fermeture_client` · `autre`. Champs : `start_date`, `end_date`, `duration_days` (numeric 4,1). CHECK `end_date >= start_date` et `duration_days > 0`. RLS workspace standard.

**`client_closures`** : fermetures de sites clients rattachées à `companies.id`. Champs : `start_date`, `end_date`, `label`, `is_recurring`. RLS workspace standard.

**Vues analytiques (migration 025, `security_invoker`) :**
- **`v_collaborator_activity_summary`** — 1 ligne par collaborateur × mois. Inclut activité (business/billable/pto/sick/non_billable), finance (revenue, employer_cost, real_margin, real_margin_pct), et marge théorique pour comparaison.
- **`v_collaborator_ytd_activity`** — taux d'activité YTD pondéré (pas moyenne des %), gap vs TACI cible, finance YTD (revenue, employer_cost, real_margin).
- **`v_profitability_alerts`** — flags booléens : `alert_low_activity` (<70%), `alert_low_margin` (<15%), `alert_negative_margin`, `alert_high_sick_days` (>=5j), `alert_cra_not_validated`.

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

## Règles d'architecture Adaptive Design (NON NÉGOCIABLES)

Kredo = 50% desktop / 50% mobile.

**Règle d'or :** détecter l'appareil CÔTÉ SERVEUR (headers user-agent dans le
Server Component ou middleware). Distribuer le sous-composant approprié.
**JAMAIS charger le composant lourd et le masquer en CSS.**

**Desktop = Analyse :**
- Tableaux denses (shadcn/ui DataTable), filtres avancés, arborescences
- Graphiques complets (axes, grilles, tooltips) — shadcn/ui charts UNIQUEMENT
- Navigation : Sidebar fixe à gauche

**Mobile = Action :**
- Cartes minimalistes, jauges visuelles synthétiques
- Gros boutons d'action rapide (touch targets > 44px)
- Graphiques : sparklines, jauges pur HTML+Tailwind — ZÉRO librairie
- Navigation : Bottom Navigation Bar

**Pattern de composant systématique :**
```
/components/[domaine]/[Feature]/
  index.tsx          ← Server Component : détecte device, distribue
  DesktopView.tsx    ← analyse dense
  MobileView.tsx     ← action synthétique
```

---

## Design System — palette Cobalt Franc

Variables définies dans `globals.css` via `@theme`.
**LIS globals.css avant de créer quoi que ce soit en CSS/Tailwind.**
Design : flat, minimaliste, premium. Zéro ombre superflue.
Utiliser EXCLUSIVEMENT les variables de couleurs du projet.

---

## Variables d'environnement

```
NEXT_PUBLIC_SUPABASE_URL=https://jvzgmhvwirsbdkjpmvla.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=    ← Settings > API du dashboard
SUPABASE_SERVICE_ROLE_KEY=        ← jamais en variable NEXT_PUBLIC_
```

---

## Recettes par type de tâche

### Nouvelle page
1. Lire `globals.css` (variables couleurs) et la structure `/app` existante
2. Créer `index.tsx` Server Component (détection device côté serveur)
3. Créer `DesktopView.tsx` + `MobileView.tsx`
4. Requête Supabase uniquement côté serveur — ne jamais exposer la service_role key

### Nouvelle migration DB
1. Vérifier `CONVENTIONS.md` pour les contraintes (uuid, numeric, timestamptz, etc.)
2. Créer `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
3. Ne JAMAIS modifier une migration déjà appliquée — créer une nouvelle
4. Mettre à jour `DECISIONS_LOG.md` si c'est un choix structurel
5. Mettre à jour la section **État de la base** dans ce fichier

### Nouveau composant financier
- `tjm`, `cjm`, `gross_margin_pct` viennent toujours de la base (`gross_margin_pct` et `cjm` de `collaborator_compensation` sont générés)
- Ne jamais recalculer la marge côté front — lire `missions.gross_margin_pct` directement
- Les snapshots financiers sont dans `mission_activity_reports` (tjm_snapshot, cjm_snapshot)

### Debug / correction
1. Lire les fichiers concernés AVANT de proposer quoi que ce soit
2. Identifier la cause racine, ne pas patcher le symptôme
3. Vérifier que la correction ne casse pas le RLS workspace

---

## État du codebase — à maintenir à jour

### Front-end (Next.js)
- [ ] Setup clients Supabase (server.ts / client.ts / middleware.ts)
- [ ] Middleware.ts refresh session
- [ ] Types TypeScript générés (`src/types/database.types.ts`)
- [ ] Page /companies
- [ ] Page /opportunities
- [ ] Page /collaborators
- [ ] Page /missions
- [x] Page /prospection/approche-sectorielle (Liste & Détail [slug] avec Skeletons, gestion d'erreurs, playbook mobile drawer et adaptive design)
- [x] Page /ressources/playbook/[slug] (Server Component → PlaybookPage client, PlaybookPanel full-width, liens retour ↔ fiche sectorielle)

### Session 6 — Migration Cockpit vers le Design System (2026-06-16)
- **CockpitDesktopDashboard** : Migré vers `DesktopAnalyticalPage` — 4 `KpiCard`, zone principale 2-col (alertes staffing + goulots d'étranglement), rail `InsightCard` + `AlertBlock`, lowerContent table propositions avec `StatusPill`. `AppDialog` remplace le modal custom.
- **CockpitMobileDashboard** : Migré vers `MobileActionPage` + `MobilePageHeader` + `MobileHeroInsight` (pipeline pondéré Supabase réel) + 3 `MobileActionCard` avec `StatusPill`. `AppDialog` remplace le drawer custom. Labels debug `> 44px` et éléments de shell supprimés.
- **Tokens dataviz** : `bg-dataviz-1/2/3/4` utilisés pour le graphique goulots (cobalt, brass, bleu, vert) — aucun HEX.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · `db:types` idempotent · 0 HEX · 0 shadow · 0 gradient · 0 DataTable Mobile.

### Session 17 — Cockpit Intelligence : contextualisation par page + par entité (2026-07-02)
Suite de la Session 16 (panneau global) : ChatGPT avait défriché une architecture fonctionnelle complète (18 pages, contexte à 3 niveaux, 18 capacités) — analysée, critiquée (sur-ingénierie : `SelectionContext` sans aucune UI de multi-sélection existante, 18 capacités × 7 états combinatoires, "Brief décisionnel" LLM non branchable, tables `account_facts`/`projects`/`financial_models` jugées à tort hallucinées) puis ramenée à un scope exécutable, validé par Guillaume avant implémentation.
- **Correctif factuel en cours de route** : `mcp__supabase__list_tables` a révélé 58 tables live (vs 35 documentées ci-dessus, drift plus large que `project-migration-drift.md`) — `projects`/`project_phases`/`project_team_members` (3/10/9 lignes) sont réelles et déjà consommées par `/missions/projets` (`get-projects-list.ts`) ; `financial_models`/`candidate_hiring_milestones`/`account_facts`/`account_signals` existent aussi mais restent hors scope (branchées uniquement sur la route orpheline `/staffing`, non `account_facts`/`account_signals` vides, ou non consommées côté front pour l'instant).
- **Lot 0-1 — Page-level** (`intelligence-registry.ts` réécrit) : `ROUTE_MAPPINGS` couvre les 13 routes actives réelles de `main-menu.config.ts` (au lieu des anciennes routes génériques/obsolètes) — `/staffing` retiré (route orpheline, plus dans la nav depuis `/missions/opps`), `/prospection/suivi`, `/missions/actives`, `/missions/projets`, `/consultants/suivi-manager` ajoutées avec des actions différenciées par page (ex. `/missions/projets` ≠ `/missions/actives` ≠ `/missions` alors qu'ils retombaient tous sur le même triplet avant). Placeholders (`/knowledge`, `/automations`, `/consultants/suivi-manager`) : aucune action inventée, `/settings` supprime même le socle commun (`suppressCommon`) — pas d'action commerciale générique sur les réglages. "Socle commun" (8 cartes identiques partout) → "Plus d'actions" (4 actions transverses, accordéon `<details>` replié, pattern repris de `CommunicationBriefForm`).
- **Lot 2-3 — Entity-level** : `IntelligenceEntityContext.entityType` élargi de `"company"` à une union à 8 valeurs (`use-intelligence-context.ts`). `resolveEntityActions()`/`ENTITY_TYPE_LABELS` (registry) + nouveau composant `RegisterIntelligenceEntity` (registration légère : entityType/entityId/label, sans le `panelData` riche réservé au mode Compte) + `GenericEntityPanelContent`/`GenericEntityMobileContent` (badge identité + 3-4 actions contextuelles, pas de sections ressources/activité/contacts tant qu'aucune requête dédiée n'est branchée — honnête sur l'état réel du backend, zéro workflow n8n branché hors pitch/compte). Branché sur 4 entités à fort trafic / risque d'intégration faible :
  - `opportunity`/`mission`/`project` via un seul point d'accroche : `MissionsEntityPanel.tsx` (système d'onglets `/missions`, déjà unifié par `TabEntityType`). Piège évité : les onglets sont TOUS montés simultanément (masqués en CSS par `MissionsTabbedShell`) — nouveau prop `isActive` propagé jusqu'à `RegisterIntelligenceEntity` pour qu'un seul onglet inactif ne clobber pas le contexte de l'onglet actif.
  - `collaborator` via `ConsultantDrawer.tsx` (mono-instance, registration gated sur `open && collaboratorId && drawerData`).
  - `contact` via `ContactIdentityDrawer.tsx` (idem, gated sur `person` chargé pour éviter le label "Chargement...").
  - **Non fait** (scope volontairement borné) : `candidate`, `sector`, `calendar_event` — mêmes primitives réutilisables (`RegisterIntelligenceEntity` + entrée dans `ENTITY_ACTION_IDS`), juste pas câblées cette session (respectivement `CandidateDrawer`, `/prospection/approche-sectorielle/[slug]`, `EventDrawer` agenda).
- **Validation** : `tsc --noEmit` → EXIT 0 (après purge d'un `.next/` obsolète qui produisait 2 faux positifs `TS6200`/`TS2300` sans rapport) · `npm run build` → EXIT 0, les 20 routes attendues présentes (dont `/missions/projets`, `/consultants/suivi-manager`) · `eslint` sur les 9 fichiers touchés → 0 erreur (1 warning pré-existant sans rapport dans `ContactIdentityDrawer.tsx`).

### Session 16 — Cockpit Intelligence : panneau global contextuel, Lots 0-4 (2026-07-02)
Refonte validée par ChatGPT + Guillaume : panneau `IntelligencePanel`/`IntelligenceFAB` global unique (plus de `INLINE_INTELLIGENCE_ROUTES` bloquant les fiches comptes), suppression du doublon `IntelligenceRightRail` ("Tour de contrôle") sur la page compte.
- **Lot 0** (Codex, validé) : `account-panel-types.ts`, `intelligence-resource-types.ts` (classification canonique `result_type` → analyses/communications/reports/roadmaps, `phase=4` fallback legacy documenté seulement), `account-panel-data.ts` (`getAccountIntelligencePanelData`, RLS session utilisateur, contacts clés filtrés sur `relationship_role IN (decideur,dsi,direction_metier)` — jamais `decision_power`, volumes bornés 5 opps/5 events/6 contacts/5 runs).
- **Lot 1** : `use-intelligence-context.ts` (store Zustand minimal — seul pont possible entre la page et le panneau, sibling de `<main>` dans `AppShell`, hors React Context) + `RegisterIntelligenceContext` (hydrate/clear au montage/démontage). `IntelligencePanel`/`IntelligenceFAB` réécrits : 4 sections (Actions/Ressources/Activité/Contacts clés) quand `entityContext.entityType === "company"`.
- **Lot 2** : `CrmIdentityDrawerHost` global (`use-crm-drawer.ts`, store Zustand avec navigation retour company↔contact) monté dans `AppLayout`, remplaçant les 4 montages locaux de `CompanyIdentityDrawer`/`ContactIdentityDrawer` (`AccountsContactsViews`, `CockpitMobileDashboard`, `MissionSynthesisTab`, `OpportunityNeedTab`).
- **Lot 3** : navigation interne dans le panneau — clic "Pitch / mail" affiche `PitchMailDrawerContent` (INTEL-020) directement dans le panneau (desktop + FAB mobile) avec retour, sans quitter la page. `PitchMailDrawerContent`/`buildDefaultBrief` découplés de `ClientIntelligenceData` (ne consommaient que `company.{id,name,lifecycleStatus}` + `contacts`) → contrat minimal satisfait aussi bien par la page compte que par `AccountIntelligencePanelData`. Formulaire enveloppé dans `data-theme="cockpit"` pour le rendu cobalt/or.
- **Lot 4** : suppression de `IntelligenceRightRail.tsx` + de la barre "Actions rapides" locale et du drawer pitch/summary/campaign inline sur `ClientIntelligenceDesktopView`/`ClientIntelligenceMobileView` (desktop + mobile), tout redondant avec le panneau global. Les 2 messages de feedback qui vivaient dans le rail supprimé ("Lancement de l'analyse…", "Veille IA…") ont été relogés localement à côté de leurs boutons respectifs pour ne rien perdre.
- **Non fait** : Lot 5 (QA visuelle desktop + mobile) — à faire par Guillaume, pas de Chrome DevTools MCP disponible dans cette session.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 à chaque lot · ESLint propre sur les fichiers touchés (quelques warnings pré-existants sans rapport laissés en l'état : `getSource`/`RefreshIcon`/`SectionBlock`/`SignalList`/`PlusCircleIcon` non utilisés dans les deux vues).
- Merge fast-forward `design/kredo-visual-identity-exploration` → `main` (10 commits, incluant aussi le travail antérieur de la session : design lab identité visuelle, stabilisation INTEL-020) → déployé en production sur Vercel.

### Session 15 — INTEL-020 Rédaction assistée V1 (2026-07-01)
Contrat de référence : `INTEL-020-REDACTION-ASSISTEE-V1.md` (16 sections, 8 scénarios, cadre QUOI/QUI/COMMENT/CONTEXTE). Le document fait foi ; les écarts d'implémentation ci-dessous sont documentés (le document ne connaissait pas encore l'état réel du schéma/code au moment de sa rédaction).

**Lot 0 — Schéma + types :**
- **Migration** (`supabase/migrations/20260701120000_communication_brief_schema.sql`, appliquée live) : `company_id` nullable sur `ai_intelligence_runs`/`ai_intelligence_results` (usages hors compte, V1.5+) ; `primary_entity_type`/`primary_entity_id` + index partiel sur `ai_intelligence_runs` ; `context_snapshot`/`source_refs`/`qa_flags` sur `ai_intelligence_results`. **Écart voulu vs le document** : pas de colonne `brief_json` dédiée — le `CommunicationBrief` est stocké dans `ai_intelligence_runs.input_snapshot` (colonne déjà existante, même rôle).
- **`src/lib/n8n/types.ts`** : `N8nWorkflowId` — `intel-020-pitch-mail` renommé `intel-020-communication`. Nouveau contrat `CommunicationBrief` (what/who/how/context) + `CommunicationOutput` (subjects/body/key_points/source_refs/warnings) + `CommunicationSourceRef`/`CommunicationQaFlag`. `N8nCallbackPayload` étendu avec `contextSnapshot`/`sourceRefs`/`qaFlags`.
- **`src/lib/n8n/runs.ts`** : `saveResult()` persiste les 3 nouvelles colonnes ; `companyId` devenu `string | null`.

**Lot 1 — Workflow n8n (`n8n/workflows/intel-020-communication.json`, 13 nœuds, JSON validé + tout le JS syntax-checké) :**
Webhook → Validate & Extract Brief (vérif HMAC) → Update Run Status → Hydrate Context (Supabase REST) → Resolve Sender Identity → Assemble Prompt (system prompt fixe + 8 templates scénario) → Call LLM (Claude Sonnet, `claude-sonnet-4-6`) → Parse & Validate Output → Quality Check (5 contrôles) → Prepare/Callback. Gestion d'erreur par sortie `onError: continueErrorOutput` sur les nœuds à risque → `Prepare Failure Callback` (au lieu d'un Error Trigger séparé qui perdrait `runId`/`callbackUrl`). Checklist d'import/config VPS : `n8n/workflows/intel-020-communication.SETUP.md`.
**Corrections apportées au document original** (bugs qui auraient cassé le workflow à l'import) : table `engagements` → `missions` (n'existe pas) ; `interactions.date` → `occurred_at` ; `opportunities.status=eq.active` → `stage=not.in.(gagne,perdu,abandonne)` ; callback en camelCase (pas snake_case, pour matcher `N8nCallbackPayload`) ; auth webhook = HMAC-SHA256 `X-KREDO-Signature` (pas un Bearer statique) ; `signalRef` épinglé par UUID abandonné en V1 (aucune table de signaux adressable côté UI — `ClientIntelligenceData.signals` est un `string[]` extrait de JSON) → remplacé par une récupération auto des `sector_news` récentes via `companies.sector_id`.

**Lot 2 — UI (`src/components/accounts-contacts/intelligence/`) :**
- **`communication-brief-options.ts`** (nouveau) : taxonomies V1 (canal/scénario/longueur/rôle émetteur/type-persona-relation destinataire/objectif/ton) + `buildDefaultBrief()` (présélection depuis `company.lifecycleStatus`) + `personaFromRelationshipRole()`.
- **`PillSelect.tsx`** (nouveau) : grille de boutons-pilules single-select générique, exports `ScenarioSelector`/`ToneSelector`.
- **`ContactSelector.tsx`** (nouveau) : wrapper `<Select>` sur `data.contacts`, option "Non spécifié — « Madame, Monsieur »".
- **`CommunicationBriefForm.tsx`** (nouveau) : desktop = 4 accordéons `<details>` QUOI/QUI/COMMENT/CONTEXTE (natif, cohérent avec la philosophie "primitives natives" du design system) ; mobile = 3 champs essentiels (scénario/destinataire/ton) + "Plus d'options" repliée.
- **`CommunicationResult.tsx`** (nouveau) : objet/corps/points clés/sources/warnings, badge qualité (vert si `qaFlags` tous passés, orange sinon avec détail), Copier + **Enregistrer**.
- **`save-communication-interaction.ts`** (nouveau, Server Action) : persiste le résultat dans `interactions` (`type` dérivé du canal/scénario — `envoi_cv` pour `profile_submission`, sinon `email`/`linkedin`/`note` ; `details` JSON avec body/subjects/key_points).
- **`IntelligenceActionDrawers.tsx`** (`PitchMailDrawerContent` refondu) : ancien formulaire `messageType/objective/tone/targetContactId/additionalContext` remplacé par le `CommunicationBrief` complet. Émetteur résolu depuis `profiles.full_name` (pas de colonne `practice` sur `profiles` → practice devient un champ libre optionnel dans QUI). Realtime inchangé (branché sur `ai_intelligence_results`), juste retypé sur `CommunicationOutput`/`qa_flags`.
- **Types legacy retirés** : `PitchMessageType`/`PitchObjective`/`PitchTone`/`PitchDraftFormState`/`buildPitchDraftPayload` supprimés (`intelligence-action-types.ts`/`intelligence-action-utils.ts`) — `SummaryDrawerContent`/`CampaignDrawerContent` non touchés (hors périmètre V1).
- **`docs/client-intelligence-workflows.md`** : section B (`pitch_mail_generation`) marquée obsolète, pointe vers le nouveau contrat.

**Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · `eslint` sur tous les fichiers touchés → 0 erreur, 0 warning.

**Non fait dans cette session** (bloqué sur accès VPS, pas de MCP n8n) : import réel du workflow, configuration des variables d'environnement n8n, test de bout en bout des 8 scénarios avec données réelles, affinage des prompts sur retours qualité — voir checklist dans `n8n/workflows/intel-020-communication.SETUP.md`.

### Session 14 — Fiche Mission : refonte complète architecture + 5 onglets (2026-06-30)
- **Migration 041** (`supabase/migrations/20260630000000_041_calendar_events_mission_id.sql`) : colonne `mission_id uuid NULL REFERENCES missions(id) ON DELETE SET NULL` sur `calendar_events`. Index partiel WHERE mission_id IS NOT NULL. Appliquée live.
- **`database.generated.ts`** : Régénéré depuis Supabase (4681 lignes, `mission_id` dans calendar_events Row/Insert/Update).
- **`mission-detail-types.ts`** (nouveau) : `MissionDetailTabId` (5 valeurs), `MISSION_DETAIL_TABS`, `MissionDetailViewModel` complet avec `MissionSummary`, `MissionCompany`, `MissionCollaborator`, `MissionCollaboratorSkill`, `MissionActivityReport`, `MissionInteraction`, `MissionCompensation`, `MissionContact`. `RiskLevel` + `getRiskFromMetadata()`.
- **`mission-detail-utils.ts`** (nouveau) : Seuils métier centralisés (`ACTIVITY_THRESHOLDS`, `MARGIN_THRESHOLDS`). Fonctions pures : `parseDateOnly`, `getMissionDurationMonths`, `isEndingSoon`, `computeTotalRevenue`, `computeYtdRevenue`, `computeRealMarginPct`, `computeEstimatedContractValue`, `computeTheoreticalMarginPct`, `computeEstimatedMonthlySalary`, `buildCraAlerts`, `getPeriodLabel`, `isValidTabId`.
- **`get-mission-detail.ts`** (refonte) : ViewModel strict, 8 requêtes parallèles via `Promise.all`. Nouvelles données : `external_ref`, `hq_location`, `current_title`, `employee_ref`, `availability`, `exit_date`, `person_skills → skills` (level/years/confidence/source), `business_days`, `pto_days`, `sick_days`, `activity_rate_percent`, `tjm_snapshot`, `cjm_snapshot`, `planningEvents` (calendar_events by mission_id + fallback company_id + absences + closures).
- **`MissionDetailHeader.tsx`** (nouveau) : Badge Mission + external_ref + titre seul (sans compte) + info row avec pictogrammes (practice image, staffing, séniorité SVG, durée) + StatusPill + badge risque. Bloc identité client à droite : CompanyLogo + "Client" + nom. Dialog risque view/edit inline.
- **`MissionDetailTabs.tsx`** (nouveau) : 5 onglets typés, border-b-2 pattern identique ProjectDetailPanel.
- **`MissionSynthesisTab.tsx`** (nouveau) : 2 colonnes 2/3 + 1/3. KPIs marge théorique/réelle/TJM/nb CRA. Description, practice/role/seniority/durée, contacts avec drawer. Infos client (secteur, segment, siège, effectif, CA). Suivi + prochaine action. Documents (contrat, ODM, CRA). Edit dialogs : synthèse (titre/practice/séniorité/description) + activité (next_task/to_anticipate).
- **`MissionCollaboratorTab.tsx`** (nouveau) : Fiche identité centrée + statut + coordonnées. Compétences groupées par catégorie avec dots niveau. Top 5 en sidebar.
- **`MissionActivityTab.tsx`** (nouveau) : Alertes CRA (5 règles), KPIs taux global/YTD/jours produits. Jauge ActivityRateGauge avec seuil TARGET. Résumé absences (CP, maladie, non-facturable). Tableau CRA chronologique inverse avec barres color-coded multi-segments.
- **`MissionFinancialTab.tsx`** (nouveau) : CA total/YTD depuis CRA snapshots, marge réelle vs théorique. TJM/CJM/salaire/valeur contrat. Facturation (conditions, échéance, DSO explicitement absent). Tableau mensuel snapshot. Edit dialog : TJM/dates/payment_terms.
- **`MissionPlanningTab.tsx`** (nouveau) : Événements groupés par mois depuis `planningEvents`. Barre durée mission. Sidebar prochains événements + légende. Empty state informatif.
- **`MissionDetailDesktop.tsx`** (nouveau) : Orchestrateur desktop — header px-6, tabs, tab content scrollable.
- **`MissionDetailMobile.tsx`** (nouveau) : Header compact (logo + titre + company + chips statut/risque + 3 KPIs inline). Tabs scrollables. Dialog risque mobile.
- **`MissionDetailPanel.tsx`** (refonte) : Orchestrateur léger 130 lignes. Chargement/error/retry. Route vers Desktop/Mobile via `isMobile`. Skeleton loading animé.
- **`__tests__/mission-detail-utils.test.ts`** (nouveau) : 40 tests Vitest couvrant toutes les fonctions pures (parseDateOnly, margins, rates, alerts, DSO, contract value, salary).
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · Tests 40/40 · 0 erreur lint dans nos fichiers · 0 HEX · 0 shadow · 0 recharts · DSO explicitement absent (note dans Financier).

### Dernière session
**Date :** 2026-06-16 (session 7)
**Travail effectué — Migration Finance vers le Design System (2ème écran de référence) :**
- **`finance-data.ts`** : Remplacement de `DEFAULT_PL_TIMELINE` hardcodé + vue `v_mission_quarterly_revenue` fantôme → requête réelle `pnl_monthly` (12 mois, colonnes GENERATED) + `opportunities.weighted_gain`. 4 KPIs calculés avec delta M/M. `LooseClient` supprimé, client typé natif.
- **`PnlBarChart.tsx`** (nouveau) : SVG module-spécifique, pattern `Trajectory2026Chart`. 2 barres groupées (CA cobalt, Marge brute vert) + ligne pointillée brass (Résultat op). Tooltip interactif sur clic. 0 HEX, 0 librairie externe.
- **`FinanceDesktopDashboard.tsx`** : `DesktopAnalyticalPage` + 4 `KpiCard` + `PnlBarChart` dans `SurfaceCard` + rail `InsightCard`/`AlertBlock`×2 + `DataTable<LateBilling>` en lowerContent (StatusPill delay, mono amounts, tri Client/Retard) + `AppDialog` dunning/bench/match/sync.
- **`FinanceMobileDashboard.tsx`** : `MobileActionPage` + `MobileHeroInsight` (marge brute, tone dérivé deltaTone) + 2 `MobileActionCard` (facturation urgente + anomalie bench) + `SurfaceCard` résultat op (StatusPill Bénéficiaire/Déficitaire + mini barres CA HTML/Tailwind 3 mois). `AppDialog` remplace le bottom sheet custom.
- **Suppressions** : `HeaderCalendar`, `HeaderAlerts`, avatar shell, carousel KPI mobile, DataTable mobile, SVG chart analytique mobile, toutes données fictives affichées en UI.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · 0 HEX · 0 gradient · 0 shadow · 0 DataTable Mobile · visuel Desktop + Mobile validé via navigateur (cookie `kredo_force_device=mobile`).

### Session 8 — Drawer Consultants : branchement person_skills (2026-06-16)
- **`ConsultantDrawer.tsx`** : requête étendue — `persons → person_skills → skills` (id, level, years, confidence, source, skill.name, skill.category). Single PostgREST call, 0 N+1.
- **`TabCompetences`** (remplace placeholder) : cartes triées (niveau ≥ 4 = "Principal" badge en premier, puis niveau décroissant, puis alpha). Affiche category, dots niveau 1-5, années. État vide "Aucune compétence renseignée".
- **`ConsultantsSyntheseDesktop.tsx`** : suppression du `<Link href="/consultants/[id]">` résiduel (overflow hover) — le clic de ligne ouvre déjà le drawer.
- **`ConsultantsSyntheseMobile.tsx`** : remplacement `href` → `primaryAction` avec `<Button>` déclenchant `ConsultantDrawer` (état local `selectedId` + `drawerOpen`).
- **Types** : `DrawerSkillRef`, `DrawerSkill`, `DrawerPerson.person_skills` ajoutés dans `consultant-drawer.ts`.
- **Suppressions** : route `/consultants/[id]`, `DesktopConsultantProfile.tsx`, `MobileConsultantProfile.tsx`, `src/types/consultant.ts` — 951 lignes supprimées.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 (route `[id]` absente du output) · lint → 0 erreur · visuel onglet Compétences validé (Python/Vue.js/Docker/PostgreSQL réels pour Antoine F.).

### Session 9 — ConsultantDrawer : refonte des 3 onglets (2026-06-16)
- **Onglet Synthèse** : "Intitulé du poste" → "Profil métier" ; "Entrée" → "Intégration" ; row financière restructurée en 3 cols égales : TJM moyen | Rentabilité YTD | CA généré YTD. Rentabilité YTD = (CA - coût employeur) / CA calculée depuis `cjm_snapshot` des CRA. Missions : puce `▸`, client en gras, dates début→fin, marge %, `StatusPill`.
- **Onglet Activité** : "Taux moyen" → "Productivité YTD" ; section "Absences & congés" ajoutée sous le graphique — données réelles `collaborator_absences` (`absence_type` est le nom exact de la colonne), triées du plus récent, avec type label français, dateRange et durée.
- **Onglet Compétences** : "Practice de rattachement" en tête (même format carte que "Profil métier") ; badge bleu "Principal" supprimé ; catégorie (`framework`, `devops`, etc.) déplacée sur la même ligne que le nom de la compétence, à sa droite, en petit gris.
- **Types** : `DrawerAbsence.absence_type` (pas `type`), `DrawerMission.company`, `DrawerActivityReport.cjm_snapshot`, `DrawerConsultantData.practice` + `absences`. `ConsultantMetrics.realMarginPct` ajouté.
- **Requête** : `practice`, `company:companies(name)`, `cjm_snapshot`, `absences:collaborator_absences(absence_type)` ajoutés à la query unique.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · 3 onglets validés visuellement (Antoine F. : rentabilité 33 %, 2 absences congés payés, practice Digital, compétences sans badge).

### Session 10 — Agenda : refonte architecture DB + front complet (2026-06-23)
- **Migration 026** (`supabase/migrations/20260623180000_026_calendar_events.sql`) : nouvelle table `calendar_events` (16 types en 3 familles Commerce/Management/Recrutement, RLS workspace, 6 index, triggers `private.set_updated_at` + `private.log_audit`). FK `tasks.calendar_event_id` (ON DELETE CASCADE). FK `interactions.calendar_event_id` UNIQUE (ON DELETE SET NULL). Suppression colonne `interactions.ends_at`. Suppression RPCs buggées `create_agenda_event` + `update_agenda_event`. Nouvelle RPC `create_calendar_event` SECURITY INVOKER avec validations complètes. Appliquée live.
- **`agenda-types.ts`** : `AgendaEvent` migré vers `title`, `event_type`, `starts_at`, `ends_at`, `description`, `candidate_id/candidate`. `AgendaEventFormInput` aligné.
- **`agenda-config.ts`** : 16 types sur 3 catégories avec `colorClasses`, `borderClasses`, `dotClass`, `shortLabel`. Helpers `COMMERCE_TYPES`, `MANAGEMENT_TYPES`, `RECRUTEMENT_TYPES` (Set), `AGENDA_CATEGORIES` (pour picker + filtre groupé).
- **`AgendaEventTypePicker.tsx`** (nouveau) : modale native `<dialog showModal()>` au-dessus des drawers. Step 1 = 3 cartes catégories animées (hover scale + glow radial). Step 2 = liste types avec dot coloré. 0 HEX.
- **`agenda-actions.ts`** : réécriture complète — requête sur `calendar_events` (chevauchement de plages), batch tasks en second appel, `createAgendaEvent` → RPC `create_calendar_event`, `updateAgendaEvent` direct Supabase + sync tâche, `deleteAgendaEvent` (CASCADE), `setAgendaEventStatus`, `getCandidatesForSelect` nouveau.
- **`AgendaEventDrawer.tsx`** (desktop) : `FormState` renommé, picker intégré, section candidat pour RECRUTEMENT, section CRM pour COMMERCE, task priorities `low/normal/high`, validation complète.
- **`AgendaMobileEventDrawer.tsx`** (mobile) : même migration, step 1 = picker type, step 2 = contexte candidat/CRM + tâche. `AgendaQuarterHourTimeField` intégré.
- **Renames display** : `AgendaEventBlock`, `AgendaEventPreview`, `AgendaMobileEventCard`, `AgendaWeekView`, `AgendaMonthView`, `AgendaMobileDateStrip`, `AgendaMobileViews`, `AgendaDesktopPage`, `AgendaMobilePage` — tous migrés `occurred_at→starts_at`, `type→event_type`, `summary→title`, `details.body→description`.
- **`AgendaToolbar.tsx`** : filtre `<optgroup>` par catégorie, `AGENDA_EVENT_TYPES` remplace `AGENDA_EVENT_TYPE_OPTIONS`.
- **Types DB** : `database.generated.ts` régénéré (4064 lignes, `calendar_events` + `create_calendar_event` RPC inclus).
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · `✓ Compiled successfully in 6.1s`.

### Session 11 — Mise à jour des KPIs & section Compétences sur la page Opportunités (2026-06-24)
- **`globals.css`** : Ajout de `--color-info: #2E7D8C;` dans le thème Tailwind `@theme` pour corriger les pastilles et textes utilisant la couleur d'information `info` (comme l'état « CV envoyés »).
- **`page.tsx`** (page Opportunités `/missions/opps`) :
  - Intégration de `createClient` pour requêter dynamiquement la table `opportunity_candidates` sur Supabase.
  - Calcul dynamique du nombre de profils poussés pour les besoins (nombre d'opportunités en étape "CV envoyés" `cv_envoyes` et nombre de candidats/CVs associés).
  - Alignement des KPI cards avec le design de l'app : retrait de `size="compact"` pour utiliser la taille par défaut et ajout de `accent="brass"` sur le "Pipe pondéré" pour correspondre aux autres dashboards.
  - Création d'une disposition 3/4 - 1/4 sur grand écran : les KPIs prennent 3/4 de la largeur et une nouvelle section "Compétences" sous forme de `SurfaceCard` prend le 1/4 restant sous forme de placeholder en pointillés.
  - Suppression de la ligne (`border-b`) sous le titre de la page.
- **`get-opportunities-list.ts`** : Sélection et transmission des champs `website` et `metadata` des comptes (`companies`) pour alimenter les logos client dans les listes d'opportunités.
- **`OpportunitiesDesktopView.tsx`** :
  - Remplacement du filtre par groupes d'étapes par toutes les étapes d'opportunité individuelles précises (Qualification, Recherche profils, CV sent, Présentation client (RT), Abandonné, Gagné, Perdu).
  - Ajout d'un sélecteur de filtre de conviction (`< 70 %` et `> 70 %`).
  - Insertion du composant `<CompanyLogo>` devant le nom du client dans la colonne "Compte" de la table.
  - Limitation de la largeur de la colonne "Compte" (`width: "14rem"`, `min-w-0`, `truncate`) pour décaler la colonne "Opportunité" et les suivantes vers la gauche.
  - Alignement au centre (`align: "center"`) des en-têtes et contenus pour "Conviction" (avec `justify-center`), "TJM cible" et "Valeur (ACV)".
  - Affichage de la date de clôture exacte au format `"JJ/MM"` par un parsing robuste.
  - Ajout d'un sélecteur de filtre "Valeur" pour trier les opportunités par ordre de leur ACV (`Tri croissant` et `Tri décroissant`), avec le texte par défaut mis à jour à `"Valeur (ACV)"` (au lieu de `"Pas de tri"`).
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0.

### Session 12 — Cockpit Intelligence : side panel persistant + FAB mobile (2026-06-26)
- **`intelligence-registry.ts`** (nouveau) : registre d'actions IA — `IntelligenceAction` (id, label, description, icon, category, status). ~20 actions contextuelles + 8 actions socle commun. `ROUTE_MAPPINGS` : 14 patterns pathname → actions. `resolveIntelligenceActions(pathname)` : résolution most-specific-match renvoyant `{ label, contextualActions, commonActions }`.
- **`use-intelligence-panel.ts`** (nouveau) : store Zustand v5 `{ isOpen, toggle, open, close }` avec persistance cookie `kredo_intelligence_open`.
- **`intelligence-icons.tsx`** (nouveau) : 18 `IntelligenceIconKey` → SVG path data. Composant `IntelligenceIcon` outlined.
- **`IntelligenceActionCard.tsx`** (nouveau) : carte action avec icône, label, description. Props `tone="dark"` (panel navy) / `tone="light"` (drawer mobile). Badge "Bientôt" quand `status === "coming_soon"`, bouton disabled.
- **`IntelligencePanel.tsx`** (nouveau) : side panel desktop `<aside>` persistent (pas `<dialog>`). Fond `bg-rail` navy, largeur `var(--layout-intelligence-width)` = 20rem. Détecte les pages avec intelligence inline (ex: fiche compte) → message d'opt-out. Sections : header puce live brass, actions contextuelles grille 2 cols, socle commun, liens rapides pages Intelligence, footer "Propulsé par n8n + IA".
- **`IntelligenceFAB.tsx`** (nouveau) : FAB mobile 56px `bg-primary`, icône sparkle. Position `fixed right-4 bottom-[calc(bottom-nav + safe-area + 0.75rem)]`, z-index `var(--z-fab)` = 45. Ouvre `AppDrawer side="bottom"` avec cartes ton `light`. Masqué sur pages inline intelligence.
- **`IntelligenceToggle.tsx`** (nouveau) : bouton header — rounded-lg, border, sparkle + "Intelligence" + puce live animée. État actif `bg-primary/10 text-primary`.
- **`AppHeader.tsx`** (modifié) : suppression badge "Réseau opérationnel" → remplacement par `<IntelligenceToggle />`.
- **`AppShell.tsx`** (modifié) : Desktop = `<main>` + `<IntelligencePanel />` en flex siblings. Mobile = `<IntelligenceFAB />` avant `<MobileNav />`.
- **`globals.css`** (modifié) : `--z-fab: 45`, `--layout-intelligence-width: 20rem`, `@keyframes kredo-intelligence-in`, `.kredo-intelligence-panel` (320ms slide-in).
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0 · Desktop : panel side compresse le contenu principal, contextualisation vérifiée (Cockpit → 3 actions / Opportunités → 4 actions) · Mobile : FAB visible, bottom drawer contextualisé avec 12 actions (4 contextuelles + 8 socle commun).

### Session 13 — Module Recrutement : refonte filtres par viewMode + kanban hiring (2026-06-26)
- **`PageFilterSelect`** : prop `defaultValue` (défaut `"all"`) → texte grisé (`text-muted`) quand filtre sur valeur par défaut.
- **`EntityWorkspaceHeader`** : nouveau prop `subtitle?: ReactNode` — affiché sous le `<h1>` (utilisé pour le sélecteur de période recrutement).
- **`EntityWorkspaceTemplate`** : nouveau prop `headerSubtitle?: ReactNode` — propagé à `EntityWorkspaceHeader`.
- **`recruitment-stages.ts`** : ajout `HiringKanbanStageKey`, `HiringKanbanStageConfig`, `HIRING_KANBAN_STAGES` (6 étapes : prequalification → integration).
- **`update-hiring-step.ts`** (nouveau) : Server Action pour mettre à jour `candidate_hiring_processes.current_step` via `processId`.
- **`get-recruitment-workspace.ts`** : champ `hiringProcessId: string | null` ajouté à `RecruitmentWorkspaceRow`, alimenté depuis `latestHiringProcess.id`.
- **`RecruitmentKanbanView`** : colonnes migrées de `RECRUITMENT_STAGES` (staffing) → `HIRING_KANBAN_STAGES` (recrutement). `getColumnKey` = `row.hiringCurrentStep ?? "prequalification"`. `onMoveRow` type `(itemId, step: HiringKanbanStageKey) => void`.
- **`RecruitmentPlanningView`** : prop `year: number` → `scale: PlanningScale` ("week"|"month"|"quarter"|"year"). 4 builders : `buildWeekRange` (7 col jours), `buildMonthRange` (semaines du mois), `buildQuarterRange` (3 cols mois), `buildYearRange` (12 cols mois). `showToday` corrigé : `today >= range.start && today <= range.end` au lieu de comparaison d'année.
- **`RecruitmentWorkspace`** : filtres totalement refactorisés par viewMode :
  - **Liste** : étape (hiring steps), recrutement (oui/non), practice — `seniorityFilter` et `periodFilter` supprimés
  - **Kanban** : practice uniquement (gauche) + toggle "Candidats/↺" brass (droite, `secondaryActions`)
  - **Planning** : "Créer un événement" à gauche (`filters`), sélecteur "ÉCHELLE" brass à droite (`secondaryActions`)
  - **Header** : `PeriodSelector` sous le titre (S26 · du JJ/MM au JJ/MM + dropdown invisible) — remplace le filtre période retiré
  - **`handleMoveHiringStep`** : action kanban → `updateHiringStep(row.hiringProcessId, step)` avec rollback optimiste
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → EXIT 0.

### Session 18 — Reports & Rédaction : data layer Lot 1 (2026-07-03)
- **`src/app/(app)/reports/_data/reports-types.ts`** (nouveau) : contrat front exact `DocumentListItem` / `DocumentDetail` / `DocumentVersion` / `ReportsFilterState` / `ReportsKpis` + résultats de loaders et inputs de mutations (`saveAsDocument`, `updateDocument`) pour figer les noms/types attendus par les lots UI.
- **`get-reports-list.ts`** (nouveau) : liste paginée `intelligence_documents` avec filtres `search/documentType/status/entityType/entityId/ownerId/favoritesOnly/periodFrom/periodTo`, FTS via `textSearch("search_vector", ..., { config: "french", type: "websearch" })`, KPIs calculés en parallèle, résolution des labels polymorphes (`company/contact/opportunity/mission/project/collaborator/candidate/sector/calendar_event`) et `qualityOk` dérivé de la dernière ligne `intelligence_document_versions.qa_flags`.
- **`get-document-detail.ts`** (nouveau) : chargement strict d'un document + versions triées `version_number DESC` + liens enrichis avec labels métier. `current_content_*` lu depuis `intelligence_documents`, historique append-only lu depuis `_versions`.
- **`reports-actions.ts`** (nouveau) : `saveAsDocument` atomique sur `intelligence_documents` + `_versions` + `_links` avec rollback explicite si l'une des étapes échoue ; `updateDocument` crée toujours une nouvelle version `manual_edit` puis met à jour le document courant ; actions utilitaires `setDocumentFavorite` et `setDocumentStatus`. Helpers bas niveau `*WithClient()` ajoutés pour tests/service-role, avec `workspaceId` optionnel uniquement pour les scripts hors session auth.
- **Décisions non-triviales prises** : le filtre `entityType/entityId` passe par `intelligence_document_links` (pas seulement `primary_entity_*`) pour couvrir tous les rattachements ; les KPIs respectent les filtres actifs sauf `status` afin de rester informatifs quand l'utilisateur segmente déjà la liste par statut ; si `primaryEntity` est fournie mais absente des liens, elle est injectée en tête et devient la source de vérité dénormalisée du document.
- **Validation** : `npx tsc --noEmit` → EXIT 0 ; `npm run build` → EXIT 0 ; `eslint src/app/(app)/reports/_data/*.ts` → 0 erreur ; test ponctuel service-role via `saveAsDocumentWithClient()` validé (`documents=1`, `versions=1`, `links=1`) + rollback validé sur `entity_type` invalide (`rollbackCount=0`). Note locale Next 16 : `tsc --noEmit` nécessitait un shim `.next/types/routes.js` car le validateur généré importait `./routes.js` alors que Next n'émettait ici que `routes.d.ts`.

### Session 19 — REPORT-001 Lots 0-2 : fondation, fiche compte, rapports d'activité (2026-07-03/04)

Suite de la Session 18 (data layer bibliothèque). Plan séquencé validé après analyse critique d'une proposition ChatGPT (`report_documents` dupliquant `intelligence_documents` → rejeté, extension de la table existante à la place).

- **Lot 0 — Fondation** (`supabase/migrations/20260703120000_report_001_foundation.sql`) : 9 valeurs ajoutées à `intelligence_document_type` (rapports). `intelligence_documents` étendue (`scope_json`, `period_start/end`, `data_cutoff_at`, `approved_by/at`). `compute_conviction_score_v1(company_id)` / `compute_investment_score_v1(company_id)` — scores déterministes `/5` versionnés, le LLM les explique mais ne les recalcule jamais. CORE-001 (`api/n8n/trigger`) généralisé : `entityType`/`entityId` remplacent le `companyId` unique (rétrocompatible — les appelants existants n'ont rien eu à changer), `entityType="workspace"` pour les rapports transverses.
- **Lot 1 — Fiche de synthèse compte** (absorbe l'ancien INTEL-021, jamais implémenté) : RPC `get_account_summary_facts` (migration `20260703150000`, un seul appel service_role remplaçant 8+ requêtes REST). Workflow n8n `report-account-summary.json` (15 nœuds, pattern Webhook→HMAC→Hydrate→LLM→QA→Callback signé). `AccountSummaryReportView.tsx`. `SummaryDrawerContent` dans `IntelligenceActionDrawers.tsx` entièrement réécrit (était un formulaire mort, jamais branché) sur le pattern Realtime (`ai_intelligence_results` filtré par `run_id`). Testé de bout en bout en production (Ascoma, Exail Robotics) après configuration du secret HMAC dans les 2 nœuds Crypto n8n (`Verify Signature` + `Sign Callback` avaient gardé le placeholder `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET`).
- **Lot 2 — Rapports d'activité commerciale + recrutement** : 2 nouvelles RPC déterministes (`supabase/migrations/20260704120000_report_activity_facts_rpc.sql`) :
  - `get_activity_commercial_facts(workspace_id, period_start, period_end, as_of_date)` — anti-double-comptage `interactions`/`calendar_events` **par construction temporelle** (réalisé = `occurred_at` passé, planifié = `starts_at` futur — les deux ensembles ne se recouvrent jamais, aucune déduplication explicite sur `calendar_event_id` nécessaire). Mouvements du pipe (créées/gagnées/perdues), snapshot pipe ouvert, opportunités sans action récente, prochaines actions, répartition par commercial (`owner_id`) et secteur. Caveat documenté : pas de `opportunity_stage_history`, donc pas de suivi des avancées d'étape intermédiaires.
  - `get_activity_recruitment_facts(...)` — 2 funnels distincts jamais fusionnés : recrutement interne (`candidate_hiring_processes.current_step`, aligné sur `HIRING_KANBAN_STAGES`) et positionnement sur besoin (`opportunity_candidates.status`, aligné sur `RECRUITMENT_STAGES`). Offres en attente, disponibilités proches, répartition par practice et origine. Caveat documenté : pas d'historique horodaté des transitions d'étape → temps moyen par étape non calculable en v1.
  - **Piège corrigé en cours de route** : `job_profiles.practice_id`/`candidates.practice_id` référencent la table réelle `offer_practices` (confirmée via `information_schema`), pas une table générique `practices` (qui n'existe pas en live malgré sa présence dans `database.generated.ts` — nouveau symptôme du drift déjà documenté Session 17).
  - Workflows n8n `report-activity-commercial.json` / `report-activity-recruitment.json` (même squelette 15 nœuds que Lot 1, généré par dérivation Python puis relu intégralement — `entityType="workspace"` sans `companyId`).
  - `ActivityCommercialReportView.tsx` / `ActivityRecruitmentReportView.tsx` (nouveaux, `src/components/reports/`).
  - **`ActivityReportModal.tsx`** (nouveau, composant générique unique pour les 2 rapports — évite la duplication demandée par Guillaume) : sélecteur de période (semaine/mois/trimestre/année/personnalisée, calculée "début de période → aujourd'hui"), instructions complémentaires, déclenchement + Realtime + vue résultat + bouton "Enregistrer dans la bibliothèque", même pattern que `SummaryDrawerContent`.
  - **Modale factice supprimée** : `SuiviDesktopView.tsx`/`SuiviMobileView.tsx` avaient un bouton "nouveau rapport" et une modale "Créer un nouveau rapport d'activité" **jamais branchés** (`handleGenerateReport` faisait un `setTimeout` de 1.2s puis affichait un faux succès) — remplacés par `<ActivityReportModal reportType="activity_commercial" />`. Même composant réutilisé dans `RecruitmentWorkspace.tsx` (nouveau bouton "Nouveau rapport" desktop + mobile) avec `reportType="activity_recruitment"`.
  - `save-as-document.ts` : `mapResultTypeToDocumentType` étendu (`activity_commercial`/`activity_recruitment`), nouvelle fonction `getContentPeriod()` qui propage `facts.period.{startDate,endDate}` vers les colonnes `period_start`/`period_end` d'`intelligence_documents` (les rapports périodiques en ont besoin, contrairement à `client_summary`). `api/n8n/callback/route.ts` : `isEligibleDocumentResult` étendu aux 2 nouveaux types (auto-sauvegarde en bibliothèque à la réussite, comme `client_summary`).
- **Validation** : RPCs testées en direct sur données réelles (résultats cohérents : 72 RDV réalisés, 16 opportunités ouvertes, 1.19M€ pipe pondéré par commercial ; funnel recrutement avec 6 étapes peuplées, 5 offres en attente). `npx tsc --noEmit` → EXIT 0. `npm run build` → EXIT 0 (toutes routes générées). `eslint` sur les 9 fichiers touchés/créés → 0 erreur (17 warnings pré-existants sans rapport, aucun nouveau). Syntaxe JS des 12 nœuds `code` des 2 nouveaux workflows n8n validée via `node --check`.
- **Non fait dans cette session** : import/activation des 2 nouveaux workflows sur le VPS n8n (checklist identique à `report-account-summary` : configurer le secret HMAC dans les nœuds `Verify Signature`/`Sign Callback`). Filtres de périmètre (`scope.companyIds/sectorIds/ownerIds`) non exposés en UI — la RPC les accepte en signature future mais `ActivityReportModal` n'envoie que la période en V1 (parité avec `buildAccountSummaryBrief`, scope `{}`).

### Session 20 — ADR-0009 génération de pitch : Lots 0-3 (2026-07-04)

Suite d'une session de brainstorming produit (skill `product-brainstorming`) qui a tranché l'articulation entre le prototype "notebook commercial" du playbook sectoriel (`PlaybookPage.tsx`, en cours par ailleurs) et la génération de pitch : le **compte prime sur le secteur** — le playbook sectoriel reste une source de contexte macro (chaîne de valeur, concurrence, réglementation transverse), non raboté cette session (Q3 : ajustement différé à après usage réel). Le cadrage quick-win (mission 3-6 semaines) est explicitement mis hors scope, traité comme objet séparé futur (Q2). L'onglet dédié à la génération de pitch (Q1) n'a **pas** nécessité de nouvel onglet : l'audit de `ClientIntelligenceDesktopView.tsx` a révélé que la barre à 6 onglets du cockpit compte réservait déjà `strategie` (lot H, *"angle d'approche, messages clés, interlocuteurs"*) — description qui matchait mot pour mot le besoin. `enjeux` (lot F) reste le futur emplacement du matching offre↔compte visuel ; `roadmap` (lot G, Phase 4) reste le grand frère stratégique, hors scope.

- **Lot 0 — Types** : `src/lib/n8n/types.ts` — `CommunicationChannel` += `spoken_pitch_30s`/`meeting_briefing` ; `CommunicationScenario` += `cold_call_pitch`/`meeting_prep_discovery`/`meeting_prep_cross_sell` ; `CommunicationBrief.context.offerRef` (ancrage catalogue obligatoire) ; nouveaux contrats `SpokenPitchOutput`/`MeetingBriefingOutput` (discriminés par `kind`, distincts de `CommunicationOutput`). **Aucune migration de schéma** : `run_type`/`result_type` sont du texte libre sans CHECK, et `commercial_pitch` existait déjà dans l'enum `intelligence_document_type`, câblé bout en bout (`save-as-document.ts`, `api/n8n/callback/route.ts`, `document-display.ts`, `v_ai_intelligence_summary.has_legacy_pitches`) sans jamais avoir été nourri de contenu réel.
- **Lot 1 — RPC `get_pitch_context`** (`supabase/migrations/20260704180000_pitch_context_rpc.sql`) : hydratation compte + offre confirmée + grille tarifaire + practices déjà livrées/suggérées (matching cross-sell v1 par règles) + opportunité/mission d'ancrage + interactions + intelligence sectorielle + pitchs précédents + few-shot FOLIO + scores déterministes. **Piège découvert et documenté explicitement dans le SQL** : `missions.practice` est un texte libre historique (`Cloud`/`Cybersecurity`/`Data`/`Design`/`Digital`/`Mobile`/`Product Management`/`Project Management`/`QA`) qui ne correspond à aucun `offer_practices.slug` réel — mapping heuristique en CASE SQL, dette documentée (pas de FK `missions.practice_id`). `offer_pricing_grids.offer_id` n'est jamais peuplé en vrai (0/120 lignes) — la jointure grille↔offre passe par `practice_id`, pas `offer_id`. Testé sur données réelles : Voyage Privé (7 missions Digital/PM/QA → suggère Cloud/Cyber/Data & AI/Legacy), Arkopharma (prospect, `practices_fit` sectoriel réel `cyber:4, data_ai:5`).
- **Lot 2 — Extension `intel-020-communication.json`** (16 nœuds, patché via script Python plutôt qu'édition manuelle du JSON pour éviter les erreurs d'échappement) : `Validate Brief` exige `context.offerRef` pour les 2 canaux pitch (no-go, requête rejetée sinon) ; `Hydrate Context` bascule sur `get_pitch_context` par expression conditionnelle (pas de nouveau nœud) ; `Assemble Prompt` ajoute 2 templates système + `PITCH_SCENARIO_MISSIONS`, contexte grille tarifaire/practices/mission-ancre formaté séparément ; `Parse & Validate Output` valide `kind`/champs requis par canal ; `Quality Check` ajoute `has_offer_ref`/`word_count_in_target`/`has_call_to_action`/`no_price_commitment`/`arguments_have_evidence` ; `Prepare Callback` route vers `result_type: "commercial_pitch"`. **Zéro nouveau workflow n8n** (décision ADR-0009 tenue). Validation : `node --check` sur les 6 nœuds `code` modifiés + exécution réelle (pas seulement syntaxique) via harnais Node avec mocks réalistes pour les deux branches (pitch et non-pitch) — a débusqué 2 bugs avant mise en prod : `data_points_to_mention`/`close_options` absents du texte scanné par `no_price_commitment`, et regex d'atténuateurs de prix sensible aux accents (corrigés). Non-régression du chemin email confirmée. `intel-020-communication.SETUP.md` complété (§8).
- **Lot 3 — UI** : `get-suggested-offers.ts` (Server Action, résout `workspace_id` via `profiles` — **pas** via `current_workspace_id()` qui vit dans le schéma `private`, non exposé PostgREST, donc jamais appelable en RPC depuis le front). `OfferPicker.tsx` (sélection catalogue obligatoire, practices suggérées groupées en tête). `PitchResult.tsx` (rendu `SpokenPitchOutput` en 5 blocs + barre de progression 30s, `MeetingBriefingOutput` en sections — pas de bouton "journaliser comme interaction" en v1, scope volontairement coupé). `CommunicationBriefForm.tsx`/`IntelligenceActionDrawers.tsx` : branchement conditionnel sur `isPitchChannel`, bouton "Générer" désactivé tant que `offerRef` manque, résultat routé vers `PitchResult` ou `CommunicationResult` selon présence de `kind`. `intelligence-data.ts` : nouveau champ `pitchDocuments` (historique réel `commercial_pitch` depuis `intelligence_documents`, distinct de `pitches` legacy FOLIO). Onglet `strategie` (desktop + mobile) : `ComingSoon`/placeholder remplacé par historique + bouton `ContextualCommunicationButton entryPoint="account_pitch"` — réutilise le mécanisme générique `openCommunicationComposer`/`CommunicationComposerHost` déjà existant, aucune nouvelle plomberie de drawer.
- **`database.generated.ts`** régénéré (5898 lignes) pour exposer `get_pitch_context` aux types Supabase — la commande MCP `generate_typescript_types` renvoie un JSON `{"types": "..."}`, pas du TS brut ; erreur évitée de justesse (le premier essai avait copié le JSON tel quel dans le fichier `.ts`).
- **Validation** : `npx tsc --noEmit` → EXIT 0 (hors 2 erreurs `.next/types` stale déjà documentées Session 18) à chaque lot. `npm run build` → EXIT 0, toutes routes générées. `eslint` sur tous les fichiers touchés/créés → 0 erreur (4 warnings pré-existants sans rapport, `getSource`/`SignalList`/`PlusCircleIcon`/`RefreshIcon`, déjà documentés Session 16).
- **Non fait dans cette session** : import/activation du workflow modifié sur le VPS n8n (secret HMAC déjà configuré depuis Session 19, réimporter le JSON à jour suffit). Onglet `enjeux` (lot F, cartographie enjeux × offres) toujours `ComingSoon` — le matching offre↔compte existe déjà côté RPC (`suggestedPractices`/`deliveredPractices`) mais n'a pas de vue dédiée. Bouton "voir un pitch précédent" du Stratégie renvoie vers `/reports` filtré plutôt qu'un aperçu inline. Pas de test réel avec le LLM Anthropic (validé uniquement via mocks Node) — premier test en conditions réelles à faire après import VPS.

### Session 21 — ADR-0011 Score de Priorité Commerciale : Lot 0 (2026-07-06)

Suite d'un brainstorming produit (skill `product-brainstorming`) critiquant et enrichissant une proposition ChatGPT de refonte du "scoring IA" hérité de FOLIO. Verdict tranché dans ADR-0011 (non committé en fichier, voir transcript) : le score `companies.ai_score` (1–5, jamais historisé, jamais expliqué) est un gadget en l'état — 0/95 comptes ont `account_facts`/`account_signals` peuplés, 80 % du parc n'a aucune opportunité, 85 % aucun `sector_id`. Décision : construire le socle de preuve **avant** le moteur de scoring, pas l'inverse. Roadmap séquencée en 6 lots (Lot 0 fait cette session, Lots 1-6 à déclencher).

- **Lot 0 — Dépréciation du score FOLIO** (`supabase/migrations/20260706140641_027_deprecate_folio_score_apply_v2.sql`) : `companies.ai_score` renommé `companies.legacy_folio_score` + commentaire de colonne explicite. **4 objets SQL déjà en prod** repointés sur la colonne renommée **sans changer leurs clés JSON de sortie** (`v_ai_intelligence_summary.ai_score`→`legacy_folio_score` — colonne non consommée côté front, vérifié par grep avant migration — mais `get_account_summary_facts` clé `'aiScore'`, `get_communication_context`/`get_pitch_context` clé `'ai_score'` **conservées à l'identique** car ce sont des contrats consommés par des workflows n8n déployés sur le VPS, non réimportables/retestables cette session). `v_ai_intelligence_summary` a dû être `DROP` + recréée (pas `CREATE OR REPLACE`) : Postgres refuse de renommer une colonne de vue existante via `REPLACE` (erreur 42P16) — dépendances vérifiées vides via `pg_depend` avant le drop.
- **Piège opérationnel rencontré** : le premier appel `apply_migration` a été passé avec un contenu placeholder au lieu du SQL réel — a créé une entrée de migration vide dans `supabase_migrations.schema_migrations` sans toucher au schéma. Détecté par vérification post-migration (`information_schema.columns` montrait toujours `ai_score`), corrigé en ré-appliquant le SQL réel puis en supprimant la ligne de tracking erronée. Le fichier local de migration a été renommé pour matcher exactement le timestamp effectivement appliqué en base (`20260706140641`), pas celui écrit initialement — évite un drift local/remote dès la création de la migration.
- **Renommage front** (~24 fichiers, `ai_score`→`legacy_folio_score` en snake_case DB, `aiScore`→`legacyFolioScore` en camelCase domaine) : `sector.ts`, `database.types.ts` (snapshot stale mais son unique consommateur ne touchait pas ce champ — corrigé pour cohérence), `database.generated.ts` (régénéré via MCP), toutes les requêtes `.select()`/`.order()` sur `companies`, `portfolio-account-metrics.ts`, `intelligence-data.ts`, `account-panel-data.ts`, `sector-activation-data.ts`, `mobile-priority-view-model.ts`, etc. **Exemptés délibérément** : `reports-types.ts`/`AccountSummaryReportView.tsx` — ils consomment directement la clé JSON `aiScore` de `get_account_summary_facts`, laissée inchangée pour la raison ci-dessus.
- **Retrait `ScorePill` du header cockpit** (`ClientIntelligenceDesktopView.tsx`, `ClientIntelligenceMobileView.tsx`, 3 emplacements : header desktop, header compact mobile, onglet Scoring mobile lot E) : composant supprimé de `intelligence-parts.tsx`, remplacé par `ScorePlaceholder` (même emplacement visuel, bordure pointillée, "—" + "Score en refonte") — plus aucune valeur legacy trompeuse affichée en prod.
- **Piège BSD sed** : le premier passage de renommage utilisait `\b` (word-boundary) avec `sed -E` sur macOS — silencieusement no-op (BSD sed ne supporte pas `\b` dans ce contexte), les fichiers étaient marqués "OK" sans qu'aucune substitution n'ait eu lieu. Détecté par grep de vérification post-rename, corrigé en repassant sans ancre `\b` (safe ici : `ai_score`/`aiScore` jamais en sous-chaîne d'un autre identifiant, vérifié par regex avant le remplacement).
- **Validation** : `npx tsc --noEmit` → EXIT 0 (après purge `.next/` stale). `npm run build` → EXIT 0, 32 routes générées. `eslint` sur les ~28 fichiers touchés → 0 erreur (20 warnings pré-existants sans rapport, aucun nouveau). Tests Vitest `build-mobile-priority-view-model.test.ts`/`resolve-mobile-primary-action.test.ts` → 21/21 passés. RPC `get_communication_context` testée en direct sur données réelles : clé `ai_score` retourne bien la valeur de `legacy_folio_score` (4.0), confirmant que le contrat n8n est intact.
- **Non fait dans cette session (Lots 1-6 de l'ADR)** : alimentation `account_signals` depuis `sector_news`/`sector_regulatory_items`/`metadata.analysis_data.signaux` (Lot 1, préalable obligatoire avant tout moteur de scoring — sans lui le composant "signaux d'achat" reste à 0 partout) ; schéma `account_score_runs`/`account_score_components`/`account_score_feedback` (Lot 2) ; moteur TypeScript `src/lib/account-scoring/` (Lot 3) ; UI header + modale détail (Lot 4) ; backfill initial (Lot 5) ; intégrations transverses CRM/weekly brief (Lot 6, volontairement différé après retour d'usage réel — pas de branchement dans les prompts pitch/mail, décision ADR explicite).

### Session 21 (suite) — ADR-0011 Lot 1 : backfill account_signals (2026-07-06)

- **Migration** (`supabase/migrations/20260706142205_043_account_signals_backfill_v2.sql`) : 735 lignes insérées dans `account_signals` (0 lignes avant), 93 comptes couverts. 3 sources, 6 blocs `INSERT ... ON CONFLICT (workspace_id, dedupe_key) DO NOTHING` (idempotent, vérifié par ré-exécution — toujours 90 lignes `folio_growth_trend`, pas de doublon) :
  - **FOLIO** (`companies.metadata.analysis_data.signaux`) : **découverte en cours de route** — ce n'est PAS un tableau de signaux comme supposé dans l'ADR initial, mais un objet à 4 facettes fixes (`actualites_recentes` tableau de strings, `tendance_croissance`/`recrutements_recents`/`indices_maturite_digitale` strings uniques). 460 `folio_news_item` + 90 `folio_growth_trend` + 34 `folio_hiring_signal` + 89 `folio_digital_maturity`. Exclusion des valeurs vides sur `recrutements_recents`/etc. en **égalité exacte** (`trim+lower NOT IN ('non trouvé','non trouve')`), pas en sous-chaîne — vérifié que 6 valeurs contenant "non trouvé" en sous-chaîne restaient informatives (ex. "Non trouvé - contexte de PSE et fermetures de sites suggère absence de recrutements"), un filtre substring les aurait perdues à tort. `confidence_score` fixé à 0.5 (donnée legacy non structurée). `detected_at`/`expires_at` dérivés de `metadata.imported_at` (identique pour les 93 comptes, import FOLIO unique du 2026-06-09) + 60 jours.
  - **`sector_news`** (90 derniers jours) : 49 lignes, uniquement pour les comptes avec `sector_id` renseigné (14/95). `confidence_score`/`relevance_score` = `sn.relevance_score` réel (déjà 0–1). `urgency_score` = 0.7 si `is_trigger_event`, sinon 0.
  - **`sector_regulatory_items`** (urgency high/critical, échéance future ou non datée) : 13 lignes. `confidence_score`/`urgency_score` par mapping déterministe sur `urgency` (critical→0.9, high→0.7/0.6).
- **Bug corrigé en cours de route** : `urgency_score`/`relevance_score`/`confidence_score` sur `account_signals` sont **NOT NULL avec défaut 0.000** (pas nullable comme supposé) — le premier essai d'`apply_migration` a échoué sur `CASE WHEN ... ELSE NULL END` pour `urgency_score` (contrainte NOT NULL). Corrigé en `ELSE 0` (le schéma encode "pas de signal" comme 0, pas NULL). La transaction ayant échoué a bien tout annulé (0 lignes avant correction, vérifié).
- **Même piège qu'au Lot 0** : le nom de migration local ne matchait pas le timestamp réellement appliqué en base — fichier renommé `20260706142205_043_account_signals_backfill_v2.sql` pour matcher exactement l'entrée dans `supabase_migrations.schema_migrations`.
- **Numérotation cosmétique** : renommé de "028" (déjà pris par `20260624095554_028_expand_interactions_type.sql`) vers "043" (prochain numéro libre après le `042_intelligence_documents` le plus haut) — cosmétique uniquement, Supabase utilise le timestamp comme clé, pas le nom (drift déjà documenté [[project-migration-drift]]).
- **Advisors Supabase** (security + performance) vérifiés après migration : aucune alerte nouvelle liée à `account_signals` ou à ce backfill — les seules mentions (`unindexed_foreign_keys` sur `company_id`/`primary_source_id`/`recommended_practice_id`/`run_id`/`suggested_contact_id`) sont pré-existantes à la création de la table (hors scope Lot 1, pas touchées).
- **Non fait** : `account_facts` reste vide (0 lignes) — hors scope Lot 1, l'ADR ne l'a jamais priorisé pour la V1 du scoring (les signaux qualitatifs suffisent pour le composant C3, `account_facts` sert plutôt à des attributs structurés type taille/CA qui existent déjà en dur sur `companies`). Pas de `intelligence_sources`/`primary_source_id` créés pour tracer la provenance individuelle des signaux sector_news/regulatory (laissé `NULL` — amélioration possible mais pas bloquante pour Lot 2/3).

### Session 21 (suite) — ADR-0011 Lot 2 : schéma account_score_* (2026-07-06)

- **Migration** (`supabase/migrations/20260706160000_044_account_score_schema.sql`) : 3 tables + 1 vue.
  - **`account_score_runs`** : une ligne par recalcul (append-only, jamais d'UPDATE d'un run existant — comme `ai_intelligence_runs`). `score_value`/`confidence_score` 0–100 CHECK, `score_band` IN (A/B/C/D/U — U="Unqualified"), `trigger_source` IN (manual/weekly_brief/signal_update/import/system), `lifecycle_context` = snapshot texte de `companies.lifecycle_status` au moment du calcul (pas une FK vivante). Index `(workspace_id, company_id, calculated_at DESC)` couvrant à la fois la FK `company_id` et la requête "dernier run par compte".
  - **`account_score_components`** : une ligne par facteur (C1–C6 de l'ADR §4.1). `UNIQUE(score_run_id, component_key)` sert aussi d'index couvrant la FK — pas d'index dédié nécessaire. `evidence_refs jsonb` = tableau `{table, id}` pointant vers les lignes sources (traçabilité exigée par l'ADR, zéro score opaque).
  - **`account_score_current`** (vue, `security_invoker=true`) : `DISTINCT ON (company_id) ... ORDER BY calculated_at DESC` — seule vue à consommer côté app pour le score courant.
  - **`account_score_feedback`** : retours qualitatifs utilisateur sur un run (too_high/too_low/right), non branché en V1 (Lot 6+).
  - **Pas de `score_profile`** (acquisition/expansion/rétention/réactivation) — décision ADR tenue : une seule grille + `lifecycle_multiplier` par composant, pas 4 grilles à maintenir sans matière statistique pour les valider (95 comptes, 15 avec pipe).
- **Pattern repris de `private.validate_account_signal()`** (Lot 1) : 3 nouveaux triggers `private.validate_account_score_{run,component,feedback}()` — vérifient en défense-en-profondeur que le `workspace_id` de l'enfant correspond bien à celui du parent référencé (company/run), en plus de la RLS. Testé positif (insert normal → OK) et négatif (insert avec workspace mismatch → rejeté avec `RAISE EXCEPTION`, vérifié par un appel direct hors bloc `EXCEPTION` pour obtenir la preuve dans la sortie de l'outil).
- **RLS** : 4-policy uniforme sur les 3 tables (SELECT/UPDATE/DELETE scoped `workspace_id = private.current_workspace_id()`, INSERT `WITH CHECK (true)` — le `DEFAULT current_workspace_id()` + le trigger de validation garantissent l'isolation, pas le `WITH CHECK`). **Découverte en cours de route** : `current_workspace_id()`/`is_workspace_admin()`/`set_updated_at()`/`log_audit()` vivent tous dans le schéma **`private`**, pas `public` comme l'affirme la section "Fonctions Postgres (public)" plus haut dans ce document — drift documentaire supplémentaire (cf. [[project-migration-drift]]), à corriger un jour mais pas cette session. `account_signals` confirme aussi que `workspace_id` FK-référence explicitement `workspaces(id) ON DELETE CASCADE` et que les FK vers un utilisateur pointent vers `profiles(id)`, jamais `auth.users(id)` directement — pattern repris ici (`triggered_by`, `user_id`).
- **Aucune colonne `updated_at`/trigger `set_updated_at`/`log_audit`** sur les 3 tables — décision délibérée (pas une omission) : ce sont des lignes historisées append-only (un recalcul = une nouvelle ligne), comme `intelligence_document_versions` qui suit le même principe et n'a ni `updated_at` ni trigger.
- **Advisors Supabase** vérifiés post-migration : les 3 tables déclenchent le même WARN `rls_policy_always_true` sur INSERT que 6 tables déjà existantes (`intelligence_documents`, `intelligence_document_versions`, `projects`, etc.) — pattern déjà accepté dans ce codebase, rien de nouveau introduit.
- **Validation** : `npx tsc --noEmit` → EXIT 0 après régénération de `database.generated.ts` (24 occurrences des 4 nouveaux objets confirmées). Test fonctionnel direct en base : insert run+component réussi, vue `account_score_current` retourne bien la dernière ligne, insert avec workspace erroné rejeté par le trigger (`Workspace mismatch between score run and company`), données de test nettoyées après vérification.
- **Non fait** : GRANT explicites non nécessaires (les tables héritent des privilèges par défaut du schéma `public`, comme `account_signals` avant elles — vérifié, pas de différence de comportement).

### Session 21 (suite) — ADR-0011 Lot 3 : moteur de scoring TypeScript (2026-07-06)

- **RPC `get_account_score_context`** (`supabase/migrations/20260706170000_045_account_score_context_rpc.sql`) : hydratation déterministe (company, sector via practices_fit, contacts agrégés, opportunités agrégées, missions actives, interactions 90j, signaux actifs non expirés limités à 30). **Différence volontaire vs les RPC pitch/communication/reports** : `SECURITY INVOKER` + `GRANT EXECUTE TO authenticated` (pas `service_role`) — c'est l'utilisateur connecté qui déclenche le recalcul via le bouton "Actualiser", pas un workflow n8n. Testée sur données réelles (ACRI-ST : 14 contacts, 1 opp ouverte 61,9k€ pondéré, 8 signaux FOLIO).
- **Module `src/lib/account-scoring/`** (10 fichiers + 1 test) :
  - `types.ts` — contrat exact du RPC (`AccountScoreContext`) + types du moteur pur (`RawScoreComponent` → `ScoreComponentResult` après pondération, `AccountScoreResult`).
  - `score-config.ts` — `BASE_WEIGHTS` (C1 20/C2 25/C3 20/C4 15/C5 20/C6 15 bonus), `LIFECYCLE_MULTIPLIERS` par bucket (prospect/active/dormant, décision ADR tenue : pas de `score_profile` multiple), `getLifecycleBucket()` (client_actif→active, client_dormant/ancien_client→dormant, tout le reste→prospect), seuils de bande A/B/C/D/U.
  - `components/compute-c{1..6}-*.ts` — 6 fonctions pures, une par facteur. **Piège découvert en testant la RPC sur données réelles** : les signaux FOLIO backfillés au Lot 1 ont `relevance_score`/`urgency_score` = 0 par construction (jamais quantifiés) sur 79/93 comptes — traiter ça comme "urgence nulle" aurait donné C3=0 pour la quasi-totalité du parc. `compute-c3-signals.ts` distingue désormais signaux "quantifiés" (sector_news/regulatory, vrai relevance/urgency) des signaux "qualitatifs seuls" (FOLIO, plancher à 30 plutôt qu'un zéro trompeur).
  - `compute-account-score.ts` — orchestrateur : applique poids × lifecycle_multiplier par composant, **renormalise sur 0-100** (la masse pondérée totale varie selon le profil — sans renormalisation "score /100" perdrait son sens d'un compte à l'autre), calcule la confiance globale (moyenne pondérée), détermine la bande (U prioritaire sur tout si confidence < 40, conforme à la règle UX ADR §3 "score exploratoire même si la note brute semble élevée"), construit le résumé (drivers positifs/négatifs + caveats).
  - `collect-account-score-input.ts` — appelle la RPC, résout `workspace_id` via `profiles` (pas `private.current_workspace_id()`, non exposé PostgREST — même contrainte que `get-suggested-offers.ts`, ADR-0009).
  - `persist-account-score-run.ts` — insère `account_score_runs` + `account_score_components` (append-only, jamais d'UPDATE). Cast `as unknown as Json` pour les champs jsonb (pattern déjà utilisé dans `n8n/runs.ts`).
  - `actions.ts` — Server Action `recomputeAccountScore(companyId)` orchestrant collecte→calcul→persistance, `revalidatePath` sur la fiche compte. Recalcul manuel uniquement en V1 (pas de cron, décision ADR tenue).
- **Tests** (`__tests__/compute-account-score.test.ts`, 9 cas) : bande U sur compte vide, score borné 0-100, C6 exclu pour un prospect même avec données mission, C6 inclus uniquement pour client_actif avec mission active, C6 omis si client_actif mais 0 mission active (garde-fou incohérence), signaux FOLIO traités comme contexte qualitatif (pas zéro), signal quantifié priorisé sur signaux FOLIO, pénalité momentum sur action en retard, client_dormant et ancien_client mappés au même bucket dormant.
- **Validation** : `npx tsc --noEmit` → EXIT 0 (après régénération de `database.generated.ts` pour exposer la nouvelle RPC + correctif des casts `Json`). `npm run build` → EXIT 0. `eslint src/lib/account-scoring/` → 0 erreur, 0 warning. Tests 9/9 passés. **Sanity check bout en bout** avec les vraies données ACRI-ST (récupérées via la RPC) : score 47.35, bande C, confiance 67.75 — cohérent (pipe réel 61,9k€ tire C2 vers le haut, 0 décideur parmi 14 contacts tire C4 vers le bas, signaux FOLIO seulement qualitatifs plafonnent C3 à 30).
- **Non fait** : Lot 4 (UI header + modale, remplacement de `ScorePlaceholder`) — le moteur existe mais n'est encore appelé nulle part dans l'app. Pas de branchement du bouton "Actualiser" dans le cockpit compte.

### Session 21 (suite) — ADR-0011 Lot 4 : UI header + modale de détail (2026-07-06)

- **Données** : `get-account-score-summary.ts` (nouveau, `src/lib/account-scoring/`) lit `account_score_current` (Lot 2) + `account_score_components` du dernier run, retourne `AccountScoreSummaryView | null`. Branché dans `intelligence-data.ts` (nouveau champ `ClientIntelligenceData.scoreSummary`, chargé en parallèle des autres requêtes via `Promise.all`).
- **`ScorePlaceholder` supprimé** de `intelligence-parts.tsx` (code mort dès que ses 3 usages ont été remplacés — pas de compat descendante gardée, conforme aux conventions du projet).
- **`ScoreBadge.tsx`** (nouveau) : composant **purement présentationnel** — reçoit `summary`/`onClick` en props, ne gère aucun état interne. **Bug détecté et corrigé avant livraison** : la vue mobile monte le badge à 2 endroits simultanément possibles (header + onglet Scoring) ; une première version avec `useState` interne au badge aurait désynchronisé les deux affichages après un recalcul (recalculer depuis l'onglet Scoring n'aurait pas mis à jour le header, et vice versa). Corrigé en remontant l'état (`scoreSummary`, `scoreModalOpen`) dans les composants parents (`ClientIntelligenceDesktopView`/`MobileView`), qui gèrent déjà `activeTab`/`activePanel` de la même façon — un seul état partagé, deux triggers.
- **`ScoreDetailModal.tsx`** (nouveau) : `AppDialog` avec la classe d'échappement `.score-modal-reading` (nouvelle, ajoutée en sélecteur jumeau de `.pitch-modal-reading` dans `globals.css` plutôt que dupliquée — même besoin d'échapper au cobalt+or ambiant pour du contenu dense à lire). Affiche score/100 (masqué si confiance < 40, conforme ADR §4.2), `StatusPill` de bande (A=success/B=inProgress/C=warning/D=neutral/U=danger), confiance, contexte lifecycle, date de calcul formatée fr-FR, drivers positifs/négatifs, caveats, détail des 6 composants (barre de progression + poids + multiplicateur + contribution + explication). Bouton "Actualiser" (`useTransition`) appelle `recomputeAccountScore` (Server Action Lot 3) et met à jour l'état partagé via `onRecomputed`.
- **`actions.ts`/`persist-account-score-run.ts`** ajustés : `persistAccountScoreRun` retourne désormais `{ runId, calculatedAt }` (pas seulement l'id) pour que `recomputeAccountScore` renvoie une `AccountScoreSummaryView` complète et cohérente avec ce qui est réellement stocké, sans fabriquer une date côté client.
- **Montage** : `ScoreBadge` remplace `ScorePlaceholder` dans le header desktop, le header compact mobile ET l'onglet Scoring mobile (ex-`ComingSoon lot E`, désormais fonctionnel — pointe vers la même modale que le header). `ScoreDetailModal` monté une fois par branche de rendu (2 mounts dans `ClientIntelligenceMobileView.tsx` à cause du pattern de retour anticipé existant `if (activePanel !== "accueil") { return (...) }` / `return (...)`, corrigé une erreur de balise `</div>` en trop introduite pendant l'édition).
- **Dette pré-existante repérée en passant** (hors scope, tâche séparée créée) : `--color-status-warning-ink`, utilisé tel quel dans `StatusPill.tsx`/`Badge.tsx`/`AppDrawer.tsx`/tous les `ReportView` (10+ fichiers déjà livrés), n'est défini dans **aucun** fichier CSS du projet — variable fantôme copiée fidèlement depuis `StatusPill.tsx` par cohérence, pas corrigée ici (comportement partagé par tout un pan de l'UI existante, pas quelque chose introduit par ce lot).
- **Validation** : `npx tsc --noEmit` → EXIT 0. `npm run build` → EXIT 0, 32 routes. `eslint` sur les 8 fichiers touchés/créés → 0 erreur (4 warnings pré-existants sans rapport : `getSource`/`SignalList`/`PlusCircleIcon`/`RefreshIcon`, déjà documentés Sessions 16/20).
- **Non fait** : QA visuelle réelle (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]) — à faire par Guillaume en navigateur. Lot 5 (backfill initial des runs sur les 93 comptes, pour que tous partent avec un premier score au lieu d'un badge "à calculer") et Lot 6 (intégrations transverses CRM/weekly brief) pas commencés.

### Session 22 — ADR-0012 Cockpit Intelligence : refonte en chaîne de décision + Lot 0 (2026-07-07)

Chantier « cœur » de KREDO. Analyse critique d'une note de défrichage ChatGPT, corrigée par un **audit live** (Supabase + code). ADR complet : `docs/adr/ADR-0012-cockpit-intelligence-chaine-decision.md` (Proposé, décisions D-1→D-8 validées par Guillaume).

- **Découvertes terrain majeures** (mémoire [[folio-data-reality]]) : `metadata.analysis_data` = **5 clés sans source** (import unique 09/06) ; le « diagnostic process » **n'existe que pour 4 comptes réellement structurés** (15 résultats phase 3, 11 réduits à un `synthese`) — pas un corpus, un prototype ; le champ `phase` est **pollué** (phase 1 = rapports `client_summary`/`activity_*`/`weekly_manager`), `result_type` est la vraie clé ; **mismatch de granularité sectorielle** — `companies.sector` grossier (Services 33, Industrie 22…) ≠ `sector_intelligence` fin (3 fiches : Nutraceutique, Parfumerie, Banque-Finance). 14/95 comptes avec `sector_id`.
- **Décisions actées** : process en **5 étapes** (Connaissance compte → Intelligence sectorielle → Cartographie des enjeux → Stratégie commerciale → Roadmap commerciale) ; scoring/veille/rédaction/synthèse/campagne = **transverses** ; diagnostic repositionné en **enrichissement premium à la demande** (D-2) ; **provenance explicite** au lieu de fausse traçabilité (D-3) ; **curation humaine à chaque étape** (D-4) ; ligne de partage data — artefacts en `content_json`, mais **enjeux + roadmap actions en tables normalisées** `account_issues`/`account_roadmap_actions` (D-5, validé, cohérent ADR-0011) ; **économie** — sectorielle + scoring restent déterministes 0 token, refresh incrémental, tiering Haiku/Sonnet (D-6) ; **4 workflows n8n fins** par étape LLM, pas d'orchestrateur branchu (D-7) ; backfill `sector_id` repoussé au Lot 3 (D-8). Plan en 8 lots, ~30-40 j-h.
- **Lot 0 LIVRÉ** (assainissement + préalables, zéro token) :
  - **Renommage taxonomie** — `intelligence-process.ts` réécrit (5 étapes, `TabKey`/`ProcessStepKey` = `connaissance`/`secteur`/`enjeux`/`strategie`/`roadmap`, **Scoring sorti de la chaîne** → badge header seul). `ClientIntelligenceDesktopView.tsx` + `ClientIntelligenceMobileView.tsx` : onglets/panneaux renommés, panneau `scoring` retiré (redondant avec le badge), onglets `secteur`/`enjeux`/`roadmap` en ComingSoon transitoires, `ScoreIcon` mort supprimé, `STEP_ICONS` mis à jour. Blast radius vérifié : 3 fichiers, aucun autre consommateur.
  - **Reprise des runs** — 10 runs zombies (`queued`/`running` depuis 1-6 j) purgés en `failed`. Fonction `public.reap_stale_intelligence_runs(queued_timeout=15, running_timeout=30)` (migration `20260707162154_047`, `SECURITY DEFINER`, EXECUTE réservé `service_role`) = **ops-004**, testée (retourne 0). À câbler sur un cron n8n côté VPS.
  - **Backfill sectoriel NON fait** (écart signalé et assumé) : créer des stubs `sector_intelligence` grossiers polluerait la table de buckets vides de sens → le vrai backfill (dédup des 81 `sector_analysis` FOLIO en fiches fines) est déplacé au **Lot 3**.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · `eslint` sur les 3 fichiers → 0 erreur (6 warnings pré-existants, aucun nouveau).

### Session 22 (suite) — ADR-0012 Lot 1 : contrats & spine + correction d'un bug live (2026-07-07)

- **Schéma** (`supabase/migrations/20260707181634_048_adr0012_lot1_issues_roadmap_schema.sql`) : enum partagé `intelligence_provenance` (D-3, 5 valeurs) + tables normalisées `account_issues`/`account_roadmap_actions` (D-5 — mutées ligne à ligne, donc `updated_at`/`set_updated_at`/`log_audit`, **contrairement** aux tables append-only `account_score_*` d'ADR-0011). RLS 4-policy standard, triggers de validation défense-en-profondeur `private.validate_account_issue()`/`validate_account_roadmap_action()` (pattern repris de `validate_account_signal`, Session 21) — testés positif + négatif en direct (insert workspace mismatch rejeté). `database.generated.ts` régénéré.
- **Bug live corrigé** (pas seulement une dette théorique) : `getClientIntelligence()` (`src/lib/intelligence/intelligence-data.ts`) matchait les résultats moteur par `phase` (`r.phase === 1/2/3`) au lieu de `result_type`. Or la phase 1 héberge aussi des rapports (`client_summary`, `activity_commercial`, `weekly_manager`) — `results.find(r => r.phase === 1)` (trié par `created_at desc`) pouvait donc renvoyer le rapport le plus récent d'un compte à la place de sa vraie analyse client, que `parseAnalyseClient()` acceptait silencieusement (objet non-null aux champs vides) en l'affichant comme source `"engine"` — masquant le fallback FOLIO réel. **Vérifié en direct : 4 comptes réellement affectés** (Voyage Privé, Euro Protection Surveillance, Robertet, Ascoma, tous via leurs runs `client_summary`). Corrigé en matchant par `result_type` (`ACCOUNT_KNOWLEDGE_RESULT_TYPE`/`SECTOR_SNAPSHOT_RESULT_TYPE`/`"process_diagnostic"`) — comme aucun résultat `account_knowledge`/`sector_snapshot` n'existe encore (Lots 2/3 à venir), ces comptes retombent maintenant correctement sur leur FOLIO réel.
- **Contrats TS** (`src/lib/intelligence/account-intelligence-contracts.ts`, nouveau) : `IntelligenceProvenance` et les enums `account_issue_*`/`account_roadmap_action_*` **dérivés de `Database["public"]["Enums"]`** (pattern repris de `n8n/runs.ts:73`, pas de duplication à la main) ; 5 contrats `content_json` avec `schema_version: 1` — `AccountKnowledgeContent`, `SectorSnapshotContent`, `AccountIssuesMapContent`/`AccountIssueDraft`, `CommercialStrategyContent`, `CommercialRoadmapContent`/`AccountRoadmapActionDraft`. Décision de cohérence : `account_issues_map` et `commercial_roadmap` sont les **sorties brutes tracées** en `ai_intelligence_results` avant matérialisation ligne à ligne dans les tables spine (même pattern que `commercial_pitch` → `intelligence_documents`) — ADR-0012 D-5 mis à jour pour inclure `account_issues_map` par symétrie (oubli de rédaction, corrigé).
- **`intelligence-resource-types.ts`** (classification Session 16 du panneau global) étendu avec les 5 nouveaux `result_type` — additions pures, aucune entrée existante touchée. **Dérive non-ADR-0012 repérée en passant, corrigée dans la foulée** (Guillaume a traité la tâche flaguée immédiatement plutôt que de la reporter) : vérification live (`group by result_type`) confirmant 7 valeurs réellement produites. `"report"` retiré (générique, jamais produit, **aucune** autre référence dans le code) ; `commercial_pitch`/`activity_commercial`/`activity_recruitment`/`weekly_manager` ajoutés (réels, absents jusque-là → retombaient à `null`/mal classés). `"pitch"`/`"pitch_mail"`/`"roadmap"` **conservés** : alias de compat pré-rename référencés ailleurs (`save-as-document.ts`, `api/n8n/callback/route.ts`) pour les deux premiers, placeholder documenté (fallback legacy phase 4 + FOLIO metadata, `account-panel-data.ts`) pour `"roadmap"` — pas de la dérive, du code défensif intentionnel. Tests étendus (7/7).
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · tests `intelligence-resource-types.test.ts` → 7/7 · `eslint` sur les 6 fichiers touchés/créés → 0 erreur, 0 warning.
- **Non fait** : parsers dédiés pour `AccountKnowledgeContent`/`SectorSnapshotContent` (Lots 2/3 — `parseAnalyseClient`/`parseAnalyseSector` restent des parsers FOLIO, à ne pas réutiliser tels quels une fois ces artefacts générés). Comptage `account_issues`/`account_roadmap_actions` dans `getProcessStepStatus` (tables vides, sans valeur avant génération réelle Lot 4/6).

### Session 22 (suite) — ADR-0012 Lot 2 : Connaissance compte — RPC, blocs relationnels, curation, workflow (2026-07-07)

- **RPC `get_account_knowledge_context`** (`supabase/migrations/20260707183536_049`, pattern `get_pitch_context`) : hydratation déterministe compte + contacts (groupés priorité/rôle) + interactions + opportunités + missions + `account_signals` actifs + `folioAnalysisData`/`processDiagnostic` en passthrough brut (le LLM juge de leur intégration, la RPC ne réinterprète rien). Testée en direct sur Voyage Privé (7 missions, 1 opp, 6 contacts, 5 signaux FOLIO, diagnostic).
- **Data layer** (`intelligence-data.ts`) : nouveaux champs relationnels **haute confiance, sans run n8n** — `opportunities`/`missions`/`accountSignals` (nouvelles requêtes parallèles) + `contacts` enrichi (department/decision_power/relationship_level/is_priority, remonté de 6 à 50 lignes — champs rendus optionnels après découverte que `ClientIntelligenceContact` est construit ailleurs, panneau global/composeur communication/rapports, avec un sous-ensemble minimal). Nouveau champ **`accountKnowledge`** (contrat riche, distinct de `client` legacy FOLIO — les deux schémas n'ont volontairement aucun champ commun) + parseur dédié `parseAccountKnowledgeContent` (discriminé par `schema_version === 1`, pas de fusion avec `parseAnalyseClient`). `getProcessStepStatus` (Lot 0) corrigé en conséquence : `hasEngine` teste désormais `accountKnowledge !== null`, plus jamais `client.source === "engine"` (devenu impossible).
- **Curation (D-4)** : Server Action `curate-account-knowledge.ts` (`confirm`/`dismiss`/`restore`/`pin`/`unpin`) — mutation directe de `content_json` via la policy UPDATE standard (vérifiée : `ai_intelligence_results` a bien un policy 4-standard workspace-scopée, pas de service_role nécessaire). `confirm` bascule `provenance` → `human_verified` ; `dismiss` masque sans jamais supprimer (D-3, garde l'historique de ce que le modèle a proposé).
- **UI** (`AccountKnowledgeBlocks.tsx`, nouveau fichier — les 2 vues étaient déjà volumineuses) : `ContactsKeyCard`/`CommercialRelationCard`/`AccountSignalsCard` (relationnel, toujours visibles) + `AccountKnowledgeGeneratedContent` (rendu des 5 blocs de faits + boutons de curation inline, visible seulement quand `accountKnowledge` existe). `FactProvenanceBadge` ajouté à `intelligence-parts.tsx` (5 valeurs, distinct de `ProvenanceBadge` existant à 3 valeurs). **Retrait de "Étude sectorielle" de l'onglet Connaissance compte** (desktop + mobile) — relocalisé dans l'onglet `secteur` (remplace le `ComingSoon` quand une donnée sector existe, FOLIO ou moteur) : complète enfin la séparation compte/secteur commencée au Lot 0. Bouton "Lancer/actualiser" branché en réel (`POST /api/n8n/trigger` `workflowId: "intel-030-account-knowledge"` + Realtime sur `ai_intelligence_results`, pattern identique à `SummaryDrawerContent`/`PitchMailDrawerContent`) — remplace le `setMessage` factice de Lot 0.
- **Workflow `intel-030-account-knowledge.json`** (15 nœuds, même squelette que `report-account-summary.json`) : `Hydrate Context` appelle la nouvelle RPC ; prompt système contraint le LLM à n'émettre que 3 des 5 valeurs de `provenance` (`relational`/`folio_legacy`/`inferred` — **jamais** `human_verified` réservé à la curation, ni `engine_researched` réservé à de futurs workflows de recherche web datée) ; `Parse & Validate Output` rejette durement toute valeur hors de cette liste. Décision documentée dans le prompt : les faits dérivés de `processDiagnostic` (artefact moteur, pas FOLIO ni recherche) sont tagués `relational` — fit imparfait avec l'enum à 5 valeurs, assumé et écrit noir sur blanc plutôt que laissé implicite. **Validation réelle, pas seulement syntaxique** : harnais Node avec mocks (`Validate Entity` bon/mauvais entityType, `Parse & Validate Output` bon cas + rejet provenance interdite, `Quality Check`, `Prepare Callback`, chemin d'échec) + **cross-check programmatique** que le `contentJson` produit correspond exactement aux clés attendues par `parseAccountKnowledgeContent()` côté TS (évite le type de divergence contrat qui aurait cassé silencieusement l'affichage). `intel-030-account-knowledge.SETUP.md` rédigé (import/config/test/activation).
- **`N8nWorkflowId`** (`src/lib/n8n/types.ts`) étendu avec `intel-030-account-knowledge`.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · suite complète `vitest run` → **200/200 tests, 30 fichiers** · `eslint` sur tous les fichiers touchés/créés → 0 erreur (7 warnings pré-existants, aucun nouveau).
- **Non fait** : import/activation du workflow sur le VPS n8n (checklist dans le SETUP.md). Tiering Haiku/Sonnet (D-6) — ce workflow utilise Sonnet comme tous les précédents, l'optimisation économique reste à appliquer plus tard. QA visuelle réelle du nouvel onglet Connaissance compte et du déplacement de la section sectorielle (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]) — à faire par Guillaume.

### Session 22 (suite) — ADR-0012 Lot 3 : Intelligence sectorielle unifiée, backfill + snapshot déterministe (2026-07-07)

Lot exécuté sans dépendre de l'import VPS d'`intel-030-account-knowledge` (Lot 2) — les deux chantiers sont orthogonaux : Lot 2 alimente l'étape 1 (Connaissance compte, LLM), Lot 3 porte sur l'étape 2 (Intelligence sectorielle) qui est **entièrement déterministe** (D-6, zéro LLM, zéro workflow n8n).

- **Backfill `sector_id`** (migration `20260707193641_050`) : audit live des 81 `metadata.sector_analysis` FOLIO confirmant que chaque compte décrit un marché **unique à l'entreprise**, pas une taxonomie partagée — rattacher tout le parc de force aurait produit des fiches sans valeur mutualisée. Décision : ne rattacher QUE les clusters de 2+ comptes décrivant explicitement le même marché nommé (texte à l'appui, pas le libellé grossier `companies.sector`). Résultat : **14→27/95 comptes** avec `sector_id`. Extension de la fiche « Parfumerie, Arômes & Cosmétique » existante (+Argeville, +Aromatech Group) et **3 nouvelles fiches** créées avec description factuelle synthétisée depuis les vraies analyses FOLIO (pas de score/market_size inventé, champs laissés `NULL`) : « Transport & Mobilité régionale » (5 comptes : Cogepart, ESCOTA, Groupe Transcan, KEOLIS, Régie Ligne d'Azur), « BTP, Construction & Immobilier » (4 comptes : Groupe IDEC, Groupe Trecobat, Audemard, Renaudi), « EHPAD & Résidences Seniors » (2 comptes, cluster serré — les deux analyses citent mot pour mot les mêmes dynamiques : vieillissement, post-Orpéa 2022, pénurie de personnel). **~68/95 comptes restent volontairement sans `sector_id`** — honnête, pas un manque à corriger.
- **Piège opérationnel** : premier essai `apply_migration` a échoué (`workspace_id` NOT NULL sans défaut résolvable hors session utilisateur pour `sector_intelligence`) — corrigé en injectant l'unique `workspace_id` du système explicitement. Rollback complet vérifié avant retry (0 ligne orpheline).
- **Couche de lecture** (`src/lib/intelligence/sector-snapshot-data.ts`, nouveau) : `getSectorSnapshot(sectorId)` — lecture live (pas de cache, D-6 : volume trop faible par secteur pour le justifier) de `sector_intelligence` + `sector_pain_points` (triés fréquence) + `sector_regulatory_items` (triés échéance) + `sector_events` + `sector_news`, plus `exposedAccountsCount` et `openCommercialWindows` dérivé (items réglementaires marqués fenêtre + actualités déclencheurs). Testé sur données réelles (Banque-Finance-Assurance : pain points « Mise en conformité DORA » fréq. 5, fenêtres « GAFI — Sortie de la liste grise »/DORA/Solvabilité II).
- **`ClientIntelligenceData.sectorSnapshot`** (nouveau champ, `intelligence-data.ts`) : peuplé seulement si `company.sector_id` existe, appelé après résolution du compte (dépendance séquentielle, pas dans le `Promise.all` initial).
- **UI** (`SectorSnapshotContent.tsx`, nouveau fichier) : synthèse secteur + stats marché (attractivité/taille/croissance, affichés seulement si renseignés) + fenêtres commerciales ouvertes en callout + pain points/calendrier réglementaire/événements/actualités/playbook. Câblé dans l'onglet `secteur` desktop + mobile **en priorité sur le fallback FOLIO/moteur** (`data.sectorSnapshot ?? data.sector`), qui reste inchangé pour les ~68 comptes non rattachés. `getProcessStepStatus` (étape `secteur`) mis à jour en conséquence.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · `vitest run` → 200/200 · `eslint` sur les 7 fichiers touchés/créés → 0 erreur (7 warnings pré-existants, aucun nouveau).
- **Non fait** : enrichissement des 3 nouvelles fiches (pain points/réglementaire/events/playbook — vides à ce stade, containers honnêtes pas encore peuplés). QA visuelle (pas de Chrome DevTools MCP) — à faire par Guillaume.

### Session 22 (suite) — ADR-0012 Lot 4 : Cartographie des enjeux — première vraie couche décisionnelle (2026-07-07)

Première étape à réellement peupler la table `account_issues` (créée vide au Lot 1). Contrairement aux artefacts précédents (content_json affiché tel quel), la sortie LLM ici est **matérialisée** en lignes de table — nouveau pattern de callback.

- **RPC `get_account_issues_context`** (migration `051`, pattern identique à `get_account_knowledge_context`) : relationnel KREDO + FOLIO/diagnostic passthrough + **snapshot sectoriel mutualisé** (pain points + échéances réglementaires, réutilise les tables du Lot 3) + catalogue d'offres allégé (actionnabilité seulement, pas la vente — ça reste l'étape 4) + enjeux déjà ouverts (anti-doublon best-effort). Testée en direct : Voyage Privé (`sectorContext=null`, pas de sector_id) et Ascoma (`sectorContext` peuplé — 8 pain points réels dont « Mise en conformité DORA », 5 échéances dont GAFI/DORA/Solvabilité II, exploitant directement le backfill du Lot 3).
- **Matérialisation (D-5)** — nouveau pattern de callback, différent de `commercial_pitch`→`intelligence_documents` (1 résultat→1 document) : `materialize-account-issues.ts` transforme `contentJson.issues[]` (result_type=`account_issues_map`) en **N lignes `account_issues`** (`status='open'`), câblé dans `api/n8n/callback/route.ts` en **parallèle** de (pas remplaçant) `isEligibleDocumentResult` — les deux mécanismes coexistent selon le `resultType`. Chaque run crée un nouveau lot ; pas de déduplication automatique contre les enjeux déjà ouverts (best-effort prompt + QA flag seulement, décision V1 assumée).
- **Workflow `intel-031-issues-map.json`** (15 nœuds) : même contrainte de provenance que `intel-030` (`relational`/`folio_legacy`/`inferred` seulement) — **décision documentée** : les enjeux dérivés de `sectorContext` (pain points/réglementaire mutualisés, alimentés par curation humaine sur d'autres comptes du même secteur) sont tagués `relational` au même titre que le relationnel direct, ce sont des faits de base de données, pas des déductions. Validation stricte : catégorie ∈ 8 valeurs, evidence_level ∈ 3, scores entiers 1-5, **`contact_ids` vérifiés contre la liste réelle de `context.contacts`** (rejette un contact halluciné), max 12 enjeux (garde-fou sur-génération). **Validation réelle** : harnais Node avec mocks (cas nominal 2 enjeux, rejet provenance interdite, rejet contact_id inconnu, rejet score hors plage, chemin d'échec) + **cross-check de contrat** confirmant que `contentJson.issues[]` correspond exactement aux clés attendues par `materializeAccountIssues()` (garantit que l'insertion en base ne cassera pas silencieusement). `intel-031-issues-map.SETUP.md` rédigé.
- **Data layer** (`intelligence-data.ts`) : nouveau champ `accountIssues` (enjeux `status='open'`, triés par importance), type `ClientIntelligenceIssue`.
- **Curation (D-4)** : `set-account-issue-status.ts` — plus simple que la curation account_knowledge (pas de mutation JSON) puisque `account_issues` est une table normalisée : un simple update de `status` (`open`/`dismissed`/`converted`), RLS-safe.
- **UI** (`AccountIssuesBlocks.tsx`, nouveau) : `AccountIssuesTable` desktop — réutilise le `DataTable<T>` générique existant (triable, colonnes Importance/Urgence/Actionnabilité KREDO/Preuve/Contacts/Prochaine question, conforme à la demande ADR "tableau triable + colonne preuve + colonne actionnabilité KREDO"). **Décision de scope** : matrice visuelle importance×urgence (mentionnée dans l'ADR) remplacée par un tableau triable pour V1 — livre la même valeur décisionnelle sans SVG custom, criticality/business_impact/accessibility restent stockés et disponibles mais non colonnés individuellement (évite la surcharge visuelle). `AccountIssuesTopList` mobile — top 3 enjeux (tri importance+urgence), question à poser, contacts, écarter. Boutons de génération + Realtime dans les deux vues (pattern Lot 2, mais recharge directe de `account_issues` au succès plutôt que parsing de `content_json`, puisque la matérialisation est déjà faite côté callback). `getProcessStepStatus` (étape `enjeux`) branché sur `accountIssues.length > 0`.
- **Validation** : `tsc --noEmit` → EXIT 0 · `npm run build` → Compiled successfully · `vitest run` → 200/200 · `eslint` sur tous les fichiers touchés/créés → 0 erreur, 0 warning nouveau (1 warning que j'avais moi-même introduit — import `FactProvenanceBadge` inutilisé — retiré avant validation finale).
- **Non fait** : import/activation VPS (checklist SETUP.md). Déduplication robuste entre runs successifs (V1 = best-effort). Matrice visuelle importance×urgence (remplacée par table, décision assumée). Filtres par catégorie/practice/contact sur la table (colonnes présentes, filtres UI pas encore câblés). Tiering Haiku/Sonnet (D-6, Sonnet partout comme les workflows précédents).

### Session 22 (suite) — ADR-0012 Lot 5 : Stratégie commerciale — mapping enjeu↔offre (2026-07-07/08)

Reprise de session sur handoff `STATE.md` (Lot 4 déjà commité par Guillaume entre-temps, `db601ec7` — le fichier n'était donc plus tout à fait à jour ; un commit non documenté `dc4021a6` "feat(veille)" a aussi été trouvé, hors périmètre de ce lot, vérifié sans collision avant de commencer). D-5 confirmé : `commercial_strategy` reste un artefact de génération pure (`content_json`), pas de table spine (contrairement aux enjeux du Lot 4) — même famille de traitement que `client_summary`/`commercial_pitch`, auto-sauvegardé en bibliothèque documentaire.

- **RPC `get_commercial_strategy_context`** (migration `052`, pattern identique à `get_account_issues_context`/`get_pitch_context`) : enjeux ouverts (`account_issues`, le vrai nouvel input) + catalogue d'offres **complet** cette fois (description, cas d'usage, mots-clés — pas allégé comme au Lot 4, car l'étape 4 EST l'étape de vente) + grille tarifaire agrégée par practice (`pricingByPractice`, min/max/moyenne — pas la grille détaillée du Lot pitch) + playbook sectoriel mutualisé (pain points + réglementaire + `playbook`/`practices_fit`) + contacts + pitchs déjà générés + stratégie précédente (anti-répétition best-effort sur refresh) + matching heuristique `missions.practice`→`offer_practices.slug` réutilisé tel quel depuis `get_pitch_context` (même dette documentée, dupliquée à dessein — D-7 : chaque RPC reste self-contained). **Piège rencontré** : `jsonb_agg(jsonb_build_object(..., avg(...)))` échoue avec `aggregate function calls cannot be nested` — corrigé en pré-agrégeant `pricingByPractice` dans une sous-requête avant le `jsonb_agg`. Testée en direct sur Ascoma (secteur Banque-Finance-Assurance, 41 offres actives, grille tarifaire par practice, 0 contact réel — vérifié non-bug) : `openIssues=[]` confirmé (Lot 4 pas encore importé sur le VPS, cohérent avec le handoff).
- **Enum `intelligence_document_type`** (migration `053`) : ajout de la valeur `commercial_strategy` (n'existait pas, contrairement à `commercial_pitch` déjà présent depuis ADR-0009) — nécessaire pour que l'auto-sauvegarde en bibliothèque ne casse pas silencieusement sur une contrainte enum Postgres.
- **Contrat** : `CommercialStrategyContent`/`COMMERCIAL_STRATEGY_RESULT_TYPE` existaient déjà depuis le Lot 1 (`account-intelligence-contracts.ts`) — aucun changement nécessaire, juste consommés tels quels.
- **Workflow `intel-032-strategy.json`** (15 nœuds, généré via script Python comme les rapports d'activité Session 19, pour éviter les erreurs d'échappement JSON manuelles) : `Hydrate Context` sur la nouvelle RPC ; prompt système contraint chaque `offer_match` à référencer un `issue_id`/`offer_id` réel du contexte (jamais halluciné), `approach_angles` à 2-4 entrées, `objections` à 2 minimum, provenance limitée aux 3 mêmes valeurs que Lots 2/4 (D-3) — avec une nuance documentée dans le prompt : un mapping enjeu↔offre est `relational` s'il s'appuie sur un recoupement textuel explicite (mots-clés/cas d'usage), `inferred` sinon, `folio_legacy` seulement si ancré sur `previousPitches`/legacy. **Aucune génération de pitch ici** (reste `intel-020-communication`, ADR-0009) — cette étape produit le mapping, pas le texte final. **Validation réelle** : harnais Node avec mocks (cas nominal 1 mapping, rejets provenance/issue_id/offer_id inconnus, rejets angles hors 2-4, rejet objections < 2) + **cross-check de contrat** confirmant que les clés de `contentJson` correspondent exactement à `CommercialStrategyContent`/`CommercialStrategyOfferMatch` (TS). `intel-032-strategy.SETUP.md` rédigé, avec un scénario de test dégradé explicite (compte sans enjeux → `offer_matches: []` attendu, pas une erreur).
- **Callback** (`api/n8n/callback/route.ts`) : `commercial_strategy` ajouté à `isEligibleDocumentResult` (auto-sauvegarde bibliothèque, pas de matérialisation table). `save-as-document.ts` : `mapResultTypeToDocumentType`/`buildFallbackTitle` étendus.
- **Data layer** (`intelligence-data.ts`) : nouveau champ `commercialStrategy` (parseur `parseCommercialStrategyContent`, même pattern discriminé par `schema_version` que `parseAccountKnowledgeContent`) + nouveau champ `offersCatalog` (référentiel offres allégé id→nom, pour résoudre les `offer_id` de la matrice côté UI — requête `offers` ajoutée au `Promise.all`, lisible en session utilisateur comme dans `get-suggested-offers.ts`). `getProcessStepStatus` (étape `strategie`) branché en priorité sur `commercialStrategy !== null`, avec fallback sur la présence de pitchs (comportement identique à avant tant qu'aucun run stratégie n'a réussi).
- **UI** (`CommercialStrategyBlocks.tsx`, nouveau fichier — même raison que `AccountIssuesBlocks.tsx`/`AccountKnowledgeBlocks.tsx`, vues déjà volumineuses) : `CommercialStrategyMatrixTable` desktop (`DataTable` générique, colonnes Enjeu/Offre/Preuve/Justification) et `CommercialStrategyMatrixList` mobile (cartes — **jamais de DataTable en mobile**, règle du projet) ; `ApproachAnglesList`/`PersonaMessagesList`/`ObjectionsList` partagés ; `CommercialStrategyGeneratedContent` enveloppe les 4 sections. `StrategieTab` (desktop) et le panneau `strategie` (mobile) **enrichis** (pas recréés, conforme au handoff) : bouton "Lancer/actualiser la stratégie" + Realtime (pattern Lots 2/4) inséré au-dessus de la section pitch existante, inchangée.
- **Validation** : `tsc --noEmit` → EXIT 0 (après extension des `Record<DocumentType, string>` exhaustifs de la bibliothèque `reports/` — `document-display.ts`/`DocumentCard.tsx`/`DocumentMobileDetail.tsx` — cassés par le nouvel enum, corrigé en ajoutant `commercial_strategy` partout, catégorisé "rapport" comme `client_summary`) · `npm run build` → Compiled successfully · `vitest run` → 200/200 (inchangé, pas de nouveau test unitaire ce lot — validation portée par le harnais n8n + tsc/build, comme les lots précédents) · `eslint` sur tous les fichiers touchés/créés → 0 erreur, 0 warning nouveau.
- **Non fait** : import/activation VPS des deux workflows Lot 4 (`intel-031-issues-map`) et Lot 5 (`intel-032-strategy`) — le cas nominal avec de vrais enjeux n'est donc testable qu'une fois `intel-031` importé en premier. Playbook sectoriel affiché seulement via le contenu généré, pas de vue dédiée dupliquant `SectorSnapshotContent.tsx` (décision de scope). Tiering Haiku/Sonnet (D-6, Sonnet partout comme les workflows précédents).

**Prochain focus :** Importer/activer `intel-031-issues-map` PUIS `intel-032-strategy` sur le VPS n8n (checklists respectives), tester le cas nominal Lot 5 avec de vrais enjeux matérialisés (ex. Ascoma) puis le cas dégradé (compte sans enjeux). ADR-0012 Lot 6 (Roadmap commerciale — même pattern matérialisation que le Lot 4 : `commercial_roadmap` → `materialize-account-roadmap-actions.ts` symétrique dans `account_roadmap_actions`, table déjà créée au Lot 1. AUCUNE écriture `tasks`/`calendar_events` à ce stade). Enrichir les 3 nouvelles fiches sectorielles du Lot 3 (pain points/réglementaire/events/playbook, vides à ce stade) une fois un premier usage réel constaté. Importer/activer `intel-030-account-knowledge` sur le VPS n8n et tester la génération de bout en bout sur un compte réel (ex. Voyage Privé). QA visuelle du nouvel onglet Connaissance compte + du déplacement de la section sectorielle (Lot 2), et QA visuelle du nouvel onglet Stratégie (Lot 5, matrice desktop + liste mobile) — pas de Chrome DevTools MCP, à faire par Guillaume. Validation visuelle du Lot 4 ADR-0011 par Guillaume (desktop + mobile, thème cockpit). Puis Lot 5 ADR-0011 (backfill initial : un run `trigger_source='import'` par compte sur les 93 comptes déjà pourvus en `account_signals`) et Lot 6 (intégrations transverses CRM/weekly brief, différées après retour d'usage réel). Importer le workflow `intel-020-communication` mis à jour sur le VPS n8n et tester les 3 scénarios pitch de bout en bout sur données réelles. Importer et activer `report-activity-commercial`/`report-activity-recruitment` sur le VPS n8n (secret HMAC). Lot 3 REPORT-001 (rapport hebdo manager). QA visuelle desktop + mobile de la contextualisation Session 17 (13 pages + 4 entités) — à faire par Guillaume. Compléter le contexte d'entité sur `candidate`/`sector`/`calendar_event` — mêmes primitives (`RegisterIntelligenceEntity` + `ENTITY_ACTION_IDS`). **Réconciliation CLAUDE.md ↔ Supabase live** : 58 tables live vs 35 documentées ici — mettre à jour le schéma documenté avant la prochaine session touchant la base. Route orpheline `/staffing` — décider suppression ou réintégration. Lot 5 QA panneau global (Session 16) toujours en attente. Bug pré-existant `searchParams is not defined` dans `AccountsContactsViews.tsx:977`.

### Session 23 — Feature « Scan rapide compte » Lot 1 : workflow intel-010-refresh (2026-07-12)

Reprise sur handoff dédié (Lot 0 déjà committé par une session parallèle — `10b95797`, socle Supabase `companies.siren`/`companies.naf_code`, RPC batch `validate_and_apply_enrichment_proposals`, contrats `AccountScan*` dans `src/lib/n8n/types.ts`). Objectif du Lot 1 : implémenter le scan des informations d'entreprise dans le workflow canonique `intel-010-refresh`, sans UI et sans recherche de contacts.

- **Investigation obligatoire (avant toute écriture)** : `intel-010-refresh` était réservé dans `N8nWorkflowId` depuis les tout premiers commits (commentaire `client_intelligence_refresh`) mais **n'a jamais eu d'implémentation** — aucun fichier `n8n/workflows/`, aucun appelant Next.js, aucune mention `docs/` (grep exhaustif). Créé donc de zéro, sans usage historique à préserver — seul le routage par `input.operation` (rejet propre de toute opération ≠ `account_scan`) sert de garde-fou pour une future extension.
- **Écart corrigé sur le contrat Lot 0** : `AccountScanOutput` livré au Lot 0 n'avait **aucun champ `resolution`**, alors que le Lot 1 exige de ne jamais générer de proposition tant que l'entité juridique n'est pas résolue sans ambiguïté (2 à 5 candidats sinon). Étendu de façon additive dans `src/lib/n8n/types.ts` : `AccountScanResolution`/`AccountScanResolutionCandidate` + `AccountScanTriggerInput.selectedSiren/websiteHint/locationHint/autoApplyOfficialMissing`. Aucun champ retiré, aucun autre fichier ne consommait encore ce contrat (Lot 2 UI pas commencé) — `tsc --noEmit` validé après coup.
- **Schéma vérifié à la source avant d'écrire le payload d'écriture** (lecture complète de `20260616085702_lot1_intelligence_foundation.sql` et `20260616094307_lot2_proposal_transaction_api.sql`, pas supposé) : `private.jsonb_nullable_text`/`proposal_expected_value` attendent `old_value`/`initial_snapshot.current` comme **scalaire JSON brut** (`"texte"`, pas `{value: "texte"}`) — une erreur ici aurait fait échouer silencieusement **toute** application de proposition au Lot 2 (faux conflit de concurrence systématique). `enrichment_proposals_active_key_uniq` est un **index unique partiel** (actif seulement sur `proposed/needs_review/conflicting/validated`) → un upsert PostgREST classique `ON CONFLICT` y est impossible ; écriture implémentée en delete-then-insert ciblé (uniquement les lignes `proposed`/`needs_review`, jamais `validated`/`conflicting` qui portent une décision humaine ou un conflit déjà signalé).
- **`n8n/workflows/intel-010-refresh.json`** (39 nœuds, généré via script Python pour éviter les erreurs d'échappement JSON manuelles, comme les workflows REPORT-001/ADR-0012) : réutilise strictement les conventions déjà en place (`Verify Signature`/callback signé HMAC `x-kredo-signature`, transition `running`→callback générique, credential `Supabase_Service_Role_KREDO`, branche d'erreur vers `Prepare Failure Callback`).
  - **Résolution d'entité juridique** via `recherche-entreprises.api.gouv.fr` (API publique data.gouv.fr/INSEE Sirene, gratuite, sans clé — aucun nouveau fournisseur payant). Scoring déterministe (similarité de nom + bonus localisation) en nœud Code, jamais par le LLM. `selectedSiren` court-circuite le scoring pour un second appel post-ambiguïté.
  - **Champs objectifs** (legal_name/siren/naf_code/hq_location/employee_count) extraits directement du registre, **sans LLM** — `employee_count` reste une estimation (tranche INSEE → point médian), jamais présentée avec la même confiance qu'une donnée exacte. `sector`/`revenue` **volontairement exclus** du V1 (pas de mapping NAF↔`sector_intelligence` fiable, cf. [[folio-data-reality]] ; pas de source CA gratuite).
  - **Faits interprétatifs** (16 attributs `AccountScanFactAttribute`) extraits par LLM contraint aux preuves collectées (site officiel scrapé best-effort + presse via Google News RSS, mécanisme déjà utilisé par `intel-033-account-watch-refresh`) — prompt interdit explicitement de traiter le contenu web comme des instructions (garde-fou injection de prompt).
  - **Confiance calculée dans un nœud Code déterministe** (fiabilité du type de source × corroboration × fraîcheur × caractère explicite/inféré, pénalité ×0.6 si contradiction avec la valeur CRM actuelle) — le LLM ne note jamais sa propre confiance.
  - **Piège n8n découvert et corrigé en cours de route** : un nœud recevant 0 item en entrée n'est pas exécuté du tout côté n8n — un premier jet où les branches "rien à insérer/lier/collecter" renvoyaient `[]` aurait **interrompu silencieusement toute la chaîne callback**, laissant le run bloqué en `running` (violation directe de l'exigence Lot 1 §14). Corrigé par des branches `Skip Sources`/`Skip Insert`/`Skip Links` renvoyant systématiquement 1 item passthrough + nœud pivot stable `Merge Scan Result` (les nœuds ne référencent jamais par nom une branche IF qui pourrait ne pas s'être exécutée).
- **Validation** : 13 tests unitaires via un harnais Node (`vm` + mocks `$`/`$input`/`$json`, extraits directement du JSON généré — pas de réécriture parallèle de la logique) couvrant les 6 scénarios minimaux du Lot 1 (résolution nette, ambiguïté 2-5 candidats, `selectedSiren` pré-rempli, contradiction CRM/source, entité introuvable + API indisponible, ré-exécution sans duplication + protection des propositions `validated`) + rejet d'opération non supportée. `node --check` sur les 15 nœuds Code. `npx tsc --noEmit` → EXIT 0. `npm run build` → EXIT 0. `npx eslint src/lib/n8n/types.ts` → 0 erreur. `npx vitest run` → 341/342 (1 échec préexistant hors lot sur `mobile-account-custom-list.test.ts`, déjà signalé par le Lot 0).
- **Risques restants documentés dans le SETUP.md** : pas de verrou transactionnel contre deux scans concurrents sur le même compte (best-effort, à traiter au Lot 5 stabilisation) ; découverte automatique de site officiel non implémentée (nécessiterait un fournisseur de recherche payant, hors périmètre) ; extraction du site officiel = texte brut best-effort, pas de rendu JS.
- **Non fait dans cette session** : import/activation du workflow sur le VPS n8n (checklist dans `intel-010-refresh.SETUP.md`, secret HMAC à configurer). Lot 2 (UI `CompanyIdentityDrawer`), Lot 3 (contacts), Lot 4 (UI contacts), Lot 5 (stabilisation) — non commencés, arrêt volontaire en fin de Lot 1 comme demandé.

### Session 23 (suite) — Feature « Scan rapide compte » Lot 2 : UI de revue dans le drawer (2026-07-12)

Suite du Lot 1 (workflow `intel-010-refresh` importé/actif sur le VPS n8n entre-temps, hors session). Objectif du Lot 2 : rendre le scan utilisable depuis `CompanyIdentityDrawer`, sans toucher à la recherche/import de contacts (Lot 3+).

- **Investigation obligatoire** : lecture complète de `CompanyIdentityDrawer.tsx` (1566 lignes), `/api/n8n/trigger`, `SummaryDrawerContent` (`IntelligenceActionDrawers.tsx`) pour le pattern canonique déclenchement+Realtime déjà en prod, `AppDialog.tsx`, `DataTable.tsx`, `StatusPill.tsx`, `set-account-issue-status.ts` et `src/lib/account-scoring/{actions,collect-account-score-input}.ts` pour le pattern Server Action (session utilisateur → `profiles.workspace_id` → RPC, **jamais** `private.current_workspace_id()` non exposé PostgREST). Aucun nouveau pipeline inventé — tout réutilise ces mécanismes existants.
- **Écart de contrat comblé côté data** : `getCompanyIdentity()` (`prospection/accounts/actions.ts`) ne sélectionnait ni `legal_name`, ni `siren`, ni `naf_code` — `IdentityData.company` déclarait déjà `legal_name` en TypeScript mais la colonne n'était jamais requêtée (toujours `undefined` en pratique, incohérence pré-existante). Étendu au `.select()` + au type, nécessaire pour préremplir la modale et rafraîchir la fiche après application.
- **`src/components/accounts-contacts/scan/`** (nouveau dossier, 8 fichiers + 2 fichiers de tests, pattern exact demandé) :
  - **`account-scan-utils.ts`** — fonctions pures uniquement (testables sans mock Supabase) : libellés métier FR pour les 9 champs objectifs + 16 faits interprétatifs, construction du payload `/api/n8n/trigger`, fusion propositions DB ↔ `content_json` (`mergeProposalRows` — `content_json` ne porte jamais l'id réel de la ligne `enrichment_proposals`, indispensable pour `proposalIds`), et surtout `isAutoApplyEligible()` — allowlist V1 stricte (`legal_name/siren/naf_code/hq_location/employee_count/website`), jamais un fait interprétatif, jamais une correction d'une valeur déjà renseignée, confiance ≥ 0.90, **source officielle exigée** (`regulatory_filing` uniquement — un `websiteHint` tapé par l'utilisateur n'a par construction aucune source associée dans le Lot 1, donc ne s'auto-applique jamais, comportement conservateur assumé).
  - **`account-scan-actions.ts`** — `applyAccountScanProposals()` : seul chemin d'écriture CRM, reçoit uniquement `runId/companyId/proposalIds/reason` (jamais une valeur, un champ ou une source depuis le navigateur). Revérifie explicitement workspace **+ compte + run + statut applicable** avant d'appeler `validate_and_apply_enrichment_proposals` (le RPC Lot 0, `SECURITY DEFINER`, ne revérifie lui-même que le workspace — la vérification compte/run est un ajout défensif de ce lot, pas une redite). `getLatestAccountScanRun()` restaure le dernier run `account_scan` d'un compte (filtre `run_type='intel-010-refresh'` **+** `input_snapshot->>operation='account_scan'`, double filtre volontaire pour rester correct le jour où un autre opération partagerait cet id de workflow).
  - **`AccountScanSetup.tsx`** — find/verify (radio), section contacts visible mais désactivée ("Disponible au prochain lot"), case `autoApplyOfficialMissing` cochée par défaut, paramètres avancés dans un `<details>` natif (site/localisation/SIREN, préremplis depuis le compte) — même philosophie "primitives natives" que `CommunicationBriefForm`.
  - **`AccountScanResolutionPicker.tsx`** — 2 à 5 candidats (raison sociale, SIREN, NAF, localisation, score de correspondance), relance avec `selectedSiren`.
  - **`AccountScanStatus.tsx`** — `queued`/`running`/`error`/`not_found`, avec retour au paramétrage.
  - **`AccountScanDesktopResults.tsx`** (`DataTable` générique + colonne sélection custom, mini-rapport, sources avec `target="_blank" rel="noopener noreferrer"`) / **`AccountScanMobileResults.tsx`** (cartes, 44px, barre d'action `sticky bottom-0`, mini-rapport/sources en `<details>`) — **composants réellement distincts**, jamais l'un chargé et caché en CSS sur l'autre.
  - **`AccountScanDialog.tsx`** — orchestrateur, machine à états `setup/queued/running/ambiguous/not_found/review/error` (+ `applying` porté par un booléen local à `review`, pas un état séparé — "conserver la modale ouverte, laisser les propositions non sélectionnées consultables" ne correspond pas à un écran différent). Restauration du dernier run à l'ouverture (`getLatestAccountScanRun`), Realtime sur `ai_intelligence_runs` (transition `queued→running`) **et** `ai_intelligence_results` (résultat terminal), fallback de relecture ponctuelle à 20s (une seule fois, pas de polling), auto-application au chargement des résultats si l'option était cochée.
  - **Piège React découvert et corrigé en cours de route** (`vercel:react-best-practices` appliqué explicitement) : la première version du canal Realtime dépendait de `phase` en plus de `runId` — la transition `queued→running`, déclenchée PAR ce canal, aurait provoqué sa propre destruction/recréation (`useEffect` cleanup+recreate), avec une fenêtre où un événement aurait pu être manqué entre l'ancien et le nouveau canal. Corrigé : effet keyé uniquement sur `runId`, teardown explicite du canal via une ref (`removeChannelRef`) déclenché par les handlers terminaux eux-mêmes, et lecture de `phase` via une ref miroir (`phaseRef`, synchronisée par un effet séparé qui s'exécute avant grâce à l'ordre de déclaration) plutôt qu'en dépendance — évite à la fois la re-souscription inutile et la fermeture obsolète (stale closure).
  - **`CompanyIdentityDrawer.tsx`** : bouton "Rédiger" → "Scan" (`Veille`/`Cockpit` inchangés), import dynamique (`next/dynamic`, `ssr:false`) de `AccountScanDialog` — le bundle desktop/mobile/DataTable n'est chargé que si l'utilisateur clique effectivement sur Scan. Imports devenus inutiles retirés (`getCommunicationEntryPoint`, `openCommunicationComposer`, `CommunicationEntryPoint` — plus aucun autre usage dans le fichier, vérifié par grep). Nouveau `handleScanApplied()` : rafraîchissement silencieux de `data` après application (pas de `startTransition`/skeleton — la modale de scan reste ouverte, seule la fiche derrière doit se mettre à jour).
- **Tests** (32 nouveaux, `vitest`) : `account-scan-utils.test.ts` (payload find/verify, libellés, allowlist auto-apply — 5 cas de rejet + 1 d'acceptation, fusion propositions/sources) a **débusqué un vrai bug** avant livraison — `websiteHint`/`locationHint` n'étaient normalisés en `null` que sur chaîne strictement vide (`||`), pas sur une chaîne d'espaces (`"  "` restait truthy) ; corrigé par un `.trim()`. `account-scan-actions.test.ts` (mock `@/lib/supabase/server`, pattern repris de `agenda-actions-mutations.test.ts`) : rejet paramètres invalides, non-authentifié, proposition hors compte/run/statut, appel RPC nominal, erreur RPC non avalée silencieusement, restauration du dernier run (absent, mauvaise opération, en cours, terminé).
- **Validation** : `npx tsc --noEmit` → EXIT 0. `npx eslint` sur les fichiers touchés/créés → 0 erreur (5 warnings pré-existants sans rapport, vérifiés par `git diff` — aucun sur les lignes touchées). `npx vitest run` → 398/399 (1 échec préexistant `mobile-account-custom-list.test.ts`, identique au Lot 1, fichier non touché). `npm run build` → EXIT 0, toutes routes générées.
- **QA navigateur non faite** (Desktop/iPhone 14, ouverture/fermeture pendant `running`, ambiguïté réelle, auto-application réelle) — pas de Chrome DevTools MCP dans cet environnement (cf. [[feedback-no-chrome]]), à faire par Guillaume.
- **Non fait dans cette session (hors périmètre Lot 2, comme demandé)** : recherche/import de contacts (Lot 3-4), scraping LinkedIn, nouveau workflow n8n, nouvelle table, refonte générale du drawer, page cockpit.

### Session 24 — Monitoring IA & coûts : brainstorming + Lot 0 (2026-07-13)

Skill `product-brainstorming` : cadrage de la demande « monitorer les runs n8n + contrôler les coûts IA ». Audit live avant toute proposition (Supabase direct, pas de mémoire) — a recadré la demande : le coût n'est pas un risque business (~16 $/user/mois standard Sonnet 5, ~19 k$/an pour 100 users) mais l'**observabilité** l'est (23-56 % d'échec selon les workflows, runs zombies). Artifact d'audit publié (privé) avec tableau par workflow + modèle 1/10/100 users + architecture `/automatisations`. Guillaume a tranché : démarrer par **Lot 0** (plomberie), traiter la veille via un **simulateur de cadence** en Lot 2.

**Lot 0 livré** (0 token LLM, 3 migrations) :
- **`ai_model_pricing`** (`20260713060000`) : grille tarifaire versionnée effective-dated, même doctrine que `collaborator_compensation` (une seule ligne `effective_to IS NULL` par modèle). Seed `claude-sonnet-5` : tarif intro (2$/10$, jusqu'au 31/08/2026) + standard (3$/15$, à partir du 01/09/2026) — couvre tout l'historique existant sans trou.
- **5 vues `security_invoker`** : `v_ai_result_costs` (base, par résultat/phase — distingue `tokens_missing` de `pricing_missing`, jamais un coût `$0.00` silencieux), `v_ai_run_costs` (rollup par run, coût NULL si UN SEUL résultat a un trou de données — pas de sous-estimation silencieuse ; durée dérivée de `ai_intelligence_runs.started_at/completed_at`, seul niveau où ces colonnes sont réellement remplies — `ai_intelligence_results.started_at` est toujours NULL, 0/106), `v_workflow_health` (taux succès 30j, p50/p95, runs bloqués — seuils alignés sur `reap_stale_intelligence_runs`), `v_workflow_cost_stats` (source de `<WorkflowCostHint>`), `v_ai_cost_timeline` (jour × workflow × owner).
- **Décision documentée** : les colonnes rollup `ai_intelligence_runs.total_cost_estimate/total_tokens_*` restent mortes (vérifié par grep : aucun code applicatif n'en dépend, seul `database.generated.ts`) — le modèle de coût est entièrement porté par les vues, pas par un trigger d'écriture sur les tables existantes.
- **Reaper (ops-004) étendu** (`CREATE OR REPLACE`, signature inchangée) : notifie désormais l'owner in-app (`user_notifications`, `notification_type='ai_run_reaped'`, `deep_link='/automatisations'`) au lieu de reprendre les runs bloqués en silence. Exécuté manuellement en session : **10 runs zombies repris réellement** (5 `intel-010-refresh` running, 1 queued, 4 `account_watch_refresh` running) — confirme que le problème était réel, pas théorique.
- **`pg_cron`** (`20260713061500`, migration isolée pour limiter le risque si l'extension avait été restreinte) : job `reap-stale-intelligence-runs` toutes les 10 min, appelle directement la RPC — **aucun besoin de VPS/n8n**, tout tourne dans Postgres.
- **Correctif de sécurité en passant** (`20260713062000`) : l'advisor a révélé que `reap_stale_intelligence_runs` était exécutable par `anon` ET `authenticated` via REST RPC, contredisant l'intention documentée Session 22 (« EXECUTE réservé service_role ») — le `GRANT PUBLIC` par défaut de Postgres n'avait jamais été révoqué à l'origine. Resserré (`REVOKE ... FROM public/anon/authenticated`, `GRANT ... TO service_role`) puisque la fonction venait d'être touchée — sans impact sur le cron (exécuté en tant que `postgres`, non affecté par les révocations de rôle applicatif).
- **Index unique ajouté**, décision documentée de ne pas en ajouter davantage : `(run_type, created_at desc)` sur `ai_intelligence_runs` — à 130 lignes aucun index n'apporte de gain mesurable, ajouté par anticipation de la croissance (crons de veille récurrents), pas parce que le volume actuel le justifie.
- **`database.generated.ts`** régénéré (piège déjà documenté Session 20 évité : `generate_typescript_types` renvoie un JSON `{"types": "..."}`, extrait via Python plutôt que copié tel quel).
- **Validation** : migrations appliquées et vérifiées par requêtes directes (grille de prix, vues, reaper, cron job). `npx tsc --noEmit` → EXIT 0.
- **Non fait dans cette session** : Lot 1 (onglet Santé + alertes), Lot 2 (onglet Coûts + simulateur de cadence de veille), Lot 3 (micro-modules `<WorkflowCostHint>` etc.), standardisation du callback n8n pour `intel-010-refresh`/`process_diagnostic` (n'émettent toujours pas `tokensInput/Output/modelUsed` — `has_tokens_gap=true` sur `intel-010-refresh` dans `v_workflow_cost_stats`), ajout de `n8nExecutionId` au payload de callback (pas de deep-link n8n possible tant que ce n'est pas fait).

### Session 24 (suite) — Monitoring IA & coûts : Lot 1 (2026-07-13)

- **Correctif callback `intel-010-refresh`** (2 nœuds du workflow JSON, pas de migration) : `Reconcile & Prepare Writes` reconstruit un objet explicite et ne propageait pas `llmUsage` (pourtant extrait correctement par `Parse & Validate LLM Output` : `{ inputTokens, outputTokens, model }`) ; `Prepare Callback` avait `modelUsed: 'claude-sonnet-5'` **codé en dur** (y compris quand aucun appel LLM n'avait eu lieu — cas entité juridique non résolue) et n'émettait jamais `tokensInput`/`tokensOutput`. Corrigé : `llmUsage` threadé jusqu'au callback, `modelProvider`/`modelUsed` dérivés de `recon.llmUsage` (`null` propre si pas d'appel LLM, plus de valeur fantôme), `tokensInput`/`tokensOutput` ajoutés. Validé par simulation Node des 2 branches (entité résolue avec appel LLM / entité non résolue sans appel LLM) + `node --check`. **À réimporter sur le VPS n8n** pour prendre effet (documenté dans `intel-010-refresh.SETUP.md`) — tant que ce n'est pas fait, `has_tokens_gap` reste `true` pour ce workflow dans `v_workflow_cost_stats`.
- **Découverte MCP n8n en écriture** (`n8n-mcp`, outils `n8n_update_partial_workflow` etc.) : schémas chargés mais tous les appels réels (`list_workflows`, `get_workflow`, `health_check`, `n8n_executions`) rejetés « disabled in your connector settings ». Retour à la méthode établie du projet : édition du JSON en repo, import/activation manuels par Guillaume sur le VPS.
- **Migration `enable_realtime_ai_intelligence_runs`** : `ai_intelligence_runs` n'était **pas** dans la publication `supabase_realtime` (seuls `ai_intelligence_results` et `user_notifications` l'étaient) — bloquant pour un journal d'exécution live. Ajoutée (même pattern que les 2 migrations Realtime précédentes). **Effet de bord positif découvert en passant** : `AccountScanDialog.tsx` souscrivait déjà à des événements `UPDATE` sur `ai_intelligence_runs` qui ne pouvaient jamais se déclencher faute de publication — masqué depuis toujours par son fallback de relecture à 20s. Corrigé du même coup.
- **Page `/automations` reconstruite entièrement**, remplace `SectionDashboardTemplate` + `mockAutomationsDashboardData` (100% factice — boutons "Forcer la synchronisation n8n" qui n'allaient nulle part, un des 7 pages encore sur ce gabarit générique de placeholder) :
  - **`src/lib/automations/automations-data.ts`** (nouveau) : `getAutomationsDashboardData()` — 3 requêtes parallèles (`v_workflow_health`, `ai_intelligence_runs` récents + `companies`/`profiles` embed, compteur `user_notifications` type `ai_run_reaped` 7j) puis une requête dépendante ciblée (`v_ai_run_costs` filtrée sur les IDs du journal, pas de N+1) et une dernière pour `v_workflow_cost_stats` (décoration coût par carte santé). Labels de workflow lisibles (`WORKFLOW_LABELS`, fallback sur la valeur brute si `run_type` inconnu — jamais de crash sur un nouveau workflow non documenté).
  - **`src/components/automations/`** (nouveau dossier) : `index.tsx` (server component, détection device + fetch en parallèle, pattern identique à `finance/index.tsx`) ; `AutomationsDesktopDashboard.tsx` (`DesktopAnalyticalPage` — 4 `KpiCard`, grille de cartes santé par workflow avec `StatusPill` de sévérité, rail d'alertes, `DataTable` du journal avec tri contrôlé via `sortDataTableRows`/`sort`/`onSortChange`, Realtime sur `ai_intelligence_runs` UPDATE pour refléter les transitions de statut en place sans refetch) ; `AutomationsMobileDashboard.tsx` (`MobileActionPage` + `MobileHeroInsight` taux de succès 30j + `MobileActionCard` par workflow et par run récent) ; `RunDrillDownDialog.tsx` (partagé desktop/mobile — détail run, message d'erreur, lien vers `/prospection/accounts/[companyId]` si `company_id` présent, bouton **Relancer** réel via `retryFailedRun()` → `POST /api/n8n/trigger` avec le `workflowId`/`entityType`/`entityId`/`companyId`/`input_snapshot` d'origine) ; `automations-status.ts` (règle de sévérité unique partagée cartes/alertes, formatters locaux durée/coût/temps relatif).
  - **Décision de scope assumée** : pas de bouton "Ouvrir dans n8n" fonctionnel (`n8nExecutionId` toujours absent du callback — non traité ce lot) — le drill-down affiche l'ID s'il existe un jour, sans jamais promettre un lien mort.
  - Sandbox dev `dashboard-test` non touché (consomme encore `automationsDashboardConfig`/`mockAutomationsDashboardData`, hors scope).
- **Validation** : `npx tsc --noEmit` → EXIT 0 · `npx eslint` sur tous les fichiers créés/modifiés → 0 erreur (1 warning `useRef` inutilisé auto-corrigé avant validation finale) · `npm run build` → EXIT 0, `/automations` généré en route dynamique.
- **Non fait** : Lot 2 (onglet Coûts + simulateur de cadence de veille), Lot 3 (micro-modules `<WorkflowCostHint>` sous les boutons IA), `n8nExecutionId` (deep-link n8n toujours impossible), QA visuelle réelle (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]) — à faire par Guillaume.

### Session 24 (suite) — Monitoring IA & coûts : Lot 2 (2026-07-13)

Onglet Coûts + simulateur de cadence de veille, dans la même page `/automations` (2 onglets desktop/mobile, `AutomationsTabs.tsx` — pattern repris de `FinanceTabs`).

- **Data layer étendue en un seul passage** (`automations-data.ts`) : les deux onglets partagent le même fetch initial côté serveur (changement d'onglet = état client pur, aucun refetch). Nouvelles requêtes parallélisées avec celles du Lot 1 : `v_ai_cost_timeline` (agrégée en JS par jour et par `owner_id` — noms résolus via une requête `profiles` séparée, **pas d'embed PostgREST possible sur une vue** sans métadonnée de FK, contrairement à une table) ; `account_watch_settings` (comptes actuellement sous veille + répartition par cadence, données réelles : 3 comptes, 1 `twice_weekly` + 2 `weekly`).
- **KPIs coût** (aujourd'hui / 7j / 30j+delta / cumul total) — le delta 30j vs 30j précédents n'est calculé QUE si les deux fenêtres ont des données réelles (sinon `null` explicite, jamais un delta fabriqué à partir d'une fenêtre vide — à ce stade du projet, ~1 mois d'historique total, la fenêtre précédente est souvent vide).
- **`CostTimelineChart.tsx`** (desktop, SVG, pattern `PnlBarChart` — clic pour tooltip) : distingue une barre "non mesurée" (grisée, plate) d'un vrai coût nul, jamais confondus visuellement.
- **`AutomationsMobileDashboard`** : sparkline mini en HTML/Tailwind pur (divs + `height` en %, zéro SVG/librairie) — conforme à la doctrine mobile KREDO, pas une version dégradée du chart desktop.
- **`VeilleSimulatorCard.tsx`** : calculateur interactif (comptes sous veille × cadence × coût réel moyen par run mesuré) → projection de coût mensuel + delta vs situation actuelle. Coût par workflow (barres) et par utilisateur dans le rail/les listes.
- **Piège de frontière client/serveur détecté par le build (pas par `tsc`)** : `VeilleSimulatorCard.tsx` (composant client) important des **constantes runtime** (`VEILLE_RUNS_PER_MONTH`, pas seulement des types) depuis `automations-data.ts` — un module serveur (`createClient` → `next/headers`) — faisait échouer le build Turbopack (tout le module serveur se retrouvait tiré dans le bundle client). `tsc --noEmit` ne l'avait pas détecté : seul `npm run build` l'a révélé. Corrigé en extrayant `VeilleCadence`/`VEILLE_RUNS_PER_MONTH`/`VEILLE_CADENCE_LABELS`/`VeilleSimulatorBaseline` dans un nouveau module client-safe `veille-cadence.ts` (zéro import Supabase), consommé à la fois par le serveur (`automations-data.ts`) et par le client (`VeilleSimulatorCard.tsx`). Les autres composants client de ce lot n'avaient pas ce problème — ils n'importaient que des types (`import type`, erasé à la compilation).
- **Validation** : `npx tsc --noEmit` → EXIT 0 · `npx eslint` → 0 erreur · `npm run build` → EXIT 0 (échec puis correction du piège de frontière ci-dessus, revalidé).
- **Non fait** : Lot 3 (micro-modules `<WorkflowCostHint>` sous les boutons de déclenchement IA ailleurs dans l'app), `n8nExecutionId` (deep-link n8n toujours impossible), QA visuelle réelle (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]).

### Session 25 — Optimisation page « Besoins & Staffing » (/missions/opps) (2026-07-15)

Revue perf/code/data/sécurité de `NeedsStaffingWorkspace` puis optimisation ciblée (périmètre validé avec Guillaume avant action : mobile = couper le sur-fetch ; HEX = ne pas toucher). Diagnostic clé : `page.tsx` chargeait **5 datasets / ~10 requêtes** en parallèle (dont 4 scans `opportunities` + 4 scans `opportunity_candidates`) à chaque rendu, y compris en mobile où seule la liste des besoins est affichée.

- **Chargement conditionnel par device** (`(tabbed)/opps/page.tsx`) : en mobile, seuls `getNeedsStaffingSharedData` + `getOpportunitiesList({onlyStaffingNeeds})` sont chargés (~3 requêtes au lieu de ~10) — `getOpportunitiesPlanning`/`getStaffingsList`/`getStaffingsPlanning` (jointures profondes candidats/collaborateurs/**compensation**/calendar_events) ne partent plus. Effet de bord sécurité : la donnée `collaborator_compensation` (RLS admin-only) ne transite plus dans le payload RSC mobile où elle n'est jamais affichée. Desktop inchangé (switch de vues client-side). Le composant supportait déjà `staffingData?` optionnel (`EMPTY_*` fallbacks) — aucune modif côté client nécessaire. `const state = parseNeedsStaffingUrlState(...)` mort supprimé (le workspace lit son propre état d'URL).
- **Filtre `onlyStaffingNeeds` poussé en base** : `STAFFING_NEED_OR_FILTER` (traduction PostgREST `.or(...)` de `isStaffingNeedOpportunity`) ajouté à `coverage.ts`, appliqué dans `get-opportunities-list`/`get-opportunities-planning` (conditionnel — ne casse pas `MissionsDashboardSection`/`/staffing` qui partagent ces fonctions sans l'option) et `get-needs-staffing-shared` (toujours besoins). Prédicat JS conservé en garde-fou.
- **Dédup helper company** : nouveau `src/lib/companies/resolve-company-embed.ts` (`resolveCompanyEmbed`/`resolveCompanyName`, gère embed objet|tableau|null + extraction `metadata.logo_path`) remplace 3 copies de `getCompanyName`+extraction logo dans les fichiers `missions/_data`. **Non appliqué aux fichiers `staffing/_data`** volontairement : leur fallback est `"Client inconnu"` (≠ `"Compte non renseigné"` du helper), swap = changement de texte visible sur la route orpheline `/staffing` — écarté pour préserver le comportement.
- **Simplification** : re-mapping identité mort supprimé dans `getOpportunitiesList` (`MappedRow extends MissionsListRow` → `return mapped` direct). `useMemo` sur les colonnes de `NeedsListView`.
- **Écartés (décision assumée, pas un oubli)** : dédup `cache()`/consolidation des scans (gain runtime nul à 9 opportunités, coupleraient des fonctions indépendantes = churn) ; retrait des `any` des mappers de jointure profonde `staffing/_data` (exception pragmatique déjà en place dans tout le codebase, risque de bataille compilateur pour valeur nulle) ; refonte HEX des boutons flip Kanban/Planning (choix Guillaume : ne pas toucher).
- **Validation** : `tsc --noEmit` → EXIT 0 (après purge `.next/` stale, cf. faux positifs `TS6200`/`TS2300` documentés Session 18) · `npm run build` → EXIT 0 · `vitest run` → **487/487** · `eslint` sur les 7 fichiers touchés/créés → 0 erreur, 0 warning.
- **Non fait** : QA visuelle desktop + mobile (pas de Chrome DevTools MCP, cf. [[feedback-no-chrome]]) — à faire par Guillaume, notamment vérifier que le mobile n'a rien perdu (liste besoins + KPIs).

---

## Méthode de travail attendue

1. Lire les fichiers existants AVANT d'écrire quoi que ce soit
2. Annoncer ce que tu vas faire et POURQUOI (pédagogie)
3. Exécuter, vérifier, corriger si erreur
4. Signaler tout écart avec la stack ou les règles ci-dessus
5. Pour chaque composant : préciser Data / Vue Desktop / Vue Mobile
6. Mettre à jour la section "État du codebase" après chaque session significative

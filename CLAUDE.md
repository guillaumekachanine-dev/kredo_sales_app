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

**Prochain focus :** QA visuelle desktop + mobile de la contextualisation Session 17 (13 pages + 4 entités) — pas de Chrome DevTools MCP disponible, à faire par Guillaume. Compléter le contexte d'entité sur `candidate` (`CandidateDrawer`), `sector` (`/prospection/approche-sectorielle/[slug]`), `calendar_event` (`EventDrawer` agenda) — mêmes primitives (`RegisterIntelligenceEntity` + `ENTITY_ACTION_IDS`), pas de nouveau design nécessaire. **Réconciliation CLAUDE.md ↔ Supabase live** : le audit Session 17 a trouvé 58 tables live vs 35 documentées ici (`projects`, `financial_models`, `candidate_hiring_processes`/`milestones`, `account_facts`/`account_signals`, `offer_*`, `job_profiles`, `performance_plans/criteria`, `workforce_monthly_snapshots`, `intelligence_sources`, etc. absentes de la doc) — mettre à jour le schéma documenté avant la prochaine session touchant la base, le drift est maintenant plus large que ce que `project-migration-drift.md` décrit. Route orpheline `/staffing` (page+layout encore présents, plus dans `main-menu.config.ts`, `AssistanceCaseDrawer`/`financial_models` y restent accrochés) — décider suppression ou réintégration. Lot 5 QA panneau global (Session 16) toujours en attente. Import + activation du workflow `intel-020-communication` sur le VPS n8n. Bug pré-existant `searchParams is not defined` dans `AccountsContactsViews.tsx:977`.

---

## Méthode de travail attendue

1. Lire les fichiers existants AVANT d'écrire quoi que ce soit
2. Annoncer ce que tu vas faire et POURQUOI (pédagogie)
3. Exécuter, vérifier, corriger si erreur
4. Signaler tout écart avec la stack ou les règles ci-dessus
5. Pour chaque composant : préciser Data / Vue Desktop / Vue Mobile
6. Mettre à jour la section "État du codebase" après chaque session significative

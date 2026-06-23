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

**Prochain focus :** Bug pré-existant `searchParams is not defined` dans `AccountsContactsViews.tsx:977` (onglet Comptes & contacts) — utiliser `useSearchParams()`. Migration des autres écrans (Staffing, Missions) sur le pattern Cockpit/Finance. Lot 3 — Scoring + Atelier IA, moteur de rédaction bi-grain, retrait routes orphelines.

---

## Méthode de travail attendue

1. Lire les fichiers existants AVANT d'écrire quoi que ce soit
2. Annoncer ce que tu vas faire et POURQUOI (pédagogie)
3. Exécuter, vérifier, corriger si erreur
4. Signaler tout écart avec la stack ou les règles ci-dessus
5. Pour chaque composant : préciser Data / Vue Desktop / Vue Mobile
6. Mettre à jour la section "État du codebase" après chaque session significative

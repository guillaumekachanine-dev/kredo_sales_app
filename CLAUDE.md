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
| `missions` | 16 | Contrats actifs (tjm, **cjm**, gross_margin_pct GÉNÉRÉ) |
| `mission_activity_reports` | 80 | CRA par période (billable_days, tjm_snapshot, **cjm_snapshot**) |
| `collaborator_compensation` | 16 | **Rémunération datée confidentielle** (RLS owner/admin) — source du CJM |
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

### Triggers actifs
| Trigger | Tables |
|---|---|
| `set_updated_at` | workspaces, profiles, tasks, companies, persons, contacts, collaborators, candidates, opportunities, opportunity_candidates, missions, mission_activity_reports, collaborator_compensation, **pnl_monthly** |
| `log_audit` | companies, persons, contacts, collaborators, candidates, opportunities, opportunity_candidates, collaborator_compensation, **pnl_monthly** |

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
- ⚠️ `cjm` = coût (ex-`taci`). Le `taci` désigne désormais UNIQUEMENT le taux d'activité (`collaborator_compensation.taci`)
- **Page P&L** : lire `pnl_monthly` (ORDER BY period_month DESC). Colonnes GENERATED → ne pas recalculer. `source='import'` = seed fictif, `source='cra_derived'` = donnée réelle future

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

### Dernière session
**Date :** 2026-06-14
**Travail effectué — P&L mensuel (migration 024) + réconciliation drift migrations :** audit complet de la base (34 tables live, 27 migrations, 6 tables non documentées : `job_profiles`, `sector_intelligence`, `sector_news`, `sector_events`, `sector_pain_points`, `sector_regulatory_items`). Aucune table P&L existante. Cross-check dataset fictif CSV vs CRA réels (2026-01→05) : ordres de grandeur cohérents (delta CA < 10% sur 4 mois, écart mai justifié par CRA incomplets). Écart de marge CSV(31–34%) vs CRA(36.4%) expliqué : CSV inclut coûts sous-traitants absents du schéma CRA. **Migration 024** : table `pnl_monthly` — inputs stockés (revenue, salaires, sous-traitants, charges structure), colonnes GENERATED (`gross_margin_value/percent`, `operating_profit_value/percent`) ; UNIQUE(workspace_id, period_month) ; triggers `set_updated_at` + `log_audit` ; RLS standard workspace ; colonne `source` ∈ `import/cra_derived/budget/forecast`. Seed idempotent de 12 mois (2025-06 → 2026-05). Vérifié : 12 lignes, colonnes dérivées exactes. **Réconciliation drift** : 7 fichiers locaux créés par rétro-ingénierie du remote (010b_sector_intelligence ← 5 tables DDL ; 018a_seed_collaborators_entry_dates ← 16 UPDATE ; 019a_seed_person_skills ← 75 lignes ; 020 ← 4 colonnes MAR dont GENERATED activity_rate_percent ; 021 ← 80 CRA complets 16×5 mois ; 022 ← no-op correctif ; 023 ← billing_condition + description sur missions). Docuementé : 5 tables sectorielles (sector_intelligence + 4 satellites) avec RLS `workspace_isolation FOR ALL` (≠ motif standard). Numérotation 018/019 double : slots occupés deux fois (seeds remote antérieurs aux référentiels locaux) — Supabase utilise le timestamp comme clé primaire, sans collision.

**Session précédente (2026-06-14) — RH/coût collaborateur + correction sémantique TACI (migrations 016–017) :** audit DB (base saine, 28 tables, zéro table superflue, party model + colonnes générées préservés). **Constat clé** : `collaborators` n'a jamais porté de financier ; le « coût » vivait sur `missions.taci` (~434 €) sous RLS workspace permissive. La reco Gemini (`collaborator_contracts` + RLS sur table `roles` inexistante + injection en `metadata` + shadcn charts) a été **rejetée dans son exécution** (contradiction confidentialité, stack hallucinée, table `roles` absente) mais **validée dans l'intuition** (isoler le coût RH). **Migration 016** : table `collaborator_compensation` **datée** (effective-dated, 1 ligne en vigueur/collab) avec `gross_annual`, `charges_rate`, `working_days_per_year`, **`taci` = vrai taux d'activité (0–1)**, **`cjm` GÉNÉRÉ** = `gross_annual*(1+charges_rate)/(working_days_per_year*taci)` ; helper **`is_workspace_admin()`** (security definer) ; **RLS confidentielle** owner/admin (4 policies `AND is_workspace_admin()`) ; triggers `set_updated_at` + `log_audit`. **Seed fictif** rétro-calculé depuis `metadata.test_dataset.taci_reference` (le CJM généré retombe exactement sur les coûts validés : 442/434/360… ; salaires réalistes par séniorité : junior ~31k, senior ~63k, expert ~100k) ; purge de `taci_reference`/`margin_pct_reference` hors de `metadata` (confidentialité). **Migration 017 — correction sémantique majeure** : l'ex-`taci` (un COÛT, pas un taux) renommé **`cjm`** partout. `missions.taci → missions.cjm` (colonne générée `gross_margin_pct` reconstruite sur `cjm`, marges préservées : 32/38/40 %), `mission_activity_reports.taci_snapshot → cjm_snapshot`. **Front** : 9 fichiers `src/` migrés `taci → cjm` (types, `update-mission`, `get-mission-detail`, `get-active-missions-planning`, planning types/tooltip, `MissionDetailPanel`, `CompanyIdentityDrawer`, nav) + labels (« CJ Interne (CJM) », « TJM / CJM ») ; `database.ts` régénéré (collaborator_compensation + is_workspace_admin inclus). Vérifié : seed cohérent + marges intactes en base. **Reste à faire** : brancher `MissionDetailPanel.estimatedSalary` sur `collaborator_compensation.gross_annual` (RLS) au lieu de l'heuristique CJM×218×0.65 ; hygiène d'enum `seniority` (accents/langues mélangés) ; UI RH desktop/mobile (tableau maison + barres pur Tailwind, ZÉRO lib de chart) ; spread réaliste des `entry_date` (tous à 2026-01-01 actuellement).

**Session précédente (2026-06-14) — Diagnostic process (Phase 3) dans le Cockpit Intelligence :** intégration de 3 études de diagnostic process (Robertet, DomusVi, Experis) produites par LETHIA AI hors KREDO. **Architecture duale** : `content_json` complet et fidèle au PDF (source unique pour les modules futurs) + `metadata.pdf_storage_path` pour affichage via `DocumentViewerShell` (iframe). **Stockage** : bucket privé Supabase Storage `ai_intelligence_process_diagnostics`. **Migrations 011–013** : pattern lookup-only (ILIKE, RAISE EXCEPTION si non trouvé), pas d'INSERT dans `companies` ; INSERT dans `ai_intelligence_runs` (run_type `process_diagnostic_import`) puis `ai_intelligence_results` (phase 3). **Migration 014** : Storage policy `authenticated_read_process_diagnostics` sur `storage.objects` — nécessaire pour que `createSignedUrl` fonctionne avec la clé anon + session user (sans cette policy, signed URL échoue silencieusement). **Front** : `ClientIntelligenceDesktopView` — 3e entrée dans `ANALYSIS_CATALOG` (`process`) + `ProcessDiagnosticContent` (rendu JSON fallback) + affichage `DocumentViewerShell` si `diagnosticPdfUrl` présent. Mobile : JSON fallback systématique (pas d'iframe sur mobile, ADR-0006). `intelligence-data.ts` : `parseAnalyseDiagnostic`, `diagnosticPdfUrl` via signed URL 1h, log erreur Storage en cas d'échec.

**Session précédente (2026-06-12) — thème « Cockpit Intelligence » inversé (ADR-0008) :** introduction d'une **couleur secondaire Sunshine Gold `#FFB812`** (token `--color-secondary` / `-fg`) + token de surface dédié `--color-rail` (le rail n'utilise plus `bg-heading` surchargé). Le hub `/prospection/accounts/[companyId]` reçoit un **thème immersif inversé** via un scope CSS `[data-theme="cockpit"]` (dans `globals.css`) qui redéfinit les tokens : fond cobalt, titres/chiffres en or, liens + onglet actif en or, rail en navy profond. Comme l'app est **token-driven**, la bascule se fait **sans modifier les composants**. Posé sur la racine de `ClientIntelligenceDesktopView` / `MobileView` / `loading.tsx` (`data-theme="cockpit" bg-canvas`). La **sidebar devient claire** sur ces routes (`DesktopSidebar` route-aware via `usePathname`, `pathname.startsWith("/prospection/accounts/")`) pour éviter un cobalt-sur-cobalt. Les **blocs de prose longue** (Synthèse IA, Analyse client, Étude sectorielle, Pitch) repassent sur surface claire via `SectionBlock reading` → classe `.cockpit-reading` (réinitialise les tokens en clair ; propriétés réelles `background-color`/`border-color` pour éviter l'élagage Lightning-CSS des règles 100 % custom-props). ⚠️ **Contrainte gold** : `#FFB812` échoue le contraste sur fond clair (~1,7:1) → réservé aux surfaces cobalt / texte foncé sur aplat, **jamais en encre sur clair**. Vérifié en preview (sidebar claire, fond cobalt #2554B8, titres or, panneau lecture #FBFAF6) + `tsc` clean. Mobile non exerçable en preview (device détecté par UA serveur, ADR-0006).

**Session précédente (2026-06-11) :** Rationalisation nav Prospection Intelligence — **8 onglets → 4 primaires + 1 utilitaire** (principe : 2 grains, *portefeuille* en nav / *compte* dans le hub). Nouveaux onglets : Synthèse · Comptes & contacts · Études · **Suivi** · Réglages. Scoring + Atelier IA + veille/compte → migrent dans le hub `/accounts/[companyId]` (déjà onglets lots E/H) ; radar Signaux → Synthèse (Lot 2, à faire). **Suivi** créé (action-first : KPI, échéances, **roadmap commerciale phase-4 synchronisée**, campagnes, reco IA, interactions) avec `index/DesktopView/MobileView` + `src/lib/prospection/suivi-data.ts` (mock + `// SEAM:` Supabase : tasks/sequences/interactions/ai_intelligence_results phase 4). **Réglages** (`/prospection/settings`) absorbe Sources + méthode de scoring **en lecture seule/versionnée** (gouvernance ADR-0007, pas d'édition libre) + params pitch. Routes `sequences` & `sources` supprimées (absorbées) ; `signals`/`ai-workshop`/`scoring` conservées hors-nav (cibles Lot 2/3, zéro régression). Pas d'onglet « BI » (besoin couvert par les 3 grains Synthèse/Études/Hub).
**Lot 2 fait :** Synthèse refondue en **cockpit décisionnel portefeuille** (custom `index/Desktop/Mobile`, remplace le `SectionDashboardTemplate` générique) — `src/lib/prospection/synthese-data.ts` lit des **agrégats réels Supabase** (RLS workspace) : répartition cycle de vie, secteurs chauds + score moyen, **pipeline pondéré** (`opportunities.weighted_gain`), comptes à activer (cibles/prospects triés `ai_score`). Agrégation JS (volumétrie faible ; passer à une vue SQL à l'échelle). **Radar de signaux** = mock `// SEAM` (pas de table `signals`). Primitives génériques mutualisées dans `src/components/prospection/prospection-parts.tsx` (StatusDot/ProgressBar/CompanyLink) ; `suivi-parts` les re-exporte. ⚠️ Échelle `ai_score` affichée en **/10** (ADR-0007) — open question /5 vs /10 toujours à trancher.

**Prochain focus :** Lot 3 (bloqué par parité hub lots E/H) — Scoring + Atelier IA dans le hub, moteur de rédaction en **service bi-grain** (hub 1 compte / Suivi N comptes), retrait des routes orphelines (signals/ai-workshop/scoring). Brancher les `// SEAM:` (Suivi : table `sequences` + projection `ai_intelligence_results` phase 4 ; Synthèse : flux veille → table `signals`). **Bug pré-existant à corriger** : `searchParams is not defined` dans `AccountsContactsViews.tsx:977` (onglet Comptes & contacts) — utiliser `useSearchParams()`.

---

## Méthode de travail attendue

1. Lire les fichiers existants AVANT d'écrire quoi que ce soit
2. Annoncer ce que tu vas faire et POURQUOI (pédagogie)
3. Exécuter, vérifier, corriger si erreur
4. Signaler tout écart avec la stack ou les règles ci-dessus
5. Pour chaque composant : préciser Data / Vue Desktop / Vue Mobile
6. Mettre à jour la section "État du codebase" après chaque session significative

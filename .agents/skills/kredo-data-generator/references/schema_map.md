# Kredo Database — Schema Map & Dependency Graph

> Last audit: June 2026 — 51 tables, single-tenant (workspace_id on every table)
> Supabase project: `jvzgmhvwirsbdkjpmvla` | Workspace ID: `98dcd39d-f87b-4f9d-add9-ce76d635953a`

---

## Insertion Order (topological sort)

Tables MUST be inserted in this order. Any violation will break FK constraints.

```
TIER 0 — Anchors (already exist, never generate)
  workspaces              → 1 row (the workspace)
  profiles                → 1 row (the owner)
  auth.users              → managed by Supabase Auth — never touch

TIER 1 — Reference/Catalog (seed once, rarely change)
  offer_practices         → 5 rows (Data&AI, Digital&Cloud, Agile PM, Cyber, QA)
  offer_engagement_types  → 5 rows (régie, forfait, centre_competences, conseil, audit)
  skills                  → 110+ rows (controlled vocabulary)
  sector_intelligence     → 3 rows (parfumerie, banque-finance, nutraceutique)
  job_profiles            → 6 rows (DE, DS, Cloud Arch, Lead Dev, PO, SecOps)

TIER 2 — Core Entities (persons before contacts/collabs/candidates)
  persons                 → 682 rows — THE identity backbone
  companies               → 95 rows — accounts

TIER 3 — Role Junctions (link persons to companies/roles)
  contacts                → 643 rows — person + company + job role
  collaborators           → 19 rows — person + ESN employment
  candidates              → 20 rows — person + recruitment profile

TIER 4 — Business Objects (depend on T2 + T3)
  opportunities           → 9 rows — sales pipeline
  offers                  → 4 rows — catalog items
  missions                → 19 rows — active engagements
  projects                → 3 rows — forfait projects

TIER 5 — Junction & Activity Tables (depend on T4)
  opportunity_skills      → links opp ↔ skill
  opportunity_contacts    → links opp ↔ contact
  opportunity_candidates  → links opp ↔ candidate (staffing pipeline)
  person_skills           → links person ↔ skill
  company_relationships   → links contact ↔ contact within company
  interactions            → CRM activity log
  mission_activity_reports→ monthly billing CRA
  project_phases          → forfait project phases
  project_team_members    → forfait project staffing
  collaborator_compensation → salary history
  collaborator_absences   → leave records
  offer_pricing_grids     → TJM grids
  match_scores            → AI matching results

TIER 6 — Intelligence & Calendar (depend on various T3-T5)
  sector_pain_points      → sector-linked
  sector_regulatory_items → sector-linked
  sector_news             → sector-linked (n8n automated)
  sector_events           → sector-linked (n8n automated)
  calendar_events         → links to company/contact/opp/candidate/mission
  tasks                   → links to calendar_events
  client_closures         → company fermeture periods

TIER 7 — AI/Enrichment Pipeline (empty in most cases, advanced)
  ai_intelligence_runs
  ai_intelligence_results
  ai_intelligence_logs
  intelligence_sources
  enrichment_proposals
  account_facts
  account_signals
  intelligence_source_links

TIER 8 — Recruitment Pipeline (depends on T3 candidates + T5 opp_candidates)
  candidate_hiring_processes  → tracks a candidate through hiring steps
  candidate_hiring_milestones → individual steps within a process

TIER 9 — Performance & Aggregates
  pnl_monthly                 → monthly P&L snapshots
  performance_plans           → owner bonus plan
  performance_criteria        → bonus criteria
  workforce_monthly_snapshots → monthly headcount stats
  audit_log                   → auto-generated, never insert manually
```

---

## Critical FK Map (outgoing references only)

### persons
No FKs outgoing except workspace_id. This is the ROOT identity table.

### companies
- workspace_id → workspaces
- owner_id → auth.users (the Kredo user who owns the account)
- sector_id → sector_intelligence (nullable)

### contacts
- person_id → persons (REQUIRED)
- company_id → companies (REQUIRED in practice)
- manager_contact_id → contacts (self-ref, nullable)

### collaborators
- person_id → persons (REQUIRED)
- manager_id → collaborators (self-ref, nullable)

### candidates
- person_id → persons (REQUIRED)
- practice_id → offer_practices (nullable)
- recruiter_id → auth.users (nullable)

### opportunities
- company_id → companies (REQUIRED in practice)
- sector_id → sector_intelligence (nullable)
- owner_id → auth.users

### missions
- company_id → companies (REQUIRED)
- collaborator_id → collaborators (REQUIRED)
- opportunity_id → opportunities (nullable — won deal link)

### mission_activity_reports
- mission_id → missions (REQUIRED)
- collaborator_id → collaborators (REQUIRED)

### projects
- company_id → companies (REQUIRED)
- opportunity_id → opportunities (nullable)
- offer_id → offers (nullable)
- engagement_type_id → offer_engagement_types (nullable)
- owner_id → profiles

### calendar_events
- company_id, contact_id, opportunity_id, candidate_id → nullable
- mission_id → missions (nullable)
- opportunity_candidate_id → opportunity_candidates (nullable)
- organizer_id → profiles

---

## Enum & Controlled Values

### companies.lifecycle_status
`prospect` | `client_actif` | `ancien_client`

### companies.priority
`basse` | `normale` | `haute`

### companies.sector (free text, existing)
Enseignement, Finance, Immobilier, Industrie, Oil & Gas, Public, Santé, Services, Tech

### companies.segment (free text, existing — 48 distinct values)
Notable: Arômes, Automobile, Banque & Assurance, Construction, Cosmétiques, Défense, Editeur de logiciels, Informatique, IoT, Pharmaceutique, Transport, Voyage & Séjours...

### contacts.relationship_role
`decideur` | `direction_metier` | `dsi` | `manager_technique` | `operationnel` | `prescripteur` | `utilisateur_final`

### contacts.relationship_level
`inexistant` | `faible` | `moyen` | `fort`

### contacts.status
`actif` | (others possible but actif is default)

### opportunities.stage (pipeline order)
`non_traitee` → `qualification` → `recherche_profil` → `cv_envoyes` → `entretien_client` → `contractualisation` → (win: becomes mission) | (loss: closed)

### opportunities.opportunity_type
`staffing` | `forfait` | `audit`

### opportunities.practice (full names)
`Data Intelligence & Artificial Intelligence` | `Digital & Cloud Engineering` | `Agile Product Management` | `Cybersecurity & SecOps`

### collaborators.status
`actif` | `en_mission` | `intercontrat` | `sorti`

### collaborators.practice (short names)
Cloud, Cybersecurity, Data, Design, Digital, Mobile, Product Management, Project Management, QA

### collaborators.seniority / missions.seniority
`junior` | `confirmé` | `senior` | `lead` | `expert`

### candidates.status
`nouveau` → `qualifie` → `en_process` → `propose` → `recrute` | `refuse` | `ko_manager` | `vivier` | `archive`

### candidates.source
event, headhunting, inbound, jobboard, linkedin, portfolio_platform, referral, school, school_event

### missions.status
`active` | `terminee` | `suspendue`

### missions.billing_condition
`30j_net` | `45j_fin_de_mois` | `paiement_a_reception`

### interactions.type
`changement_etape` | `proposition` | `relance` | (also: appel, email, reunion, note)

### calendar_events.event_type
appel_prospection, entretien_candidat, mailing_prospection, preparation_candidat, presentation_rt, rdv_client_suivi, rdv_prospection

### collaborator_absences.absence_type (PostgreSQL enum)
`conge_paye` | `maladie` | `autre`

### candidate_hiring_milestones.step
prequalification, tests_techniques, entretien_manager, proposition, signature, integration

### candidate_hiring_milestones.result
`en_attente` | `valide` | `refuse`

### projects.status (PostgreSQL enum: project_status)
`draft` | `active` | `completed` | `suspended` | `cancelled`

### skills.category
cloud, data, devops, fonctionnel, framework, langage, methode, soft_skill

---

## Financial Benchmarks (from existing data)

### TJM ranges (from offer_pricing_grids — 120 rows)
- Global: 160€ – 1260€
- Average band: 529€ – 584€

### Actual mission economics (from missions — 19 rows)
- Junior React: TJM 420 / CJM 231 (margin ~45%)
- QA Confirmé: TJM 480 / CJM 298 (margin ~38%)
- Senior Java: TJM 650 / CJM 442 (margin ~32%)
- Data Engineer Senior: TJM 720 / CJM 461 (margin ~36%)
- Cloud Architect Expert: TJM 950 / CJM 684 (margin ~28%)

### Salary/CJM calculation
`cjm = ROUND(gross_annual × (1 + charges_rate) / (working_days_per_year × taci), 2)`
- Default charges_rate: 0.45
- Default working_days_per_year: 218
- Default taci: 1.0

### P&L structural costs (monthly defaults)
- Management: 18,000€
- Rent: 4,500€
- IT: 2,500€

---

## Known Existing Fake Data Pattern (discovered June 2026)

The database already contains **16 fictional collaborators** seeded in a prior session, following the email convention:

```
{prenom}.{initiale_nom}.c{NN}@kredo.test
```

Examples: `julien.d.c01@kredo.test`, `sarah.m.c02@kredo.test`, ... `chloé.b.c16@kredo.test`

**Rule**: Before generating new fake collaborators, run this check to find the next available sequence number:

```sql
SELECT MAX(
  (regexp_match(primary_email, 'c(\d+)@kredo\.test'))[1]::int
) AS last_used_sequence
FROM persons
WHERE primary_email LIKE '%@kredo.test';
```

New fake collaborators should continue this sequence (`c17`, `c18`, ...) rather than starting over, UNLESS Dosta explicitly asks for a different identification scheme. This keeps the `.test` email domain as a clean, filterable marker for "known fake" records — useful for cleanup later if Dosta wants to purge demo data before going to production.

---

## Geography (PACA focus)

Existing company HQ locations: Carros, Grasse, La Garde, Puteaux, Aix-en-Provence, Nice, Sophia Antipolis, Monaco, Cannes, Mougins, Valbonne, Antibes, Mandelieu, Fréjus, Toulon, Marseille, Draguignan, Grasse, Cagnes-sur-Mer

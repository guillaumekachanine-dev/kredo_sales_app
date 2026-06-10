-- ============================================================
--  KREDO — Migration 004 : BASELINE CANONIQUE (fait foi)
--  Cible : PostgreSQL 17 / Supabase  —  Schéma : public
--  Générée le 2026-06-10 par introspection du schéma LIVE
--  (projet jvzgmhvwirsbdkjpmvla).
--
--  ⚠️  RÉSOUT LE DRIFT (ticket K-001 / risque R1)
--  Les migrations 001-003 décrivaient un schéma `sales_`/`crm_`
--  désormais ABANDONNÉ. La base live a été refondue directement
--  via le MCP sans committer de migration. CE FICHIER est la
--  source de vérité : il recrée à l'identique le schéma réel.
--  001-003 sont conservées pour l'historique uniquement.
--
--  Idempotente autant que possible (if not exists / or replace).
--  Modèle mono-tenant via workspace_id + RLS (current_workspace_id()).
-- ============================================================

-- ------------------------------------------------------------
--  0. EXTENSIONS
--     (pgvector ajouté ultérieurement en Phase 3 — recrutement)
-- ------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
--  1. FONCTIONS
-- ------------------------------------------------------------

-- Résout le workspace de l'utilisateur connecté (security definer).
create or replace function public.current_workspace_id()
 returns uuid
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select workspace_id from public.profiles where id = (select auth.uid());
$function$;

-- Met à jour updated_at à chaque UPDATE.
create or replace function public.set_updated_at()
 returns trigger
 language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Trace polymorphe dans audit_log.
create or replace function public.log_audit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, diff)
  values (
    coalesce(new.workspace_id, old.workspace_id),
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case
      when tg_op = 'DELETE' then to_jsonb(old)
      when tg_op = 'INSERT' then to_jsonb(new)
      else jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
    end
  );
  return coalesce(new, old);
end;
$function$;

-- Provisionne workspace + profile à la création d'un utilisateur Auth.
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  new_workspace_id uuid;
begin
  insert into public.workspaces (name, owner_id)
  values (coalesce(new.raw_user_meta_data->>'workspace_name', 'Espace Kredo'), new.id)
  returning id into new_workspace_id;
  insert into public.profiles (id, workspace_id, email, full_name, role)
  values (new.id, new_workspace_id, new.email, new.raw_user_meta_data->>'full_name', 'owner');
  return new;
end;
$function$;

-- ------------------------------------------------------------
--  2. TABLES  (colonnes uniquement ; contraintes en §3)
-- ------------------------------------------------------------

create table if not exists public.workspaces (
  id uuid default gen_random_uuid() not null,
  name text not null,
  owner_id uuid,
  settings jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.profiles (
  id uuid not null,
  workspace_id uuid,
  full_name text,
  email text,
  role text default 'owner'::text not null,
  ui_prefs jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.audit_log (
  id bigint generated always as identity not null,
  workspace_id uuid not null,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz default now() not null
);

create table if not exists public.persons (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  first_name text,
  last_name text,
  full_name text generated always as (TRIM(BOTH ' '::text FROM ((COALESCE(first_name, ''::text) || ' '::text) || COALESCE(last_name, ''::text)))) stored,
  primary_email text,
  phone text,
  linkedin_url text,
  location text,
  notes text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.companies (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  owner_id uuid default auth.uid(),
  name text not null,
  legal_name text,
  lifecycle_status text default 'prospect'::text not null,
  sector text,
  size_band text,
  website text,
  hq_location text,
  description text,
  priority text default 'normale'::text not null,
  health text,
  ai_score numeric,
  last_contact_at timestamptz,
  next_action_label text,
  next_action_at timestamptz,
  tags text[] default '{}'::text[] not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.contacts (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  person_id uuid not null,
  company_id uuid,
  job_title text,
  department text,
  relationship_role text,
  decision_power text,
  relationship_level text,
  status text default 'actif'::text not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.collaborators (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  person_id uuid not null,
  employee_ref text,
  status text default 'actif'::text not null,
  entry_date date,
  exit_date date,
  agency text,
  practice text,
  manager_id uuid,
  current_title text,
  seniority text,
  availability text,
  notes text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.candidates (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  person_id uuid not null,
  status text default 'nouveau'::text not null,
  seniority text,
  availability text,
  mobility text,
  expected_daily_rate numeric,
  expected_salary numeric,
  source text,
  recruiter_id uuid,
  summary text,
  internal_score numeric,
  notes text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.company_relationships (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  company_id uuid not null,
  from_contact_id uuid not null,
  to_contact_id uuid not null,
  relationship_type text not null,
  notes text,
  created_at timestamptz default now() not null
);

create table if not exists public.skills (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  name text not null,
  category text,
  aliases text[] default '{}'::text[] not null,
  created_at timestamptz default now() not null
);

create table if not exists public.person_skills (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  person_id uuid not null,
  skill_id uuid not null,
  level smallint,
  years smallint,
  last_used_year smallint,
  source text,
  confidence numeric,
  comment text,
  created_at timestamptz default now() not null
);

create table if not exists public.opportunities (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  owner_id uuid default auth.uid(),
  company_id uuid,
  title text not null,
  opportunity_type text,
  stage text default 'detection'::text not null,
  priority text default 'normale'::text not null,
  conviction smallint default 50 not null,
  source text,
  need_summary text,
  context jsonb default '{}'::jsonb not null,
  seniority text,
  location text,
  remote_policy text,
  practice text,
  target_daily_rate numeric,
  duration_days integer,
  estimated_gain numeric,
  target_margin_pct numeric,
  weighted_gain numeric generated always as (((estimated_gain * (conviction)::numeric) / 100.0)) stored,
  acv numeric generated always as (CASE WHEN ((duration_days IS NOT NULL) AND (target_daily_rate IS NOT NULL)) THEN ((duration_days)::numeric * target_daily_rate) ELSE NULL::numeric END) stored,
  start_date date,
  target_close_date date,
  next_action_label text,
  next_action_at timestamptz,
  win_reason text,
  loss_reason text,
  closed_at timestamptz,
  tags text[] default '{}'::text[] not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.opportunity_skills (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  opportunity_id uuid not null,
  skill_id uuid not null,
  importance text default 'souhaitee'::text not null,
  min_level smallint,
  min_years smallint,
  weight smallint default 1 not null,
  comment text,
  created_at timestamptz default now() not null
);

create table if not exists public.opportunity_contacts (
  workspace_id uuid default current_workspace_id() not null,
  opportunity_id uuid not null,
  contact_id uuid not null,
  role text
);

create table if not exists public.opportunity_candidates (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  opportunity_id uuid not null,
  candidate_id uuid not null,
  recruiter_id uuid,
  status text default 'identifie'::text not null,
  proposed_at timestamptz,
  sent_to_client_at timestamptz,
  client_feedback text,
  comment text,
  next_action text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.interactions (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  company_id uuid,
  contact_id uuid,
  opportunity_id uuid,
  type text not null,
  occurred_at timestamptz default now() not null,
  summary text,
  sentiment text,
  next_action text,
  details jsonb default '{}'::jsonb not null,
  author_id uuid default auth.uid(),
  created_at timestamptz default now() not null
);

create table if not exists public.missions (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  company_id uuid not null,
  collaborator_id uuid not null,
  opportunity_id uuid,
  external_ref text,
  title text not null,
  status text default 'active'::text not null,
  start_date date,
  end_date date,
  role_title text,
  practice text,
  seniority text,
  tjm numeric(10,2) not null,
  taci numeric(10,2) not null,
  gross_margin_pct numeric(5,2) generated always as (round((((tjm - taci) / NULLIF(tjm, (0)::numeric)) * (100)::numeric), 2)) stored,
  source text,
  tags text[] default '{}'::text[] not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.mission_activity_reports (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  mission_id uuid not null,
  collaborator_id uuid not null,
  period_start date not null,
  period_end date not null,
  billable_days numeric(6,2) not null,
  non_billable_days numeric(6,2) default 0 not null,
  tjm_snapshot numeric(10,2) not null,
  taci_snapshot numeric(10,2) not null,
  status text default 'validated'::text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.match_scores (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  opportunity_id uuid not null,
  person_id uuid not null,
  overall_score numeric,
  scores jsonb default '{}'::jsonb not null,
  model_version text,
  source_run_id uuid,
  created_at timestamptz default now() not null
);

create table if not exists public.tasks (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid default current_workspace_id() not null,
  title text not null,
  description text,
  type text,
  priority text default 'normal'::text not null,
  status text default 'open'::text not null,
  due_date timestamptz,
  assignee_id uuid,
  created_by uuid default auth.uid(),
  entity_type text,
  entity_id uuid,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ------------------------------------------------------------
--  3. CONTRAINTES  (PK → UNIQUE → CHECK → FK)
-- ------------------------------------------------------------

-- workspaces
alter table workspaces add constraint workspaces_pkey PRIMARY KEY (id);
alter table workspaces add constraint workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- profiles
alter table profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table profiles add constraint profiles_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'sales'::text, 'recruiter'::text, 'viewer'::text])));
alter table profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table profiles add constraint profiles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

-- audit_log
alter table audit_log add constraint audit_log_pkey PRIMARY KEY (id);
alter table audit_log add constraint audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table audit_log add constraint audit_log_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- persons
alter table persons add constraint persons_pkey PRIMARY KEY (id);
alter table persons add constraint persons_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- companies
alter table companies add constraint companies_pkey PRIMARY KEY (id);
alter table companies add constraint companies_lifecycle_status_check CHECK ((lifecycle_status = ANY (ARRAY['cible'::text, 'prospect'::text, 'client_actif'::text, 'client_dormant'::text, 'ancien_client'::text, 'partenaire'::text, 'non_prioritaire'::text, 'exclu'::text])));
alter table companies add constraint companies_priority_check CHECK ((priority = ANY (ARRAY['basse'::text, 'normale'::text, 'haute'::text])));
alter table companies add constraint companies_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table companies add constraint companies_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- contacts
alter table contacts add constraint contacts_pkey PRIMARY KEY (id);
alter table contacts add constraint contacts_decision_power_check CHECK ((decision_power = ANY (ARRAY['faible'::text, 'moyen'::text, 'fort'::text])));
alter table contacts add constraint contacts_relationship_role_check CHECK ((relationship_role = ANY (ARRAY['decideur'::text, 'prescripteur'::text, 'acheteur'::text, 'operationnel'::text, 'sponsor'::text, 'utilisateur_final'::text, 'rh'::text, 'manager_technique'::text, 'dsi'::text, 'direction_metier'::text])));
alter table contacts add constraint contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
alter table contacts add constraint contacts_person_id_fkey FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE;
alter table contacts add constraint contacts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- collaborators
alter table collaborators add constraint collaborators_pkey PRIMARY KEY (id);
alter table collaborators add constraint collaborators_person_id_key UNIQUE (person_id);
alter table collaborators add constraint collaborators_status_check CHECK ((status = ANY (ARRAY['actif'::text, 'en_mission'::text, 'intercontrat'::text, 'preavis'::text, 'sorti'::text, 'suspendu'::text])));
alter table collaborators add constraint collaborators_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES collaborators(id) ON DELETE SET NULL;
alter table collaborators add constraint collaborators_person_id_fkey FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE;
alter table collaborators add constraint collaborators_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- candidates
alter table candidates add constraint candidates_pkey PRIMARY KEY (id);
alter table candidates add constraint candidates_person_id_key UNIQUE (person_id);
alter table candidates add constraint candidates_status_check CHECK ((status = ANY (ARRAY['nouveau'::text, 'qualifie'::text, 'vivier'::text, 'propose'::text, 'en_process'::text, 'recrute'::text, 'refuse'::text, 'indisponible'::text, 'archive'::text])));
alter table candidates add constraint candidates_person_id_fkey FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE;
alter table candidates add constraint candidates_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table candidates add constraint candidates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- company_relationships
alter table company_relationships add constraint company_relationships_pkey PRIMARY KEY (id);
alter table company_relationships add constraint company_relationships_relationship_type_check CHECK ((relationship_type = ANY (ARRAY['reporte_a'::text, 'influence'::text, 'collabore_avec'::text])));
alter table company_relationships add constraint company_relationships_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
alter table company_relationships add constraint company_relationships_from_contact_id_fkey FOREIGN KEY (from_contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
alter table company_relationships add constraint company_relationships_to_contact_id_fkey FOREIGN KEY (to_contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
alter table company_relationships add constraint company_relationships_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- skills
alter table skills add constraint skills_pkey PRIMARY KEY (id);
alter table skills add constraint skills_category_check CHECK ((category = ANY (ARRAY['langage'::text, 'framework'::text, 'cloud'::text, 'data'::text, 'devops'::text, 'methode'::text, 'fonctionnel'::text, 'secteur'::text, 'soft_skill'::text, 'langue'::text, 'certification'::text])));
alter table skills add constraint skills_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- person_skills
alter table person_skills add constraint person_skills_pkey PRIMARY KEY (id);
alter table person_skills add constraint person_skills_person_id_skill_id_key UNIQUE (person_id, skill_id);
alter table person_skills add constraint person_skills_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)));
alter table person_skills add constraint person_skills_level_check CHECK (((level >= 1) AND (level <= 5)));
alter table person_skills add constraint person_skills_source_check CHECK ((source = ANY (ARRAY['cv'::text, 'entretien'::text, 'test'::text, 'manuel'::text, 'inference_ia'::text])));
alter table person_skills add constraint person_skills_years_check CHECK ((years >= 0));
alter table person_skills add constraint person_skills_person_id_fkey FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE;
alter table person_skills add constraint person_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;
alter table person_skills add constraint person_skills_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- opportunities
alter table opportunities add constraint opportunities_pkey PRIMARY KEY (id);
alter table opportunities add constraint opportunities_conviction_check CHECK (((conviction >= 0) AND (conviction <= 100)));
alter table opportunities add constraint opportunities_duration_days_check CHECK ((duration_days > 0));
alter table opportunities add constraint opportunities_opportunity_type_check CHECK ((opportunity_type = ANY (ARRAY['regie'::text, 'forfait'::text, 'centre_de_service'::text, 'conseil'::text, 'audit'::text, 'staffing'::text, 'extension'::text, 'renouvellement'::text, 'upsell'::text, 'cross_sell'::text])));
alter table opportunities add constraint opportunities_priority_check CHECK ((priority = ANY (ARRAY['basse'::text, 'normale'::text, 'haute'::text])));
alter table opportunities add constraint opportunities_stage_check CHECK ((stage = ANY (ARRAY['detection'::text, 'qualification'::text, 'besoin_confirme'::text, 'recherche_profil'::text, 'cv_envoyes'::text, 'entretien_client'::text, 'negociation'::text, 'gagne'::text, 'perdu'::text, 'abandonne'::text, 'en_cours'::text, 'cv_sent'::text, 'rt'::text, 'win'::text, 'lost'::text, 'non_traitee'::text])));
alter table opportunities add constraint opportunities_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
alter table opportunities add constraint opportunities_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table opportunities add constraint opportunities_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- opportunity_skills
alter table opportunity_skills add constraint opportunity_skills_pkey PRIMARY KEY (id);
alter table opportunity_skills add constraint opportunity_skills_opportunity_id_skill_id_key UNIQUE (opportunity_id, skill_id);
alter table opportunity_skills add constraint opportunity_skills_importance_check CHECK ((importance = ANY (ARRAY['indispensable'::text, 'souhaitee'::text, 'bonus'::text])));
alter table opportunity_skills add constraint opportunity_skills_min_level_check CHECK (((min_level >= 1) AND (min_level <= 5)));
alter table opportunity_skills add constraint opportunity_skills_min_years_check CHECK ((min_years >= 0));
alter table opportunity_skills add constraint opportunity_skills_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE;
alter table opportunity_skills add constraint opportunity_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;
alter table opportunity_skills add constraint opportunity_skills_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- opportunity_contacts
alter table opportunity_contacts add constraint opportunity_contacts_pkey PRIMARY KEY (opportunity_id, contact_id);
alter table opportunity_contacts add constraint opportunity_contacts_role_check CHECK ((role = ANY (ARRAY['sponsor'::text, 'decideur'::text, 'manager_operationnel'::text, 'acheteur'::text, 'rh'::text, 'contact_technique'::text, 'validateur_final'::text])));
alter table opportunity_contacts add constraint opportunity_contacts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
alter table opportunity_contacts add constraint opportunity_contacts_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE;
alter table opportunity_contacts add constraint opportunity_contacts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- opportunity_candidates
alter table opportunity_candidates add constraint opportunity_candidates_pkey PRIMARY KEY (id);
alter table opportunity_candidates add constraint opportunity_candidates_opportunity_id_candidate_id_key UNIQUE (opportunity_id, candidate_id);
alter table opportunity_candidates add constraint opportunity_candidates_status_check CHECK ((status = ANY (ARRAY['identifie'::text, 'preselectionne'::text, 'propose_interne'::text, 'envoye_client'::text, 'entretien_planifie'::text, 'entretien_realise'::text, 'retenu'::text, 'refuse_client'::text, 'refuse_candidat'::text, 'abandonne'::text])));
alter table opportunity_candidates add constraint opportunity_candidates_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE;
alter table opportunity_candidates add constraint opportunity_candidates_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE;
alter table opportunity_candidates add constraint opportunity_candidates_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table opportunity_candidates add constraint opportunity_candidates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- interactions
alter table interactions add constraint interactions_pkey PRIMARY KEY (id);
alter table interactions add constraint interactions_sentiment_check CHECK ((sentiment = ANY (ARRAY['positif'::text, 'neutre'::text, 'negatif'::text])));
alter table interactions add constraint interactions_type_check CHECK ((type = ANY (ARRAY['appel'::text, 'email'::text, 'rdv'::text, 'linkedin'::text, 'dejeuner'::text, 'evenement'::text, 'relance'::text, 'negociation'::text, 'envoi_offre'::text, 'reunion'::text, 'autre'::text])));
alter table interactions add constraint interactions_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table interactions add constraint interactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
alter table interactions add constraint interactions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
alter table interactions add constraint interactions_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL;
alter table interactions add constraint interactions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- missions
alter table missions add constraint missions_pkey PRIMARY KEY (id);
alter table missions add constraint missions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'ended'::text, 'cancelled'::text])));
alter table missions add constraint missions_taci_check CHECK ((taci >= (0)::numeric));
alter table missions add constraint missions_tjm_check CHECK ((tjm > (0)::numeric));
alter table missions add constraint missions_collaborator_id_fkey FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE RESTRICT;
alter table missions add constraint missions_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
alter table missions add constraint missions_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL;
alter table missions add constraint missions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- mission_activity_reports
alter table mission_activity_reports add constraint mission_activity_reports_pkey PRIMARY KEY (id);
alter table mission_activity_reports add constraint mission_activity_reports_billable_days_check CHECK ((billable_days >= (0)::numeric));
alter table mission_activity_reports add constraint mission_activity_reports_non_billable_days_check CHECK ((non_billable_days >= (0)::numeric));
alter table mission_activity_reports add constraint mission_activity_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'validated'::text, 'rejected'::text])));
alter table mission_activity_reports add constraint mission_activity_reports_taci_snapshot_check CHECK ((taci_snapshot >= (0)::numeric));
alter table mission_activity_reports add constraint mission_activity_reports_tjm_snapshot_check CHECK ((tjm_snapshot > (0)::numeric));
alter table mission_activity_reports add constraint mission_activity_reports_collaborator_id_fkey FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE RESTRICT;
alter table mission_activity_reports add constraint mission_activity_reports_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE;
alter table mission_activity_reports add constraint mission_activity_reports_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- match_scores
alter table match_scores add constraint match_scores_pkey PRIMARY KEY (id);
alter table match_scores add constraint match_scores_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE;
alter table match_scores add constraint match_scores_person_id_fkey FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE;
alter table match_scores add constraint match_scores_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- tasks
alter table tasks add constraint tasks_pkey PRIMARY KEY (id);
alter table tasks add constraint tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])));
alter table tasks add constraint tasks_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text, 'cancelled'::text])));
alter table tasks add constraint tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table tasks add constraint tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table tasks add constraint tasks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- ------------------------------------------------------------
--  4. INDEX
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_log USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_workspace_date ON public.audit_log USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates USING btree (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_candidates_workspace ON public.candidates USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_manager ON public.collaborators USING btree (manager_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_workspace ON public.collaborators USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_companies_lifecycle ON public.companies USING btree (workspace_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_companies_tags ON public.companies USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_companies_workspace ON public.companies USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_comprel_company ON public.company_relationships USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_person ON public.contacts USING btree (person_id);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON public.contacts USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_interactions_company ON public.interactions USING btree (company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_opp ON public.interactions USING btree (opportunity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_opp ON public.match_scores USING btree (opportunity_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_person ON public.match_scores USING btree (person_id);
CREATE INDEX IF NOT EXISTS idx_mission_activity_reports_collaborator ON public.mission_activity_reports USING btree (collaborator_id);
CREATE INDEX IF NOT EXISTS idx_mission_activity_reports_workspace_period ON public.mission_activity_reports USING btree (workspace_id, period_start);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mission_activity_reports_mission_period ON public.mission_activity_reports USING btree (mission_id, period_start);
CREATE INDEX IF NOT EXISTS idx_missions_collaborator ON public.missions USING btree (collaborator_id);
CREATE INDEX IF NOT EXISTS idx_missions_company ON public.missions USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_missions_workspace_status ON public.missions USING btree (workspace_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_missions_workspace_external_ref ON public.missions USING btree (workspace_id, external_ref) WHERE (external_ref IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON public.opportunities USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities USING btree (workspace_id, stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_workspace ON public.opportunities USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_oppcand_candidate ON public.opportunity_candidates USING btree (candidate_id);
CREATE INDEX IF NOT EXISTS idx_oppskills_skill ON public.opportunity_skills USING btree (skill_id);
CREATE INDEX IF NOT EXISTS idx_person_skills_skill ON public.person_skills USING btree (skill_id);
CREATE INDEX IF NOT EXISTS idx_persons_workspace ON public.persons USING btree (workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_persons_email ON public.persons USING btree (workspace_id, lower(primary_email)) WHERE (primary_email IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_profiles_workspace ON public.profiles USING btree (workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_skills_name ON public.skills USING btree (workspace_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks USING btree (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON public.tasks USING btree (workspace_id, status, due_date);

-- ------------------------------------------------------------
--  5. TRIGGERS
-- ------------------------------------------------------------
-- updated_at
create trigger trg_workspaces_updated_at before update on public.workspaces for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function set_updated_at();
create trigger trg_persons_updated_at before update on public.persons for each row execute function set_updated_at();
create trigger trg_companies_updated_at before update on public.companies for each row execute function set_updated_at();
create trigger trg_contacts_updated_at before update on public.contacts for each row execute function set_updated_at();
create trigger trg_collaborators_updated_at before update on public.collaborators for each row execute function set_updated_at();
create trigger trg_candidates_updated_at before update on public.candidates for each row execute function set_updated_at();
create trigger trg_opportunities_updated_at before update on public.opportunities for each row execute function set_updated_at();
create trigger trg_oppcand_updated_at before update on public.opportunity_candidates for each row execute function set_updated_at();
create trigger trg_tasks_updated_at before update on public.tasks for each row execute function set_updated_at();

-- audit (entités traçées)
create trigger trg_audit_persons after insert or delete or update on public.persons for each row execute function log_audit();
create trigger trg_audit_companies after insert or delete or update on public.companies for each row execute function log_audit();
create trigger trg_audit_contacts after insert or delete or update on public.contacts for each row execute function log_audit();
create trigger trg_audit_collaborators after insert or delete or update on public.collaborators for each row execute function log_audit();
create trigger trg_audit_candidates after insert or delete or update on public.candidates for each row execute function log_audit();
create trigger trg_audit_opportunities after insert or delete or update on public.opportunities for each row execute function log_audit();
create trigger trg_audit_opportunity_candidates after insert or delete or update on public.opportunity_candidates for each row execute function log_audit();

-- provisioning utilisateur (sur auth.users — schéma géré par Supabase Auth)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
--  6. RLS  (activation + policies)
--     Motif standard : workspace_id = current_workspace_id()
-- ------------------------------------------------------------
alter table workspaces enable row level security;
alter table profiles enable row level security;
alter table audit_log enable row level security;
alter table persons enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table collaborators enable row level security;
alter table candidates enable row level security;
alter table company_relationships enable row level security;
alter table skills enable row level security;
alter table person_skills enable row level security;
alter table opportunities enable row level security;
alter table opportunity_skills enable row level security;
alter table opportunity_contacts enable row level security;
alter table opportunity_candidates enable row level security;
alter table interactions enable row level security;
alter table missions enable row level security;
alter table mission_activity_reports enable row level security;
alter table match_scores enable row level security;
alter table tasks enable row level security;

create policy audit_select_workspace on audit_log as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy candidates_delete on candidates as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy candidates_insert on candidates as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy candidates_select on candidates as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy candidates_update on candidates as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy collaborators_delete on collaborators as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy collaborators_insert on collaborators as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy collaborators_select on collaborators as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy collaborators_update on collaborators as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy companies_delete on companies as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy companies_insert on companies as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy companies_select on companies as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy companies_update on companies as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy company_relationships_delete on company_relationships as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy company_relationships_insert on company_relationships as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy company_relationships_select on company_relationships as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy company_relationships_update on company_relationships as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy contacts_delete on contacts as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy contacts_insert on contacts as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy contacts_select on contacts as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy contacts_update on contacts as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy interactions_delete on interactions as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy interactions_insert on interactions as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy interactions_select on interactions as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy interactions_update on interactions as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy match_scores_delete on match_scores as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy match_scores_insert on match_scores as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy match_scores_select on match_scores as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy match_scores_update on match_scores as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy mission_activity_reports_delete on mission_activity_reports as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy mission_activity_reports_insert on mission_activity_reports as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy mission_activity_reports_select on mission_activity_reports as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy mission_activity_reports_update on mission_activity_reports as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy missions_delete on missions as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy missions_insert on missions as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy missions_select on missions as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy missions_update on missions as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy opportunities_delete on opportunities as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy opportunities_insert on opportunities as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy opportunities_select on opportunities as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy opportunities_update on opportunities as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy opportunity_candidates_delete on opportunity_candidates as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy opportunity_candidates_insert on opportunity_candidates as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy opportunity_candidates_select on opportunity_candidates as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy opportunity_candidates_update on opportunity_candidates as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy opportunity_contacts_delete on opportunity_contacts as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy opportunity_contacts_insert on opportunity_contacts as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy opportunity_contacts_select on opportunity_contacts as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy opportunity_contacts_update on opportunity_contacts as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy opportunity_skills_delete on opportunity_skills as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy opportunity_skills_insert on opportunity_skills as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy opportunity_skills_select on opportunity_skills as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy opportunity_skills_update on opportunity_skills as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy person_skills_delete on person_skills as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy person_skills_insert on person_skills as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy person_skills_select on person_skills as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy person_skills_update on person_skills as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy persons_delete on persons as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy persons_insert on persons as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy persons_select on persons as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy persons_update on persons as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy profiles_select_workspace on profiles as permissive for select to public using (((workspace_id = current_workspace_id()) OR (id = ( SELECT auth.uid() AS uid))));
create policy profiles_update_self on profiles as permissive for update to public using ((id = ( SELECT auth.uid() AS uid))) with check ((id = ( SELECT auth.uid() AS uid)));
create policy skills_delete on skills as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy skills_insert on skills as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy skills_select on skills as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy skills_update on skills as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy tasks_delete on tasks as permissive for delete to public using ((workspace_id = current_workspace_id()));
create policy tasks_insert on tasks as permissive for insert to public with check ((workspace_id = current_workspace_id()));
create policy tasks_select on tasks as permissive for select to public using ((workspace_id = current_workspace_id()));
create policy tasks_update on tasks as permissive for update to public using ((workspace_id = current_workspace_id())) with check ((workspace_id = current_workspace_id()));
create policy workspaces_select_own on workspaces as permissive for select to public using ((id = current_workspace_id()));
create policy workspaces_update_owner on workspaces as permissive for update to public using (((id = current_workspace_id()) AND (owner_id = ( SELECT auth.uid() AS uid)))) with check ((id = current_workspace_id()));

-- ------------------------------------------------------------
--  7. VUE  — revenu trimestriel par mission (delivery / finance)
-- ------------------------------------------------------------
create or replace view v_mission_quarterly_revenue as
  SELECT mar.workspace_id,
    date_trunc('quarter'::text, mar.period_start::timestamp with time zone)::date AS quarter_start,
    concat('T', EXTRACT(quarter FROM mar.period_start)::integer, ' ', EXTRACT(year FROM mar.period_start)::integer) AS quarter_label,
    m.id AS mission_id,
    m.external_ref,
    m.title AS mission_title,
    m.status AS mission_status,
    c.id AS company_id,
    c.name AS company_name,
    p.id AS person_id,
    p.full_name AS consultant_name,
    col.id AS collaborator_id,
    col.employee_ref,
    m.role_title,
    m.practice,
    m.seniority,
    sum(mar.billable_days) AS billable_days,
    round(sum(mar.billable_days * mar.tjm_snapshot), 2) AS revenue,
    round(sum(mar.billable_days * mar.taci_snapshot), 2) AS cost,
    round(sum(mar.billable_days * (mar.tjm_snapshot - mar.taci_snapshot)), 2) AS gross_margin,
    round(sum(mar.billable_days * (mar.tjm_snapshot - mar.taci_snapshot)) / NULLIF(sum(mar.billable_days * mar.tjm_snapshot), 0::numeric) * 100::numeric, 2) AS gross_margin_pct
   FROM mission_activity_reports mar
     JOIN missions m ON m.id = mar.mission_id
     JOIN companies c ON c.id = m.company_id
     JOIN collaborators col ON col.id = mar.collaborator_id
     JOIN persons p ON p.id = col.person_id
  GROUP BY mar.workspace_id, (date_trunc('quarter'::text, mar.period_start::timestamp with time zone)::date), (EXTRACT(quarter FROM mar.period_start)::integer), (EXTRACT(year FROM mar.period_start)::integer), m.id, c.id, p.id, col.id;

-- ============================================================
--  FIN — Migration 004 baseline canonique
-- ============================================================

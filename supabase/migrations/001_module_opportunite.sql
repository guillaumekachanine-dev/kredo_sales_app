-- ============================================================
--  KREDO — Migration 001 : Module Opportunité (le pivot)
--  Cible : PostgreSQL / Supabase  —  Schéma : public
--  Convention de nommage : prefixe par domaine (crm_, sales_, ...)
--  À exécuter dans : Supabase Studio > SQL Editor
-- ============================================================


-- ------------------------------------------------------------
--  0. TYPES ÉNUMÉRÉS  (les « listes fermées »)
--     Prefixés par domaine pour éviter toute collision future.
-- ------------------------------------------------------------

create type sales_stage as enum (
  'demande',        -- le besoin vient d'arriver
  'qualification',  -- on creuse le besoin avec le client
  'envoi_cv',       -- CV poussés au client
  'rt',             -- rendez-vous technique du candidat
  'signature'       -- contractualisation en cours
);

create type sales_outcome as enum (
  'gagnee',
  'perdue',
  'abandonnee'
);

create type sales_priority as enum (
  'haute',
  'moyenne',
  'basse'
);

create type sales_skill_importance as enum (
  'indispensable',
  'souhaitee',
  'bonus'
);

create type crm_contact_role as enum (
  'decisionnaire',
  'operationnel',
  'prescripteur',
  'achat'
);


-- ------------------------------------------------------------
--  1. DOMAINE CRM  (minimal — on l'étoffera ensuite)
-- ------------------------------------------------------------

create table crm_accounts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) default auth.uid(),
  name        text not null,
  sector      text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table crm_contacts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) default auth.uid(),
  account_id  uuid references crm_accounts (id) on delete set null,
  full_name   text not null,
  job_title   text,
  email       text,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ------------------------------------------------------------
--  2. DOMAINE SALES — table pivot : sales_opportunities
-- ------------------------------------------------------------

create table sales_opportunities (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users (id) default auth.uid(),
  account_id         uuid not null references crm_accounts (id) on delete restrict,

  -- Identité du besoin
  title              text not null,
  need_summary       text,                 -- résumé court, affiché dans le pipe
  need_detail        text,                 -- fiche de poste détaillée (futur référentiel matching CV)
  client_context     text,                 -- environnement entreprise / équipe client
  engagement_notes   text,                 -- relation commerciale, niveau d'engagement requis

  -- Données commerciales
  stage              sales_stage    not null default 'demande',
  outcome            sales_outcome,        -- NULL = opportunité encore ouverte
  priority           sales_priority not null default 'moyenne',
  conviction         smallint not null default 50
                       check (conviction between 0 and 100),  -- % de probabilité de gagner
  target_daily_rate  numeric(8,2),         -- TJ cible (€)
  estimated_gain     numeric(12,2),        -- gain estimé (€)

  -- Pipe pondéré calculé AUTOMATIQUEMENT par la base
  weighted_gain      numeric(12,2) generated always as
                       (estimated_gain * conviction / 100.0) stored,

  target_close_date  date,                 -- date de closing visée

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);


-- ------------------------------------------------------------
--  3. sales_opportunity_skills  (1 opportunité -> N compétences)
-- ------------------------------------------------------------

create table sales_opportunity_skills (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) default auth.uid(),
  opportunity_id  uuid not null references sales_opportunities (id) on delete cascade,
  skill_name      text not null,
  importance      sales_skill_importance not null default 'souhaitee',
  min_years       smallint check (min_years >= 0),  -- expérience minimale attendue
  created_at      timestamptz not null default now()
);


-- ------------------------------------------------------------
--  4. sales_opportunity_contacts  (liaison N:N opportunité <-> contact)
-- ------------------------------------------------------------

create table sales_opportunity_contacts (
  opportunity_id  uuid not null references sales_opportunities (id) on delete cascade,
  contact_id      uuid not null references crm_contacts (id)        on delete cascade,
  owner_id        uuid not null references auth.users (id) default auth.uid(),
  role            crm_contact_role,
  primary key (opportunity_id, contact_id)   -- la paire constitue l'identité de la ligne
);


-- ------------------------------------------------------------
--  5. sales_opportunity_events  (timeline : 1 opportunité -> N événements)
-- ------------------------------------------------------------

create table sales_opportunity_events (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) default auth.uid(),
  opportunity_id  uuid not null references sales_opportunities (id) on delete cascade,
  event_type      text not null,   -- 'echange', 'changement_etape', 'note', 'relance'...
  body            text,
  occurred_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);


-- ------------------------------------------------------------
--  6. INDEX  (accélèrent les recherches fréquentes)
-- ------------------------------------------------------------

create index idx_sales_opportunities_owner   on sales_opportunities       (owner_id);
create index idx_sales_opportunities_account on sales_opportunities       (account_id);
create index idx_sales_opportunities_stage   on sales_opportunities       (stage);
create index idx_sales_oppskills_opp         on sales_opportunity_skills  (opportunity_id);
create index idx_sales_oppevents_opp         on sales_opportunity_events  (opportunity_id);
create index idx_crm_contacts_account        on crm_contacts              (account_id);


-- ------------------------------------------------------------
--  7. TRIGGER : met à jour updated_at automatiquement
--     Fonction utilitaire partagée par toutes les briques.
-- ------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_crm_accounts_updated        before update on crm_accounts
  for each row execute function set_updated_at();
create trigger trg_crm_contacts_updated        before update on crm_contacts
  for each row execute function set_updated_at();
create trigger trg_sales_opportunities_updated before update on sales_opportunities
  for each row execute function set_updated_at();


-- ------------------------------------------------------------
--  8. RLS — Row Level Security
--     La base garantit : « je ne vois et ne touche QUE mes
--     propres lignes », même en cas de bug côté code.
-- ------------------------------------------------------------

alter table crm_accounts              enable row level security;
alter table crm_contacts              enable row level security;
alter table sales_opportunities       enable row level security;
alter table sales_opportunity_skills  enable row level security;
alter table sales_opportunity_contacts enable row level security;
alter table sales_opportunity_events  enable row level security;

create policy owner_all on crm_accounts
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy owner_all on crm_contacts
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy owner_all on sales_opportunities
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy owner_all on sales_opportunity_skills
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy owner_all on sales_opportunity_contacts
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy owner_all on sales_opportunity_events
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ============================================================
--  FIN DE LA MIGRATION 001
-- ============================================================

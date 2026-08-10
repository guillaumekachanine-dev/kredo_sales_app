-- =============================================================================
-- 067 — Socle de profondeur de compte (ADR-0019, Lot 0)
-- =============================================================================
-- Introduit l'axe UNIQUE de profondeur d'un compte (mapped → noted → qualified
-- → active), sa traçabilité d'origine, la clé de déduplication qui protège le
-- CRM de l'ingestion des cartographies concurrentielles, et la table d'analyse
-- cartographique.
--
-- Axes VOLONTAIREMENT distincts, ne jamais fusionner :
--   depth_level      = profondeur de traitement       (ce fichier)
--   knowledge_state  = provenance FOLIO vs moteur     (legacy/hybrid/native)
--   relation_type    = statut relationnel commercial  (§5.8, migration 066)
--
-- Rollback :
--   drop table public.competitive_map_entries;
--   drop index public.companies_siren_unique_idx, public.companies_name_normalized_idx,
--              public.companies_depth_sector_idx;
--   drop trigger trg_companies_touch_depth on public.companies;
--   drop function private.companies_touch_depth_changed_at();
--   alter table public.companies drop column name_normalized, drop column origin,
--     drop column depth_changed_at, drop column depth_level;
--   drop function public.kredo_normalize_company_name(text);
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Normalisation de nom — prérequis de la colonne générée
-- -----------------------------------------------------------------------------
-- `unaccent(text)` (1 argument) est STABLE : il dépend du dictionnaire courant,
-- donc inutilisable dans une colonne GENERATED. La forme à 2 arguments avec
-- regdictionary explicite est IMMUTABLE — c'est elle qu'il faut, et c'est le
-- piège qui fait échouer l'ALTER si on l'ignore.
create or replace function public.kredo_normalize_company_name(txt text)
returns text
language sql
immutable
parallel safe
set search_path to ''
as $function$
  select nullif(
    btrim(
      regexp_replace(
        lower(public.unaccent('public.unaccent'::regdictionary, coalesce(txt, ''))),
        '[^a-z0-9]+', ' ', 'g'
      )
    ),
    ''
  )
$function$;

comment on function public.kredo_normalize_company_name(text) is
  'Clé de rapprochement de raison sociale : minuscules, sans accent, ponctuation réduite à un espace. IMMUTABLE — requis par companies.name_normalized.';

-- -----------------------------------------------------------------------------
-- B. Les colonnes du socle
-- -----------------------------------------------------------------------------
alter table public.companies
  add column depth_level text not null default 'noted'
    check (depth_level in ('mapped','noted','qualified','active')),
  add column depth_changed_at timestamptz,
  add column origin text not null default 'manual'
    check (origin in ('manual','competitive_map','scan','import','folio')),
  add column name_normalized text
    generated always as (public.kredo_normalize_company_name(name)) stored;

comment on column public.companies.depth_level is
  'Profondeur de traitement du compte. mapped = cité par une cartographie, aucune donnée canonique, hors stats et hors combobox. noted = pense-bête CRM. qualified = socle vérifié (scan appliqué). active = chaîne de décision ADR-0012 engagée. Monotone croissant : ne redescend jamais automatiquement.';
comment on column public.companies.origin is
  'Ce qui a fait naître la fiche. competitive_map = créée par ingestion d''une cartographie concurrentielle.';
comment on column public.companies.name_normalized is
  'Clé de déduplication non contraignante. Le SIREN reste la seule unicité dure ; ceci sert au rapprochement flou à l''ingestion.';

-- -----------------------------------------------------------------------------
-- C. depth_changed_at se maintient tout seul
-- -----------------------------------------------------------------------------
create or replace function private.companies_touch_depth_changed_at()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if new.depth_level is distinct from old.depth_level then
    new.depth_changed_at := now();
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_companies_touch_depth on public.companies;
create trigger trg_companies_touch_depth
  before update of depth_level on public.companies
  for each row execute function private.companies_touch_depth_changed_at();

-- -----------------------------------------------------------------------------
-- D. Backfill des 96 comptes existants
-- -----------------------------------------------------------------------------
-- Aucun `mapped` : aucune cartographie n'a encore été ingérée.
-- `active` prime sur `qualified` (l'axe est monotone, on retient le plus haut).
-- Résultat constaté : 29 active, 67 noted, 0 qualified (les 3 comptes porteurs
-- d'un SIREN ont tous déjà un artefact d'intelligence).
update public.companies c set
  depth_level = case
    when coalesce((
           select ais.has_client_analysis or ais.has_sector_analysis or ais.has_roadmap
             from public.v_ai_intelligence_summary ais
            where ais.company_id = c.id), false)
      or coalesce((
           select aws.is_enabled
             from public.account_watch_settings aws
            where aws.company_id = c.id), false)
      or exists (select 1 from public.account_issues ai where ai.company_id = c.id)
      or exists (select 1 from public.ai_intelligence_results r
                  where r.company_id = c.id
                    and r.status = 'succeeded'::ai_result_status
                    and r.result_type = 'commercial_strategy')
      then 'active'
    when c.siren is not null then 'qualified'
    else 'noted'
  end,
  origin = 'import',
  depth_changed_at = now();

-- -----------------------------------------------------------------------------
-- E. Déduplication
-- -----------------------------------------------------------------------------
-- Vérifié avant écriture : 0 doublon de SIREN sur les 96 comptes.
create unique index companies_siren_unique_idx
  on public.companies (workspace_id, siren) where siren is not null;
create index companies_name_normalized_idx
  on public.companies (workspace_id, name_normalized);
create index companies_depth_sector_idx
  on public.companies (workspace_id, sector_id, depth_level);

-- -----------------------------------------------------------------------------
-- F. competitive_map_entries — l'analyse cartographique, et rien d'autre
-- -----------------------------------------------------------------------------
-- Ne porte AUCUN chiffre d'affaires ni effectif : ces faits, explicitement
-- « provisoires / non audités » dans les livrables, vont dans account_facts
-- avec leur provenance et leurs sources. Les colonnes canoniques de companies
-- ne sont remplies qu'à la conversion, après passage du scan.
create table public.competitive_map_entries (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null default private.current_workspace_id()
                         references public.workspaces(id) on delete cascade,
  company_id           uuid not null references public.companies(id) on delete cascade,
  sector_id            uuid not null references public.sector_intelligence(id) on delete restrict,
  segment_id           uuid references public.sector_intelligence(id) on delete restrict,
  is_benchmark_account boolean not null default false,
  category             text not null check (category in
                         ('leader','challenger','mid_market','outsider_emergent','outsider_niche')),
  positioning          text,
  forces               text,
  vulnerabilite        text,
  angle_entree         text,
  empreinte_metier     smallint check (empreinte_metier between 1 and 5),
  maturite_numerique   smallint check (maturite_numerique between 1 and 5),
  appetence_score      smallint check (appetence_score between 0 and 35),
  appetence_provisoire boolean not null default true,
  confiance            text not null check (confiance in ('haute','moyenne','faible')),
  source_document_id   uuid references public.intelligence_documents(id) on delete set null,
  study_snapshot_date  date not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint cme_unique_par_etude unique (company_id, sector_id, study_snapshot_date)
);

comment on table public.competitive_map_entries is
  'Une ligne = un compte tel que la cartographie concurrentielle d''un secteur l''a analysé, à une date de snapshot. Porte l''analyse, jamais les faits chiffrés (→ account_facts).';
comment on column public.competitive_map_entries.is_benchmark_account is
  'Le compte étalon de l''étude (★ dans les livrables).';
comment on column public.competitive_map_entries.appetence_provisoire is
  'TRUE tant que la composante accessibilité n''a pas été auditée compte par compte. Doit rester visible à l''écran : un score provisoire ne se cite pas en rendez-vous.';
comment on column public.competitive_map_entries.study_snapshot_date is
  'Date de snapshot de l''étude. Dans la clé d''unicité : une nouvelle passe crée une nouvelle ligne, elle n''écrase pas la précédente.';

create index cme_company_idx   on public.competitive_map_entries (company_id);
create index cme_sector_idx    on public.competitive_map_entries (sector_id, category);
create index cme_workspace_idx on public.competitive_map_entries (workspace_id);
create index cme_segment_idx   on public.competitive_map_entries (segment_id);
create index cme_document_idx  on public.competitive_map_entries (source_document_id);

create trigger trg_competitive_map_entries_updated_at
  before update on public.competitive_map_entries
  for each row execute function private.set_updated_at();

alter table public.competitive_map_entries enable row level security;

create policy workspace_isolation on public.competitive_map_entries for all
  using (workspace_id = (select private.current_workspace_id()))
  with check (workspace_id = (select private.current_workspace_id()));

grant select, insert, update, delete
  on public.competitive_map_entries to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- G. v_crm_account_list — la taxonomie et la profondeur entrent dans la vue
-- -----------------------------------------------------------------------------
-- Le commit 07b49c88 récupérait sector_id/segment_id/tier/regime_achat par une
-- SECONDE requête `companies` jointe en JavaScript, ce qui défaisait l'audit de
-- performance Lot 5 (et dont les deux `limit` divergeaient : 300 vs 1000).
-- Les colonnes reviennent dans la vue, l'application n'a plus qu'une requête.
create or replace view public.v_crm_account_list as
 SELECT c.id,
    c.name,
    c.sector,
    c.segment,
    c.revenue,
    c.employee_count,
    c.size_band,
    c.hq_location,
    c.priority,
    c.lifecycle_status,
    c.legacy_folio_score,
    c.website,
    c.description,
    c.meta_logo_path AS logo_path,
    (c.meta_contact_stats ->> 'nb_contacts'::text)::integer AS nb_contacts,
    (c.meta_contact_stats ->> 'nb_with_email'::text)::integer AS nb_with_email,
    c.meta_has_study AS has_study,
    si.name AS sector_attachment_name,
    COALESCE(aws.is_enabled, false) AS has_dedicated_watch,
    COALESCE(ais.has_client_analysis, false) AS has_client_analysis,
    COALESCE(ais.has_sector_analysis, false) AS has_sector_analysis,
    COALESCE(ais.has_process_diagnostic, false) AS has_process_diagnostic,
    COALESCE(ais.has_roadmap, false) AS has_roadmap,
    COALESCE(ais.has_legacy_analysis, false) AS has_legacy_analysis,
    COALESCE(ais.has_legacy_sector, false) AS has_legacy_sector,
    (EXISTS ( SELECT 1
           FROM account_issues ai
          WHERE ai.company_id = c.id AND ai.status = 'open'::account_issue_status)) AS has_account_issues,
    (EXISTS ( SELECT 1
           FROM ai_intelligence_results air
          WHERE air.company_id = c.id AND air.status = 'succeeded'::ai_result_status AND air.result_type = 'commercial_strategy'::text)) AS has_commercial_strategy,
    c.sector_id,
    c.segment_id,
    si.name  AS sector_name,
    seg.name AS segment_name,
    c.tier,
    c.regime_achat,
    c.relation_type,
    c.depth_level,
    c.origin
   FROM companies c
     LEFT JOIN sector_intelligence si  ON si.id  = c.sector_id
     LEFT JOIN sector_intelligence seg ON seg.id = c.segment_id
     LEFT JOIN account_watch_settings aws ON aws.company_id = c.id
     LEFT JOIN v_ai_intelligence_summary ais ON ais.company_id = c.id;

alter view public.v_crm_account_list set (security_invoker = true);

-- =============================================================================
-- POST-MIGRATION — hors transaction
-- =============================================================================
-- 1. analyze public.companies;
-- 2. npm run db:types
-- 3. Loader : supprimer la 2e requête `companies` + la jointure JS de
--    getAccountsContactsData() — les colonnes viennent maintenant de la vue.
-- 4. createCompany/updateCompany : segment_id obligatoire (défaut
--    seg-a-qualifier), ne plus écrire sector_id ni lifecycle_status (dérivés).
-- =============================================================================

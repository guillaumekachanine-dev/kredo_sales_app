-- ─── Études de recherche compte — remise à plat (2026-09-11) ─────────────────
--
-- Décision : l'acquisition de la connaissance d'un compte ne passe plus par un
-- producteur interne (INTEL-030 « account knowledge », INTEL-035 preflight de
-- sources). La recherche est faite dans ChatGPT Deep Research ; KREDO stocke
-- l'étude BRUTE et INTÉGRALE, puis en dérive deux fichiers : les briques
-- d'information distribuées dans l'UI, et le registre de sources au format
-- Master Study E3 (importable comme corpus).
--
-- 1. Suppression de tout ce que l'ancienne mécanique a produit ou exigé.
-- 2. `account_research_studies` : l'étude, sa conversion, ses deux fichiers.
-- 3. Bucket privé du PDF original (octet pour octet).
-- 4. `has_client_analysis` = une étude publiée existe (fin de la sémantique
--    « un résultat de phase 1 existe », polluée par les rapports).

-- ── 1. Ancienne mécanique ────────────────────────────────────────────────────

-- Propositions CRM produites par INTEL-030 : aucune appliquée au 2026-09-11
-- (15 en attente, 4 rejetées). Une proposition appliquée serait conservée.
delete from public.enrichment_proposals
 where status <> 'applied'
   and run_id in (
     select id from public.ai_intelligence_runs
      where run_type in ('intel-030-account-knowledge', 'intel-035-account-source-preflight')
   );

delete from public.ai_intelligence_results
 where result_type in ('account_knowledge', 'account_source_plan');

delete from public.ai_intelligence_runs
 where run_type in ('intel-030-account-knowledge', 'intel-035-account-source-preflight');

drop table if exists public.account_source_documents;
drop function if exists public.get_account_knowledge_context(uuid, uuid);
drop function if exists public.get_account_understanding_context(uuid, uuid);

-- ── 2. Études ────────────────────────────────────────────────────────────────

create table public.account_research_studies (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null default private.current_workspace_id()
                           references public.workspaces(id) on delete cascade,
  company_id             uuid not null references public.companies(id) on delete cascade,
  title                  text not null check (btrim(title) <> ''),
  producer               text not null default 'chatgpt_deep_research'
                           check (producer in ('chatgpt_deep_research')),

  -- Original, octet pour octet (bucket `account_research_studies`).
  original_file_path     text not null,
  original_file_name     text not null,
  original_file_bytes    integer not null check (original_file_bytes > 0),
  original_file_sha256   text not null,

  -- Texte intégral extrait, verbatim : la référence de toute vérification de perte.
  raw_content            text not null check (raw_content <> ''),
  raw_sha256             text not null,
  raw_chars              integer not null check (raw_chars > 0),
  extraction             jsonb not null default '{}'::jsonb,

  status                 text not null default 'extracted'
                           check (status in ('extracted', 'converting', 'ready', 'failed')),
  conversion             jsonb not null default '{}'::jsonb,
  error_message          text,

  -- Les deux fichiers dérivés + le rapport de couverture.
  knowledge_json         jsonb,
  sources_registry_json  jsonb,
  coverage               jsonb,

  -- Publication = l'étude devient la connaissance courante du compte.
  -- Une étude publiée est figée : on n'en reconvertit jamais une.
  published_at           timestamptz,
  published_by           uuid references public.profiles(id) on delete set null,

  created_by             uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint account_research_studies_published_ready
    check (published_at is null or (status = 'ready' and knowledge_json is not null))
);

comment on table public.account_research_studies is
  'Étude de recherche compte (ChatGPT Deep Research). raw_content = texte intégral verbatim ; knowledge_json = briques UI ; sources_registry_json = registre E3 1.1 importable comme corpus.';

create index account_research_studies_company_idx
  on public.account_research_studies (company_id, created_at desc);
create index account_research_studies_published_idx
  on public.account_research_studies (company_id, published_at desc)
  where published_at is not null;
create index account_research_studies_workspace_idx
  on public.account_research_studies (workspace_id);

create trigger trg_account_research_studies_updated_at
  before update on public.account_research_studies
  for each row execute function private.set_updated_at();

alter table public.account_research_studies enable row level security;

create policy account_research_studies_select on public.account_research_studies
  for select to authenticated
  using (workspace_id = (select private.current_workspace_id()));
create policy account_research_studies_insert on public.account_research_studies
  for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()));
create policy account_research_studies_update on public.account_research_studies
  for update to authenticated
  using (workspace_id = (select private.current_workspace_id()))
  with check (workspace_id = (select private.current_workspace_id()));
create policy account_research_studies_delete on public.account_research_studies
  for delete to authenticated
  using (workspace_id = (select private.current_workspace_id()));

grant select, insert, update, delete on public.account_research_studies to authenticated;
grant select, insert, update, delete on public.account_research_studies to service_role;

-- ── 3. PDF original ──────────────────────────────────────────────────────────
-- Aucune policy sur storage.objects : l'upload passe par une URL signée créée
-- côté serveur APRÈS contrôle d'authentification et d'appartenance du compte,
-- la lecture par le client service-role côté serveur.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('account_research_studies', 'account_research_studies', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

-- ── 4. Présence de la connaissance entreprise ────────────────────────────────

create or replace view public.v_ai_intelligence_summary
with (security_invoker = true) as
 select c.id as company_id,
    c.name as company_name,
    c.sector,
    c.priority,
    ( select count(*)::numeric as count
           from opportunities opportunity
          where opportunity.company_id = c.id and (opportunity.stage <> all (array['gagne'::text, 'perdu'::text, 'abandonne'::text, 'win'::text, 'lost'::text]))) as open_opportunities_count,
    exists ( select 1
           from account_research_studies study
          where study.company_id = c.id and study.published_at is not null) as has_client_analysis,
    res.has_sector_analysis,
    res.has_process_diagnostic,
    res.has_roadmap,
    c.meta_has_analysis_data as has_legacy_analysis,
    c.meta_has_sector_analysis as has_legacy_sector,
    c.meta_has_pitches as has_legacy_pitches,
    runs.latest_run_at,
    runs.latest_run_status,
    coalesce(runs.count_runs, 0::bigint) as count_runs,
    coalesce(res.count_results, 0::bigint) as count_results
   from companies c
     left join lateral ( select bool_or(r.phase = 2) as has_sector_analysis,
            bool_or(r.phase = 3) as has_process_diagnostic,
            bool_or(r.phase = 4) as has_roadmap,
            count(*) as count_results
           from ai_intelligence_results r
          where r.company_id = c.id and r.status = 'succeeded'::ai_result_status and not (exists ( select 1
                   from ai_intelligence_runs mission_run
                  where mission_run.id = r.run_id and mission_run.run_type ~~ 'mission:%'::text))) res on true
     left join lateral ( select max(run.created_at) as latest_run_at,
            (array_agg(run.status order by run.created_at desc))[1] as latest_run_status,
            count(*) as count_runs
           from ai_intelligence_runs run
          where run.company_id = c.id and (run.run_type is null or run.run_type !~~ 'mission:%'::text)) runs on true;

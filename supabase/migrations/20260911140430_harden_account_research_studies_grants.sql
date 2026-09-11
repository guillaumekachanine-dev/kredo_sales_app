-- La migration de création a hérité des default privileges historiques du
-- projet : anon et authenticated avaient notamment TRUNCATE. Resserre
-- explicitement l'API et lie chaque compte au workspace porté par l'étude.

revoke all privileges on table public.account_research_studies from anon;
revoke all privileges on table public.account_research_studies from authenticated;
grant select, insert, update, delete on table public.account_research_studies to authenticated;

drop policy if exists account_research_studies_insert on public.account_research_studies;
create policy account_research_studies_insert on public.account_research_studies
  for insert to authenticated
  with check (
    workspace_id = (select private.current_workspace_id())
    and exists (
      select 1
        from public.companies company
       where company.id = account_research_studies.company_id
         and company.workspace_id = account_research_studies.workspace_id
    )
  );

drop policy if exists account_research_studies_update on public.account_research_studies;
create policy account_research_studies_update on public.account_research_studies
  for update to authenticated
  using (workspace_id = (select private.current_workspace_id()))
  with check (
    workspace_id = (select private.current_workspace_id())
    and exists (
      select 1
        from public.companies company
       where company.id = account_research_studies.company_id
         and company.workspace_id = account_research_studies.workspace_id
    )
  );

alter table public.account_research_studies
  drop constraint account_research_studies_published_ready,
  add constraint account_research_studies_published_ready check (
    published_at is null
    or (
      status = 'ready'
      and knowledge_json is not null
      and sources_registry_json is not null
      and coverage is not null
      and coverage #>> '{text,identical}' = 'true'
      and coverage #>> '{registry,importable}' = 'true'
    )
  );

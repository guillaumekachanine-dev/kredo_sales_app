-- LOT 2 — suppression physique des scores globaux de compte.
--
-- Migration forward-only. Elle est volontairement fail-closed : les recherches
-- textuelles couvrent les corps PL/pgSQL, dont les dépendances ne sont pas toutes
-- enregistrées dans pg_depend, et les DROP sans suppression implicite laissent
-- PostgreSQL bloquer toute dépendance cataloguée oubliée.

do $migration_guard$
declare
  external_dependencies text;
begin
  with matching_routines as (
    select format(
      '%I.%I(%s)',
      namespace.nspname,
      routine.proname,
      pg_get_function_identity_arguments(routine.oid)
    ) as object_name
    from pg_proc routine
    join pg_namespace namespace on namespace.oid = routine.pronamespace
    where routine.prokind in ('f', 'p')
      and namespace.nspname not in ('pg_catalog', 'information_schema')
      and (
        pg_get_functiondef(routine.oid) ilike '%legacy_folio_score%'
        or pg_get_functiondef(routine.oid) ilike '%potential_score_raw%'
        or pg_get_functiondef(routine.oid) ilike '%account_score_runs%'
        or pg_get_functiondef(routine.oid) ilike '%account_score_components%'
        or pg_get_functiondef(routine.oid) ilike '%account_score_feedback%'
        or pg_get_functiondef(routine.oid) ilike '%account_score_current%'
        or pg_get_functiondef(routine.oid) ilike '%get_account_score_context%'
        or pg_get_functiondef(routine.oid) ilike '%compute_conviction_score_v1%'
        or pg_get_functiondef(routine.oid) ilike '%compute_investment_score_v1%'
        or pg_get_functiondef(routine.oid) ilike '%validate_account_score_%'
      )
      and not (
        (namespace.nspname, routine.proname, pg_get_function_identity_arguments(routine.oid)) in (
          ('public', 'get_account_score_context', 'p_workspace_id uuid, p_company_id uuid'),
          ('public', 'compute_conviction_score_v1', 'p_company_id uuid'),
          ('public', 'compute_investment_score_v1', 'p_company_id uuid'),
          ('private', 'validate_account_score_run', ''),
          ('private', 'validate_account_score_component', ''),
          ('private', 'validate_account_score_feedback', '')
        )
      )
  ),
  matching_views as (
    select format('%I.%I', namespace.nspname, relation.relname) as object_name
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where relation.relkind in ('v', 'm')
      and namespace.nspname not in ('pg_catalog', 'information_schema')
      and (
        pg_get_viewdef(relation.oid, true) ilike '%legacy_folio_score%'
        or pg_get_viewdef(relation.oid, true) ilike '%potential_score_raw%'
        or pg_get_viewdef(relation.oid, true) ilike '%account_score_runs%'
        or pg_get_viewdef(relation.oid, true) ilike '%account_score_components%'
        or pg_get_viewdef(relation.oid, true) ilike '%account_score_feedback%'
        or pg_get_viewdef(relation.oid, true) ilike '%account_score_current%'
        or pg_get_viewdef(relation.oid, true) ilike '%compute_conviction_score_v1%'
        or pg_get_viewdef(relation.oid, true) ilike '%compute_investment_score_v1%'
      )
      and not (
        namespace.nspname = 'public'
        and relation.relname = 'account_score_current'
      )
  ),
  unexpected as (
    select 'routine ' || object_name as object_name from matching_routines
    union all
    select 'view ' || object_name as object_name from matching_views
  )
  select string_agg(object_name, ', ' order by object_name)
  into external_dependencies
  from unexpected;

  if external_dependencies is not null then
    raise exception
      'LOT 2 blocked by active external account-score dependencies: %',
      external_dependencies;
  end if;
end
$migration_guard$;

do $purge_metadata$
declare
  purged_rows bigint;
begin
  update public.companies
  set metadata = metadata - 'potential_score_raw'
  where metadata ? 'potential_score_raw';

  get diagnostics purged_rows = row_count;
  raise notice 'LOT 2 removed metadata.potential_score_raw from % companies', purged_rows;
end
$purge_metadata$;

drop view public.account_score_current;

drop function public.get_account_score_context(uuid, uuid);

drop table public.account_score_feedback;
drop table public.account_score_components;
drop table public.account_score_runs;

drop function private.validate_account_score_feedback();
drop function private.validate_account_score_component();
drop function private.validate_account_score_run();

drop function public.compute_conviction_score_v1(uuid);
drop function public.compute_investment_score_v1(uuid);

alter table public.companies
  drop column legacy_folio_score;

do $post_migration_assertions$
begin
  if to_regclass('public.account_score_runs') is not null
    or to_regclass('public.account_score_components') is not null
    or to_regclass('public.account_score_feedback') is not null
    or to_regclass('public.account_score_current') is not null
    or to_regprocedure('public.get_account_score_context(uuid,uuid)') is not null
    or to_regprocedure('public.compute_conviction_score_v1(uuid)') is not null
    or to_regprocedure('public.compute_investment_score_v1(uuid)') is not null
    or to_regprocedure('private.validate_account_score_run()') is not null
    or to_regprocedure('private.validate_account_score_component()') is not null
    or to_regprocedure('private.validate_account_score_feedback()') is not null
  then
    raise exception 'LOT 2 post-migration object assertion failed';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'companies'
      and column_name = 'legacy_folio_score'
  ) then
    raise exception 'LOT 2 post-migration column assertion failed';
  end if;

  if exists (
    select 1
    from public.companies
    where metadata ? 'potential_score_raw'
  ) then
    raise exception 'LOT 2 post-migration metadata assertion failed';
  end if;
end
$post_migration_assertions$;

-- Assertions post-migration LOT 2. Les identifiants sont assemblés afin que la
-- recherche négative du dépôt ne confonde pas ce contrat avec un consumer actif.

do $assertions$
declare
  score_prefix constant text := 'account_' || 'score_';
  legacy_column constant text := 'legacy_' || 'folio_score';
  legacy_metadata_key constant text := 'potential_' || 'score_raw';
begin
  if to_regclass('public.' || score_prefix || 'runs') is not null
    or to_regclass('public.' || score_prefix || 'components') is not null
    or to_regclass('public.' || score_prefix || 'feedback') is not null
    or to_regclass('public.' || score_prefix || 'current') is not null
  then
    raise exception 'LOT 2 relation assertion failed';
  end if;

  if to_regprocedure('public.get_' || score_prefix || 'context(uuid,uuid)') is not null
    or to_regprocedure('public.compute_' || 'conviction_score_v1(uuid)') is not null
    or to_regprocedure('public.compute_' || 'investment_score_v1(uuid)') is not null
    or to_regprocedure('private.validate_' || score_prefix || 'run()') is not null
    or to_regprocedure('private.validate_' || score_prefix || 'component()') is not null
    or to_regprocedure('private.validate_' || score_prefix || 'feedback()') is not null
  then
    raise exception 'LOT 2 routine assertion failed';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'companies'
      and column_name = legacy_column
  ) then
    raise exception 'LOT 2 column assertion failed';
  end if;

  if exists (
    select 1
    from public.companies
    where metadata ? legacy_metadata_key
  ) then
    raise exception 'LOT 2 metadata assertion failed';
  end if;
end
$assertions$;

-- Assertions post-migration : neutralisation des signaux FOLIO legacy dans v_active_account_signals.

do $assertions$
declare
  v_folio_count integer;
  v_total_folio_archived integer;
begin
  -- 1. Aucun signal FOLIO ne doit sortir de la vue v_active_account_signals
  select count(*) into v_folio_count
  from public.v_active_account_signals
  where signal_type like 'folio_%'
     or dedupe_key like 'folio:%';

  if v_folio_count <> 0 then
    raise exception 'Assertion failed: % legacy FOLIO signals found in v_active_account_signals', v_folio_count;
  end if;

  -- 2. Les lignes FOLIO historiques dans account_signals doivent toujours exister
  select count(*) into v_total_folio_archived
  from public.account_signals
  where signal_type like 'folio_%'
     or dedupe_key like 'folio:%';

  if v_total_folio_archived = 0 then
    raise exception 'Assertion failed: historical FOLIO signals were unexpectedly deleted from account_signals';
  end if;

  raise notice 'Migration assertions passed: 0 FOLIO signals in v_active_account_signals, % historical FOLIO rows preserved.', v_total_folio_archived;
end
$assertions$;

-- ADR-0012 Lot 0 — ops-004 : reprise des runs d'intelligence bloqués.
-- Fonction déterministe appelable par un cron n8n (ou service_role) pour clôturer
-- les runs orphelins dont aucun callback n'arrivera jamais.
--   queued  > seuil (déf. 15 min) → failed
--   running > seuil (déf. 30 min) → failed
-- Aucun accès client : EXECUTE réservé à service_role.
--
-- Version réellement appliquée : 20260707162154 (le préfixe « 047 » est cosmétique,
-- 046 étant déjà occupé côté remote par 046_drop_duplicate_get_account_summary_facts ;
-- Supabase utilise le timestamp comme clé — cf. project-migration-drift).

create or replace function public.reap_stale_intelligence_runs(
  queued_timeout_minutes int default 15,
  running_timeout_minutes int default 30
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  reaped int;
begin
  with stale as (
    update ai_intelligence_runs r
    set status = 'failed',
        failed_at = now(),
        error_message = coalesce(
          r.error_message,
          format('Run repris automatiquement (ops-004) : statut %s dépassant le seuil de reprise.', r.status)
        )
    where (r.status = 'queued'
           and r.created_at < now() - make_interval(mins => queued_timeout_minutes))
       or (r.status = 'running'
           and coalesce(r.started_at, r.created_at) < now() - make_interval(mins => running_timeout_minutes))
    returning r.id
  )
  select count(*) into reaped from stale;
  return reaped;
end;
$$;

revoke all on function public.reap_stale_intelligence_runs(int, int) from public;
grant execute on function public.reap_stale_intelligence_runs(int, int) to service_role;

comment on function public.reap_stale_intelligence_runs(int, int) is
  'ADR-0012 Lot 0 / ops-004 : clot les runs ai_intelligence bloques (queued>seuil, running>seuil) en failed. Destinee a un cron n8n. EXECUTE reserve service_role.';

-- Correctif de dérive après suppression de NotificationBell (migration 064).
--
-- Constat production au 2026-08-18 : public.user_notifications a bien été supprimée,
-- mais trg_notify_on_run_failed / notify_on_run_failed() et la version live de
-- reap_stale_intelligence_runs() la référencent encore. Toute transition d'un run vers
-- status = 'failed' peut donc être annulée par l'erreur relation "user_notifications"
-- does not exist.
--
-- Ce correctif rétablit l'intention déjà présente dans la migration 064 : plus aucune
-- notification in-app, et le reaper se contente de marquer les runs stale en échec.

DROP TRIGGER IF EXISTS trg_notify_on_run_failed ON public.ai_intelligence_runs;
DROP FUNCTION IF EXISTS public.notify_on_run_failed();

CREATE OR REPLACE FUNCTION public.reap_stale_intelligence_runs(
  queued_timeout_minutes integer DEFAULT 15,
  running_timeout_minutes integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reaped int;
BEGIN
  UPDATE ai_intelligence_runs r
  SET status = 'failed',
      failed_at = now(),
      error_message = COALESCE(
        r.error_message,
        FORMAT('Run repris automatiquement (ops-004) : statut %s dépassant le seuil de reprise.', r.status)
      )
  WHERE (r.status = 'queued'
         AND r.created_at < now() - MAKE_INTERVAL(mins => queued_timeout_minutes))
     OR (r.status = 'running'
         AND COALESCE(r.started_at, r.created_at) < now() - MAKE_INTERVAL(mins => running_timeout_minutes));

  GET DIAGNOSTICS reaped = ROW_COUNT;
  RETURN reaped;
END;
$function$;

COMMENT ON FUNCTION public.reap_stale_intelligence_runs(integer, integer) IS
  'ops-004 — reprend les runs bloqués (queued/running au-delà des seuils) en failed. Notification in-app supprimée avec NotificationBell.';

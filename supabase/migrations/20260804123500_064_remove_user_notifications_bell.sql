-- ── Nettoyage de la fonctionnalité NotificationBell et de la table associée ──

-- 1. Suppression du trigger et de la fonction sur les échecs de workflow
DROP TRIGGER IF EXISTS trg_notify_on_run_failed ON public.ai_intelligence_runs;
DROP FUNCTION IF EXISTS public.notify_on_run_failed();

-- 2. Retrait de la table de la publication Realtime (si présente)
ALTER POLICY IF EXISTS user_notifications_select ON public.user_notifications;
ALTER POLICY IF EXISTS user_notifications_insert ON public.user_notifications;
ALTER POLICY IF EXISTS user_notifications_update ON public.user_notifications;
ALTER POLICY IF EXISTS user_notifications_delete ON public.user_notifications;

-- 3. Suppression de la table user_notifications
DROP TABLE IF EXISTS public.user_notifications CASCADE;

-- 4. Redéfinition de la fonction reap_stale_intelligence_runs sans référence à user_notifications
CREATE OR REPLACE FUNCTION public.reap_stale_intelligence_runs(
  queued_timeout_minutes integer default 15,
  running_timeout_minutes integer default 30
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

COMMENT ON FUNCTION public.reap_stale_intelligence_runs IS
  'ops-004 — reprend les runs bloqués (queued/running au-delà des seuils) en '
  'failed. (La notification in-app a été supprimée suite au retrait de NotificationBell)';

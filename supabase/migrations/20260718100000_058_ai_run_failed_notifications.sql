-- ============================================================================
-- Dispositif d'alerte échec de workflow — bell unifié (Niveau 1)
-- ============================================================================
-- Objectif : notifier en in-app (user_notifications, déjà consommé par le
-- NotificationBell existant, cf. Session 24 ai_run_reaped) tout échec réel de
-- workflow, pas seulement ceux repris par le reaper ops-004. Réutilise
-- entièrement la plomberie du bell (Realtime déjà souscrit sur INSERT
-- user_notifications) — aucune nouvelle table, aucun nouveau canal.
--
-- Portée volontaire (Niveau 1, décision Guillaume 2026-07-18) : message
-- d'erreur déjà capturé au callback (ai_intelligence_runs.error_message),
-- pas de rapatriement de trace n8n. Le lien direct vers l'exécution n8n
-- reste un futur Lot 0 (capture n8nExecutionId/n8nWorkflowId au callback +
-- réimport VPS) — absent de cette migration.
--
-- Déclenchement au niveau DB (trigger), pas dans la route callback : couvre
-- uniformément tout chemin qui fait basculer un run en 'failed', qu'il passe
-- par /api/n8n/callback ou par le reaper ops-004 (reap_stale_intelligence_runs).
--
-- Anti-doublon : le reaper insère déjà sa propre notification spécifique
-- ('ai_run_reaped', message "délai dépassé"), plus informative pour ce cas
-- précis (timeout) qu'un message générique. Le reaper positionne un flag de
-- session Postgres avant son UPDATE pour que ce trigger générique s'auto-
-- désactive sur cette transaction précise et ne double-notifie pas le même
-- événement.
-- ============================================================================

create or replace function public.notify_on_run_failed()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status = 'failed'
     and old.status is distinct from 'failed'
     and coalesce(current_setting('kredo.suppress_run_failed_notification', true), '') <> 'true'
  then
    insert into user_notifications (workspace_id, user_id, notification_type, title, body, deep_link)
    values (
      new.workspace_id,
      new.owner_id,
      'ai_run_failed',
      format('Échec du workflow « %s »', new.run_type),
      format('%s : le workflow "%s" n''a pas abouti.%s',
             to_char(coalesce(new.failed_at, now()) at time zone 'Europe/Paris', 'DD Mon YYYY à HH24:MI'),
             new.run_type,
             case when new.error_message is not null then ' ' || new.error_message else '' end),
      '/automations'
    );
  end if;
  return new;
end;
$function$;

comment on function public.notify_on_run_failed is
  'Notifie in-app (user_notifications) tout run ai_intelligence_runs basculant en failed, '
  'quel que soit le chemin (callback n8n ou reaper ops-004). Auto-désactivé via le flag de '
  'session kredo.suppress_run_failed_notification pour éviter le doublon avec ai_run_reaped.';

drop trigger if exists trg_notify_on_run_failed on public.ai_intelligence_runs;

create trigger trg_notify_on_run_failed
  after update on public.ai_intelligence_runs
  for each row
  execute function public.notify_on_run_failed();

-- ── Reaper (ops-004) : positionne le flag anti-doublon autour de son UPDATE ─

create or replace function public.reap_stale_intelligence_runs(
  queued_timeout_minutes integer default 15,
  running_timeout_minutes integer default 30
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  reaped int;
begin
  perform set_config('kredo.suppress_run_failed_notification', 'true', true);

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
    returning r.id, r.workspace_id, r.owner_id, r.run_type
  )
  insert into user_notifications (workspace_id, user_id, notification_type, title, body, deep_link)
  select
    s.workspace_id,
    s.owner_id,
    'ai_run_reaped',
    'Run IA repris automatiquement',
    format('Le workflow "%s" a dépassé son délai d''exécution et a été marqué en échec.', s.run_type),
    '/automations'
  from stale s;

  get diagnostics reaped = row_count;

  perform set_config('kredo.suppress_run_failed_notification', 'false', true);

  return reaped;
end;
$function$;

comment on function public.reap_stale_intelligence_runs is
  'ops-004 — reprend les runs bloqués (queued/running au-delà des seuils) en '
  'failed ET notifie l''owner in-app (Lot 0 monitoring IA, 2026-07-13). '
  'Positionne kredo.suppress_run_failed_notification pour éviter la double '
  'notification avec trg_notify_on_run_failed (Lot 1 alerte échec, 2026-07-18).';

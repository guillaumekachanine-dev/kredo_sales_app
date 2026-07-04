-- ============================================================
-- REPORT-001 — Brief hebdomadaire (ADR-0010) — Lot 0 : scaffold
-- ============================================================
-- Ce lot ne crée PAS de table de faits : "weekly_manager" existe déjà dans
-- intelligence_document_type (migration 20260703120000_report_001_foundation)
-- et la RPC de faits (get_weekly_business_facts) arrive en Lot 1. Le pipeline
-- réutilise loadAgendaSnapshot() comme source unique de vérité "quoi cette
-- semaine" (src/lib/agenda/aggregate-agenda-snapshot.ts) — jamais dupliqué en
-- SQL — et ne calcule ici que les 2 tables nouvelles nécessaires à la feuille
-- d'or (dismissals + notifications), absentes du domaine existant.

-- ============================================================
-- 1. TABLE weekly_brief_dismissals
-- ============================================================
-- Signal d'apprentissage v1 (pas de ML) : un item ignoré 3 semaines de suite
-- est déclassé en priorité "normal" par le scoring déterministe (Lot 1).
-- item_source_type reprend le vocabulaire de AgendaSourceType
-- (src/lib/agenda/agenda-types.ts) + "business_fact" pour les items qui ne
-- viennent pas de l'agrégateur agenda (ex. compte cible silencieux depuis
-- get_weekly_business_facts).

CREATE TABLE public.weekly_brief_dismissals (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid          NOT NULL DEFAULT private.current_workspace_id()
                                  REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id         uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  item_source_type text          NOT NULL,
  item_source_id   uuid          NOT NULL,
  week_iso         text          NOT NULL,

  dismissed_at     timestamptz   NOT NULL DEFAULT now(),
  created_at       timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT weekly_brief_dismissals_week_iso_format
    CHECK (week_iso ~ '^\d{4}-W\d{2}$'),
  CONSTRAINT weekly_brief_dismissals_uniq
    UNIQUE (workspace_id, owner_id, item_source_type, item_source_id, week_iso)
);

COMMENT ON TABLE public.weekly_brief_dismissals IS
  'Trace des items du brief hebdomadaire explicitement ignorés par un manager pour une semaine ISO donnée (ADR-0010). Append-only, pas de trigger log_audit (même motif que intelligence_document_versions/links) : signal de préférence, pas une entité métier auditable.';
COMMENT ON COLUMN public.weekly_brief_dismissals.item_source_type IS
  'Reprend AgendaSourceType (calendar_event/task/mission/opportunity/candidate_hiring_milestone/collaborator_absence/client_closure) + "business_fact" pour les items issus de get_weekly_business_facts (Lot 1), hors périmètre agenda.';
COMMENT ON COLUMN public.weekly_brief_dismissals.week_iso IS
  'Semaine ISO-8601 au format AAAA-Www (ex. 2026-W28) — clé de regroupement pour la règle "3 semaines consécutives = déclassement" appliquée par le scoring v1.';

CREATE INDEX idx_weekly_brief_dismissals_lookup
  ON public.weekly_brief_dismissals (workspace_id, owner_id, item_source_type, item_source_id);

ALTER TABLE public.weekly_brief_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_brief_dismissals_select" ON public.weekly_brief_dismissals
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY "weekly_brief_dismissals_insert" ON public.weekly_brief_dismissals
  FOR INSERT WITH CHECK (workspace_id = private.current_workspace_id());
CREATE POLICY "weekly_brief_dismissals_update" ON public.weekly_brief_dismissals
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY "weekly_brief_dismissals_delete" ON public.weekly_brief_dismissals
  FOR DELETE USING (workspace_id = private.current_workspace_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_brief_dismissals TO authenticated;
GRANT ALL ON public.weekly_brief_dismissals TO service_role;

-- ============================================================
-- 2. TABLE user_notifications
-- ============================================================
-- Notification in-app minimale pour le cron lundi 07:00 (Lot 4) : le badge
-- header lit cette table en Realtime/poll, filtré sur l'utilisateur courant.
-- Exception documentée au motif RLS uniforme "workspace" (CLAUDE.md) : une
-- notification est adressée à UN utilisateur précis, pas à tout le workspace
-- — même logique d'exception que collaborator_compensation (is_workspace_admin),
-- ici on filtre sur user_id = auth.uid() en plus du workspace.

CREATE TABLE public.user_notifications (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid          NOT NULL DEFAULT private.current_workspace_id()
                                      REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id               uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  notification_type     text          NOT NULL,
  title                 text          NOT NULL,
  body                  text,
  deep_link             text,
  related_document_id   uuid          REFERENCES public.intelligence_documents(id) ON DELETE CASCADE,

  read_at               timestamptz,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_notifications IS
  'Notifications in-app adressées à un utilisateur précis (ex. weekly_brief_ready déposé par le cron n8n du lundi, ADR-0010 Lot 4). Écriture normale via service_role (cron), pas de trigger log_audit (éphémère, non métier).';
COMMENT ON COLUMN public.user_notifications.notification_type IS
  'Discriminant texte libre (liste évolutive, pas d''enum) — première valeur : "weekly_brief_ready".';
COMMENT ON COLUMN public.user_notifications.deep_link IS
  'Chemin relatif app (ex. /reports/{documentId}) vers lequel rediriger au clic — dénormalisé pour éviter un aller-retour supplémentaire côté client.';

CREATE INDEX idx_user_notifications_unread
  ON public.user_notifications (workspace_id, user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX idx_user_notifications_user
  ON public.user_notifications (workspace_id, user_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notifications_select" ON public.user_notifications
  FOR SELECT USING (workspace_id = private.current_workspace_id() AND user_id = auth.uid());
CREATE POLICY "user_notifications_insert" ON public.user_notifications
  FOR INSERT WITH CHECK (workspace_id = private.current_workspace_id() AND user_id = auth.uid());
CREATE POLICY "user_notifications_update" ON public.user_notifications
  FOR UPDATE USING (workspace_id = private.current_workspace_id() AND user_id = auth.uid());
CREATE POLICY "user_notifications_delete" ON public.user_notifications
  FOR DELETE USING (workspace_id = private.current_workspace_id() AND user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

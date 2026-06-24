-- Migration 026: calendar_events — Source unique de vérité de l'Agenda
-- Remplace le hack interactions+ends_at par une table dédiée.
-- Date: 2026-06-23

BEGIN;

-- ============================================================
-- 1. TABLE calendar_events
-- ============================================================
CREATE TABLE public.calendar_events (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid         NOT NULL DEFAULT private.current_workspace_id()
                              REFERENCES workspaces(id) ON DELETE CASCADE,
  organizer_id   uuid         REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),

  -- Taxonomie à 3 familles (Commerce / Management / Recrutement)
  event_type     text         NOT NULL CHECK (event_type = ANY (ARRAY[
    -- Commerce
    'rdv_client_suivi','rdv_prospection','soutenance','atelier_client',
    'appel_qualification','appel_prospection','mailing_prospection','suivi_mission_client',
    -- Management
    'suivi_mission_collab','presentation_rt','ead_collab','entretien_rh','preparation_collab',
    -- Recrutement
    'entretien_candidat','preparation_candidat','sourcing_candidats'
  ])),
  status         text         NOT NULL DEFAULT 'scheduled'
                              CHECK (status = ANY (ARRAY['scheduled','completed','cancelled'])),

  title          text         NOT NULL CHECK (length(trim(title)) > 0),
  description    text,

  starts_at      timestamptz  NOT NULL,
  ends_at        timestamptz  NOT NULL,
  all_day        boolean      NOT NULL DEFAULT false,

  -- Relations CRM (Commerce)
  company_id     uuid         REFERENCES companies(id) ON DELETE SET NULL,
  contact_id     uuid         REFERENCES contacts(id) ON DELETE SET NULL,
  opportunity_id uuid         REFERENCES opportunities(id) ON DELETE SET NULL,

  -- Relation Recrutement
  candidate_id   uuid         REFERENCES candidates(id) ON DELETE SET NULL,

  location       text,
  meeting_url    text,
  metadata       jsonb        NOT NULL DEFAULT '{}',

  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT chk_calendar_events_dates
    CHECK (ends_at > starts_at OR all_day = true)
);

COMMENT ON TABLE public.calendar_events IS 'Source de vérité du module Agenda. Événements planifiés (passés, présents, futurs).';

-- ============================================================
-- 2. TRIGGERS STANDARD KREDO
-- ============================================================
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER log_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================================
-- 3. RLS — motif workspace uniforme (4 policies)
-- ============================================================
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_events_select ON public.calendar_events
  FOR SELECT USING (workspace_id = private.current_workspace_id());

CREATE POLICY calendar_events_insert ON public.calendar_events
  FOR INSERT WITH CHECK (true); -- DEFAULT garantit l'isolation

CREATE POLICY calendar_events_update ON public.calendar_events
  FOR UPDATE USING (workspace_id = private.current_workspace_id());

CREATE POLICY calendar_events_delete ON public.calendar_events
  FOR DELETE USING (workspace_id = private.current_workspace_id());

-- ============================================================
-- 4. INDEXES TEMPORELS (requêtes par plage de dates)
-- ============================================================
CREATE INDEX idx_calendar_events_ws_starts
  ON public.calendar_events (workspace_id, starts_at);

CREATE INDEX idx_calendar_events_ws_type_starts
  ON public.calendar_events (workspace_id, event_type, starts_at);

CREATE INDEX idx_calendar_events_company
  ON public.calendar_events (company_id, starts_at)
  WHERE company_id IS NOT NULL;

CREATE INDEX idx_calendar_events_contact
  ON public.calendar_events (contact_id, starts_at)
  WHERE contact_id IS NOT NULL;

CREATE INDEX idx_calendar_events_opportunity
  ON public.calendar_events (opportunity_id, starts_at)
  WHERE opportunity_id IS NOT NULL;

CREATE INDEX idx_calendar_events_candidate
  ON public.calendar_events (candidate_id, starts_at)
  WHERE candidate_id IS NOT NULL;

-- ============================================================
-- 5. LIER tasks À calendar_events
--    calendar_event_id remplace le couple entity_type/entity_id
--    pour les tâches liées à un événement agenda.
-- ============================================================
ALTER TABLE public.tasks
  ADD COLUMN calendar_event_id uuid
  REFERENCES public.calendar_events(id) ON DELETE CASCADE;

CREATE INDEX idx_tasks_calendar_event
  ON public.tasks (calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;

-- ============================================================
-- 6. LIER interactions À calendar_events (optionnel — post-événement)
--    Un rendez-vous réalisé peut générer une interaction CRM.
-- ============================================================
ALTER TABLE public.interactions
  ADD COLUMN calendar_event_id uuid UNIQUE
  REFERENCES public.calendar_events(id) ON DELETE SET NULL;

-- ============================================================
-- 7. NETTOYER interactions — supprimer les champs Agenda temporaires
-- ============================================================
ALTER TABLE public.interactions
  DROP CONSTRAINT IF EXISTS chk_interactions_ends_at;

ALTER TABLE public.interactions
  DROP COLUMN IF EXISTS ends_at;

-- ============================================================
-- 8. SUPPRIMER LES ANCIENNES RPC BUGGÉES
-- ============================================================
DROP FUNCTION IF EXISTS public.create_agenda_event(
  text, timestamptz, timestamptz, text, uuid, uuid, uuid, jsonb, boolean, text, timestamptz, text
);
DROP FUNCTION IF EXISTS public.update_agenda_event(
  uuid, text, timestamptz, timestamptz, text, uuid, uuid, uuid, jsonb, boolean, text, timestamptz, text
);

-- ============================================================
-- 9. NOUVELLE RPC: create_calendar_event (SECURITY INVOKER)
--    Création atomique d'un événement + tâche préparatoire optionnelle.
--    Validations complètes : workspace, FK, dates, enums.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_calendar_event(
  p_title          text,
  p_event_type     text,
  p_starts_at      timestamptz,
  p_ends_at        timestamptz,
  p_description    text        DEFAULT NULL,
  p_all_day        boolean     DEFAULT false,
  p_company_id     uuid        DEFAULT NULL,
  p_contact_id     uuid        DEFAULT NULL,
  p_opportunity_id uuid        DEFAULT NULL,
  p_candidate_id   uuid        DEFAULT NULL,
  p_location       text        DEFAULT NULL,
  p_meeting_url    text        DEFAULT NULL,
  p_create_task    boolean     DEFAULT false,
  p_task_title     text        DEFAULT NULL,
  p_task_due_date  timestamptz DEFAULT NULL,
  p_task_priority  text        DEFAULT 'normal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_event_id uuid;
  v_task_id  uuid;
  v_rows_affected int;
BEGIN
  -- Titre non vide
  IF trim(p_title) = '' THEN
    RAISE EXCEPTION 'Le titre de l''événement est obligatoire';
  END IF;

  -- Cohérence des dates (sauf journée entière)
  IF NOT p_all_day AND p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'La date de fin doit être postérieure à la date de début';
  END IF;

  -- Priorité tâche valide
  IF p_create_task AND p_task_priority NOT IN ('low','normal','high','urgent') THEN
    RAISE EXCEPTION 'Priorité tâche invalide : %', p_task_priority;
  END IF;

  -- Validation contact/compte
  IF p_contact_id IS NOT NULL AND p_company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = p_contact_id AND company_id = p_company_id
        AND workspace_id = private.current_workspace_id()
    ) THEN
      RAISE EXCEPTION 'Le contact ne correspond pas au compte sélectionné';
    END IF;
  END IF;

  -- Validation opportunité/compte
  IF p_opportunity_id IS NOT NULL AND p_company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.opportunities
      WHERE id = p_opportunity_id AND company_id = p_company_id
        AND workspace_id = private.current_workspace_id()
    ) THEN
      RAISE EXCEPTION 'L''opportunité ne correspond pas au compte sélectionné';
    END IF;
  END IF;

  -- Validation candidat dans le workspace
  IF p_candidate_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.candidates
      WHERE id = p_candidate_id AND workspace_id = private.current_workspace_id()
    ) THEN
      RAISE EXCEPTION 'Candidat introuvable dans ce workspace';
    END IF;
  END IF;

  -- Créer l'événement (RLS INVOKER + DEFAULT workspace_id)
  INSERT INTO public.calendar_events (
    organizer_id, event_type, status, title, description,
    starts_at, ends_at, all_day,
    company_id, contact_id, opportunity_id, candidate_id,
    location, meeting_url
  ) VALUES (
    auth.uid(), p_event_type, 'scheduled', trim(p_title), p_description,
    p_starts_at, p_ends_at, p_all_day,
    p_company_id, p_contact_id, p_opportunity_id, p_candidate_id,
    p_location, p_meeting_url
  )
  RETURNING id INTO v_event_id;

  -- Créer la tâche préparatoire si demandé
  IF p_create_task AND trim(coalesce(p_task_title,'')) <> '' THEN
    -- Échéance tâche < début événement
    IF p_task_due_date IS NOT NULL AND p_task_due_date >= p_starts_at THEN
      RAISE EXCEPTION 'L''échéance de la tâche doit être antérieure au début de l''événement';
    END IF;

    INSERT INTO public.tasks (
      created_by, calendar_event_id, title, due_date, priority, status
    ) VALUES (
      auth.uid(), v_event_id,
      trim(p_task_title), p_task_due_date, p_task_priority, 'open'
    )
    RETURNING id INTO v_task_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'task_id',  v_task_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_calendar_event FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_calendar_event TO authenticated;
COMMENT ON FUNCTION public.create_calendar_event IS
  'Création atomique d''un événement agenda et de sa tâche préparatoire optionnelle. SECURITY INVOKER — RLS respecté.';

COMMIT;

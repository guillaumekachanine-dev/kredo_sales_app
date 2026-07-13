-- Migration: Add collaborator_id to calendar_events and update RPC
ALTER TABLE public.calendar_events
  ADD COLUMN collaborator_id uuid NULL REFERENCES public.collaborators(id) ON DELETE SET NULL;

CREATE INDEX idx_calendar_events_collaborator_id ON public.calendar_events(collaborator_id);

-- Drop function with the old signature
DROP FUNCTION IF EXISTS public.create_calendar_event(
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  boolean,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  text,
  timestamptz,
  text,
  jsonb
);

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
  p_collaborator_id uuid       DEFAULT NULL,
  p_mission_id     uuid        DEFAULT NULL,
  p_location       text        DEFAULT NULL,
  p_meeting_url    text        DEFAULT NULL,
  p_create_task    boolean     DEFAULT false,
  p_task_title     text        DEFAULT NULL,
  p_task_due_date  timestamptz DEFAULT NULL,
  p_task_priority  text        DEFAULT 'normal',
  p_metadata       jsonb       DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_event_id uuid;
  v_task_id  uuid;
BEGIN
  IF trim(p_title) = '' THEN
    RAISE EXCEPTION 'Le titre de l''événement est obligatoire';
  END IF;

  IF NOT p_all_day AND p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'La date de fin doit être postérieure à la date de début';
  END IF;

  IF p_create_task AND p_task_priority NOT IN ('low','normal','high','urgent') THEN
    RAISE EXCEPTION 'Priorité tâche invalide : %', p_task_priority;
  END IF;

  IF p_contact_id IS NOT NULL AND p_company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = p_contact_id AND company_id = p_company_id
        AND workspace_id = private.current_workspace_id()
    ) THEN
      RAISE EXCEPTION 'Le contact ne correspond pas au compte sélectionné';
    END IF;
  END IF;

  IF p_opportunity_id IS NOT NULL AND p_company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.opportunities
      WHERE id = p_opportunity_id AND company_id = p_company_id
        AND workspace_id = private.current_workspace_id()
    ) THEN
      RAISE EXCEPTION 'L''opportunité ne correspond pas au compte sélectionné';
    END IF;
  END IF;

  IF p_candidate_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.candidates
      WHERE id = p_candidate_id AND workspace_id = private.current_workspace_id()
    ) THEN
      RAISE EXCEPTION 'Candidat introuvable dans ce workspace';
    END IF;
  END IF;

  IF p_collaborator_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE id = p_collaborator_id AND workspace_id = private.current_workspace_id()
    ) THEN
      RAISE EXCEPTION 'Collaborateur introuvable dans ce workspace';
    END IF;
  END IF;

  IF p_mission_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.missions
      WHERE id = p_mission_id AND workspace_id = private.current_workspace_id()
    ) THEN
      RAISE EXCEPTION 'Mission introuvable dans ce workspace';
    END IF;
  END IF;

  INSERT INTO public.calendar_events (
    organizer_id, event_type, status, title, description,
    starts_at, ends_at, all_day,
    company_id, contact_id, opportunity_id, candidate_id, collaborator_id, mission_id,
    location, meeting_url, metadata
  ) VALUES (
    auth.uid(), p_event_type, 'scheduled', trim(p_title), p_description,
    p_starts_at, p_ends_at, p_all_day,
    p_company_id, p_contact_id, p_opportunity_id, p_candidate_id, p_collaborator_id, p_mission_id,
    p_location, p_meeting_url, coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  IF p_create_task AND trim(coalesce(p_task_title,'')) <> '' THEN
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

-- Migration: add ends_at and RPC functions for Agenda
-- Date: 2026-06-23

BEGIN;

-- 1. Add ends_at column to interactions
ALTER TABLE public.interactions
ADD COLUMN ends_at timestamptz;

-- 2. Add constraint ensuring ends_at > occurred_at
ALTER TABLE public.interactions
ADD CONSTRAINT chk_interactions_ends_at CHECK (ends_at IS NULL OR ends_at > occurred_at);

-- 3. Create RPC function for atomic creation of agenda event and optional task
CREATE OR REPLACE FUNCTION public.create_agenda_event(
  p_summary text,
  p_occurred_at timestamptz,
  p_ends_at timestamptz,
  p_type text,
  p_company_id uuid,
  p_contact_id uuid,
  p_opportunity_id uuid,
  p_details jsonb,
  p_create_task boolean,
  p_task_title text,
  p_task_due_date timestamptz,
  p_task_priority text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_interaction_id uuid;
  v_task_id uuid;
  v_workspace_id uuid;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  -- Get current user id
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user workspace
  SELECT workspace_id INTO v_workspace_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Workspace not found for current user';
  END IF;

  -- Insert interaction
  INSERT INTO public.interactions (
    workspace_id,
    author_id,
    company_id,
    contact_id,
    opportunity_id,
    type,
    summary,
    occurred_at,
    ends_at,
    details
  ) VALUES (
    v_workspace_id,
    v_user_id,
    p_company_id,
    p_contact_id,
    p_opportunity_id,
    p_type,
    p_summary,
    p_occurred_at,
    p_ends_at,
    p_details
  )
  RETURNING id INTO v_interaction_id;

  -- Create preparatory task if requested
  v_task_id := NULL;
  IF p_create_task THEN
    INSERT INTO public.tasks (
      workspace_id,
      created_by,
      title,
      due_date,
      priority,
      status,
      entity_type,
      entity_id
    ) VALUES (
      v_workspace_id,
      v_user_id,
      p_task_title,
      p_task_due_date,
      COALESCE(p_task_priority, 'normale'),
      'non_commencee',
      'interaction',
      v_interaction_id
    )
    RETURNING id INTO v_task_id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'interaction_id', v_interaction_id,
    'task_id', v_task_id
  );
  
  RETURN v_result;
END;
$$;

-- 4. Create RPC function for atomic update of agenda event and task
CREATE OR REPLACE FUNCTION public.update_agenda_event(
  p_interaction_id uuid,
  p_summary text,
  p_occurred_at timestamptz,
  p_ends_at timestamptz,
  p_type text,
  p_company_id uuid,
  p_contact_id uuid,
  p_opportunity_id uuid,
  p_details jsonb,
  p_create_task boolean,
  p_task_title text,
  p_task_due_date timestamptz,
  p_task_priority text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid;
  v_task_id uuid;
  v_result jsonb;
BEGIN
  -- Get current user id
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user workspace
  SELECT workspace_id INTO v_workspace_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Workspace not found for current user';
  END IF;

  -- Update interaction and verify it belongs to user's workspace
  UPDATE public.interactions
  SET
    company_id = p_company_id,
    contact_id = p_contact_id,
    opportunity_id = p_opportunity_id,
    type = p_type,
    summary = p_summary,
    occurred_at = p_occurred_at,
    ends_at = p_ends_at,
    details = p_details
  WHERE id = p_interaction_id AND workspace_id = v_workspace_id;

  -- Handle preparatory task
  -- Check if a task already exists for this interaction
  SELECT id INTO v_task_id
  FROM public.tasks
  WHERE entity_type = 'interaction' AND entity_id = p_interaction_id AND workspace_id = v_workspace_id
  LIMIT 1;

  IF p_create_task THEN
    IF v_task_id IS NOT NULL THEN
      -- Update existing task
      UPDATE public.tasks
      SET
        title = p_task_title,
        due_date = p_task_due_date,
        priority = p_task_priority
      WHERE id = v_task_id;
    ELSE
      -- Insert new task
      INSERT INTO public.tasks (
        workspace_id,
        created_by,
        title,
        due_date,
        priority,
        status,
        entity_type,
        entity_id
      ) VALUES (
        v_workspace_id,
        v_user_id,
        p_task_title,
        p_task_due_date,
        COALESCE(p_task_priority, 'normale'),
        'non_commencee',
        'interaction',
        p_interaction_id
      )
      RETURNING id INTO v_task_id;
    END IF;
  ELSE
    -- If p_create_task is false, we delete any preparatory task that might have existed
    IF v_task_id IS NOT NULL THEN
      DELETE FROM public.tasks
      WHERE id = v_task_id;
      v_task_id := NULL;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'interaction_id', p_interaction_id,
    'task_id', v_task_id
  );
  
  RETURN v_result;
END;
$$;

-- 5. Set Comments and Revoke/Grants for functions
COMMENT ON FUNCTION public.create_agenda_event IS 'Atomic creation of an interaction event and an optional associated preparatory task.';
COMMENT ON FUNCTION public.update_agenda_event IS 'Atomic modification of an interaction event and insertion/update/deletion of its associated preparatory task.';

REVOKE ALL ON FUNCTION public.create_agenda_event FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_agenda_event FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_agenda_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_agenda_event TO authenticated;

COMMIT;

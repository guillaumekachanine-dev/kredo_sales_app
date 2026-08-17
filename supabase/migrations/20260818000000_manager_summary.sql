-- Migration pour le compte-rendu Manager (manager_summary)

-- 1. Ajout de l'enum si elle n'existe pas
ALTER TYPE intelligence_document_type ADD VALUE IF NOT EXISTS 'manager_summary';

-- 2. Ajout de strategic_focus
ALTER TABLE public.performance_plans ADD COLUMN IF NOT EXISTS strategic_focus text;

-- 3. RPC get_manager_summary_facts
CREATE OR REPLACE FUNCTION public.get_manager_summary_facts(
  p_workspace_id uuid,
  p_owner_id uuid,
  p_start_date date,
  p_end_date date
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meetings_completed int;
  v_meetings_distribution json;
  v_top_clients json;
  v_staffing_needs_opened int;
  v_treated_needs int;
  v_top_skills json;
  v_candidates_proposed int;
  v_new_opportunities int;
  v_conviction json;
  v_interviews_completed int;
  v_top_candidates json;
  v_offers_made int;
BEGIN
  -- 1. RDV commerciaux réalisés (calendar_events de type commercial hors RH/candidats)
  SELECT count(*) INTO v_meetings_completed
  FROM public.calendar_events
  WHERE workspace_id = p_workspace_id
    AND (organizer_id = p_owner_id OR p_owner_id IS NULL)
    AND starts_at >= p_start_date
    AND starts_at < (p_end_date + 1)
    AND status = 'completed'
    AND event_type <> 'entretien_candidat'
    AND candidate_id IS NULL;

  SELECT COALESCE(json_object_agg(event_type, count), '{}') INTO v_meetings_distribution
  FROM (
    SELECT event_type, count(*) as count
    FROM public.calendar_events
    WHERE workspace_id = p_workspace_id
      AND (organizer_id = p_owner_id OR p_owner_id IS NULL)
      AND starts_at >= p_start_date
      AND starts_at < (p_end_date + 1)
      AND status = 'completed'
      AND event_type <> 'entretien_candidat'
      AND candidate_id IS NULL
    GROUP BY event_type
  ) sub;

  SELECT COALESCE(json_agg(json_build_object('companyId', company_id, 'name', name, 'activityCount', activityCount)), '[]') INTO v_top_clients
  FROM (
    SELECT c.id as company_id, c.name, count(*) as activityCount
    FROM public.calendar_events ce
    JOIN public.companies c ON ce.company_id = c.id
    WHERE ce.workspace_id = p_workspace_id
      AND (ce.organizer_id = p_owner_id OR p_owner_id IS NULL)
      AND ce.starts_at >= p_start_date
      AND ce.starts_at < (p_end_date + 1)
      AND ce.status = 'completed'
      AND ce.event_type <> 'entretien_candidat'
      AND ce.candidate_id IS NULL
    GROUP BY c.id, c.name
    ORDER BY activityCount DESC, c.name ASC
    LIMIT 3
  ) sub;

  -- 2. Besoins AT (opportunités avec requires_staffing = true)
  SELECT count(*) INTO v_staffing_needs_opened
  FROM public.opportunities
  WHERE workspace_id = p_workspace_id
    AND (owner_id = p_owner_id OR p_owner_id IS NULL)
    AND requires_staffing = true
    AND created_at >= p_start_date
    AND created_at < (p_end_date + 1);

  SELECT count(DISTINCT o.id) INTO v_treated_needs
  FROM public.opportunities o
  JOIN public.opportunity_candidates oc ON oc.opportunity_id = o.id
  WHERE o.workspace_id = p_workspace_id
    AND (o.owner_id = p_owner_id OR p_owner_id IS NULL)
    AND o.requires_staffing = true
    AND oc.sent_to_client_at >= p_start_date
    AND oc.sent_to_client_at < (p_end_date + 1);

  SELECT COALESCE(json_agg(json_build_object('skill', skill_name, 'count', cnt)), '[]') INTO v_top_skills
  FROM (
    SELECT s.name as skill_name, count(*) as cnt
    FROM public.opportunity_skills os
    JOIN public.opportunities o ON os.opportunity_id = o.id
    JOIN public.skills s ON os.skill_id = s.id
    WHERE o.workspace_id = p_workspace_id
      AND (o.owner_id = p_owner_id OR p_owner_id IS NULL)
      AND o.created_at >= p_start_date
      AND o.created_at < (p_end_date + 1)
    GROUP BY s.name
    ORDER BY count(*) DESC, s.name ASC
    LIMIT 3
  ) sub;

  SELECT count(*) INTO v_candidates_proposed
  FROM public.opportunity_candidates oc
  JOIN public.opportunities o ON oc.opportunity_id = o.id
  WHERE o.workspace_id = p_workspace_id
    AND (o.owner_id = p_owner_id OR p_owner_id IS NULL)
    AND oc.sent_to_client_at >= p_start_date
    AND oc.sent_to_client_at < (p_end_date + 1);

  SELECT count(*) INTO v_new_opportunities
  FROM public.opportunities
  WHERE workspace_id = p_workspace_id
    AND (owner_id = p_owner_id OR p_owner_id IS NULL)
    AND created_at >= p_start_date
    AND created_at < (p_end_date + 1);

  -- 3. Conviction signature (stages ouverts KREDO: NOT IN ('gagne', 'perdu', 'abandonne'))
  SELECT json_build_object(
      'opportunityId', o.id,
      'title', o.title,
      'companyName', c.name,
      'probability', o.conviction,
      'weightedGain', o.weighted_gain,
      'nextAction', o.next_action_label
    ) INTO v_conviction
  FROM public.opportunities o
  LEFT JOIN public.companies c ON o.company_id = c.id
  WHERE o.workspace_id = p_workspace_id
    AND (o.owner_id = p_owner_id OR p_owner_id IS NULL)
    AND o.stage NOT IN ('gagne', 'perdu', 'abandonne')
  ORDER BY o.conviction DESC NULLS LAST, o.weighted_gain DESC NULLS LAST
  LIMIT 1;

  -- 4. Recrutement : Entretiens candidats réalisés pendant la période
  SELECT count(*) INTO v_interviews_completed
  FROM public.calendar_events
  WHERE workspace_id = p_workspace_id
    AND (organizer_id = p_owner_id OR p_owner_id IS NULL)
    AND starts_at >= p_start_date
    AND starts_at < (p_end_date + 1)
    AND status = 'completed'
    AND event_type = 'entretien_candidat';

  -- Top candidats rencontrés en entretien pendant la période
  SELECT COALESCE(json_agg(json_build_object('candidateId', candidate_id, 'name', name, 'practice', practice)), '[]') INTO v_top_candidates
  FROM (
    SELECT can.id as candidate_id, p.full_name as name, op.name as practice, can.internal_score, can.created_at
    FROM public.candidates can
    JOIN public.persons p ON can.person_id = p.id
    LEFT JOIN public.offer_practices op ON can.practice_id = op.id
    WHERE can.id IN (
      SELECT ce.candidate_id
      FROM public.calendar_events ce
      WHERE ce.workspace_id = p_workspace_id
        AND (ce.organizer_id = p_owner_id OR p_owner_id IS NULL)
        AND ce.starts_at >= p_start_date
        AND ce.starts_at < (p_end_date + 1)
        AND ce.status = 'completed'
        AND ce.event_type = 'entretien_candidat'
        AND ce.candidate_id IS NOT NULL
    )
    AND can.status NOT IN ('refuse', 'ko_manager', 'archive')
    ORDER BY can.internal_score DESC NULLS LAST, can.created_at DESC, p.full_name ASC
    LIMIT 3
  ) sub;

  SELECT count(DISTINCT chm.id) INTO v_offers_made
  FROM public.candidate_hiring_milestones chm
  JOIN public.candidate_hiring_processes chp ON chm.hiring_process_id = chp.id
  WHERE chp.workspace_id = p_workspace_id
    AND (chp.recruiter_id = p_owner_id OR p_owner_id IS NULL)
    AND chm.step = 'proposition'
    AND chm.completed_at >= p_start_date
    AND chm.completed_at < (p_end_date + 1);

  RETURN json_build_object(
    'commercial', json_build_object(
      'meetingsCompletedCount', COALESCE(v_meetings_completed, 0),
      'meetingsDistribution', COALESCE(v_meetings_distribution, '{}'::json),
      'topActiveClients', COALESCE(v_top_clients, '[]'::json),
      'staffingNeedsOpenedCount', COALESCE(v_staffing_needs_opened, 0),
      'treatedNeedsCount', COALESCE(v_treated_needs, 0),
      'topRequestedSkills', COALESCE(v_top_skills, '[]'::json),
      'candidatesProposedCount', COALESCE(v_candidates_proposed, 0),
      'newOpportunitiesCount', COALESCE(v_new_opportunities, 0),
      'signatureConviction', v_conviction
    ),
    'recruitment', json_build_object(
      'interviewsCompletedCount', COALESCE(v_interviews_completed, 0),
      'topCandidatesToKeep', COALESCE(v_top_candidates, '[]'::json),
      'jobOffersMadeCount', COALESCE(v_offers_made, 0)
    )
  );
END;
$$;

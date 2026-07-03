-- ============================================================
-- REPORT-001 — Lot 2 : RPCs d'hydratation des rapports d'activité
-- commerciale et recrutement (workflows n8n report-activity-commercial
-- et report-activity-recruitment). Même pattern que
-- get_account_summary_facts (migration 20260703150000) : un seul appel
-- POST /rest/v1/rpc/... depuis n8n (service_role, filtrage workspace
-- explicite car hors RLS). Tous les faits sont déterministes.
-- ============================================================

-- ============================================================
-- 1. Activité commerciale
-- ============================================================
-- Anti-double-comptage calendar_events / interactions (doctrine ChatGPT
-- validée) : une interaction représente une action déjà réalisée
-- (occurred_at est toujours passé/présent) ; un calendar_event à venir
-- (starts_at > now()) ne peut par construction pas avoir déjà d'interaction
-- associée. "Réalisé" = interactions, "planifié" = calendar_events futurs :
-- les deux ensembles ne se recouvrent jamais, pas besoin de déduplication
-- explicite sur calendar_event_id.
--
-- Caveat structurel : aucune table opportunity_stage_history en base — les
-- "mouvements du pipe" se limitent à créées / gagnées / perdues sur la
-- période (via created_at / closed_at), pas aux changements d'étape
-- intermédiaires. Documenté explicitement dans caveats.

CREATE OR REPLACE FUNCTION public.get_activity_commercial_facts(
  p_workspace_id uuid,
  p_period_start date,
  p_period_end date,
  p_as_of_date date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'startDate', p_period_start,
      'endDate', p_period_end,
      'asOfDate', p_as_of_date
    ),
    'activity', jsonb_build_object(
      'realizedMeetingsCount', (
        SELECT count(*) FROM public.interactions i
        WHERE i.workspace_id = p_workspace_id
          AND i.occurred_at::date BETWEEN p_period_start AND p_period_end
      ),
      'plannedMeetingsCount', (
        SELECT count(*) FROM public.calendar_events ce
        WHERE ce.workspace_id = p_workspace_id
          AND ce.status <> 'cancelled'
          AND ce.starts_at > now()
          AND ce.starts_at::date BETWEEN p_period_start AND p_period_end
      )
    ),
    'pipeMovements', jsonb_build_object(
      'opportunitiesCreatedCount', (
        SELECT count(*) FROM public.opportunities o
        WHERE o.workspace_id = p_workspace_id
          AND o.created_at::date BETWEEN p_period_start AND p_period_end
      ),
      'opportunitiesWonCount', (
        SELECT count(*) FROM public.opportunities o
        WHERE o.workspace_id = p_workspace_id
          AND o.stage = 'gagne'
          AND o.closed_at::date BETWEEN p_period_start AND p_period_end
      ),
      'opportunitiesLostCount', (
        SELECT count(*) FROM public.opportunities o
        WHERE o.workspace_id = p_workspace_id
          AND o.stage IN ('perdu', 'abandonne')
          AND o.closed_at::date BETWEEN p_period_start AND p_period_end
      ),
      'wonWeightedValue', (
        SELECT coalesce(sum(o.acv), 0) FROM public.opportunities o
        WHERE o.workspace_id = p_workspace_id
          AND o.stage = 'gagne'
          AND o.closed_at::date BETWEEN p_period_start AND p_period_end
      )
    ),
    'pipeSnapshot', jsonb_build_object(
      'openOpportunitiesCount', (
        SELECT count(*) FROM public.opportunities o
        WHERE o.workspace_id = p_workspace_id
          AND o.stage NOT IN ('gagne', 'perdu', 'abandonne')
      ),
      'openPipeWeighted', (
        SELECT coalesce(sum(o.weighted_gain), 0) FROM public.opportunities o
        WHERE o.workspace_id = p_workspace_id
          AND o.stage NOT IN ('gagne', 'perdu', 'abandonne')
      )
    ),
    'staleOpportunities', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'opportunityId', o.id,
        'title', o.title,
        'companyName', c.name,
        'stage', o.stage,
        'daysSinceLastAction', (p_as_of_date - coalesce(o.next_action_at::date, o.opened_at::date, o.created_at::date))
      ) ORDER BY coalesce(o.next_action_at::date, o.opened_at::date, o.created_at::date) ASC), '[]'::jsonb)
      FROM (
        SELECT id, title, company_id, stage, next_action_at, opened_at, created_at
        FROM public.opportunities
        WHERE workspace_id = p_workspace_id
          AND stage NOT IN ('gagne', 'perdu', 'abandonne')
          AND (next_action_at IS NULL OR next_action_at::date < p_as_of_date)
        ORDER BY coalesce(next_action_at::date, opened_at::date, created_at::date) ASC
        LIMIT 5
      ) o
      LEFT JOIN public.companies c ON c.id = o.company_id
    ),
    'upcomingNextActions', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'opportunityId', o.id,
        'title', o.title,
        'companyName', c.name,
        'label', o.next_action_label,
        'at', o.next_action_at
      ) ORDER BY o.next_action_at ASC), '[]'::jsonb)
      FROM (
        SELECT id, title, company_id, next_action_label, next_action_at
        FROM public.opportunities
        WHERE workspace_id = p_workspace_id
          AND stage NOT IN ('gagne', 'perdu', 'abandonne')
          AND next_action_at IS NOT NULL
          AND next_action_at::date BETWEEN p_as_of_date AND p_period_end
        ORDER BY next_action_at ASC
        LIMIT 5
      ) o
      LEFT JOIN public.companies c ON c.id = o.company_id
    ),
    'byOwner', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'ownerId', o.owner_id,
        'ownerName', pr.full_name,
        'openCount', o.open_count,
        'openPipeWeighted', o.open_pipe
      ) ORDER BY o.open_pipe DESC), '[]'::jsonb)
      FROM (
        SELECT owner_id,
               count(*) AS open_count,
               coalesce(sum(weighted_gain), 0) AS open_pipe
        FROM public.opportunities
        WHERE workspace_id = p_workspace_id
          AND stage NOT IN ('gagne', 'perdu', 'abandonne')
          AND owner_id IS NOT NULL
        GROUP BY owner_id
      ) o
      LEFT JOIN public.profiles pr ON pr.id = o.owner_id
    ),
    'bySector', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'sectorId', s.sector_id,
        'sectorName', s.sector_name,
        'openCount', s.open_count,
        'openPipeWeighted', s.open_pipe
      ) ORDER BY s.open_pipe DESC), '[]'::jsonb)
      FROM (
        SELECT o.sector_id,
               si.name AS sector_name,
               count(*) AS open_count,
               coalesce(sum(o.weighted_gain), 0) AS open_pipe
        FROM public.opportunities o
        LEFT JOIN public.sector_intelligence si ON si.id = o.sector_id
        WHERE o.workspace_id = p_workspace_id
          AND o.stage NOT IN ('gagne', 'perdu', 'abandonne')
          AND o.sector_id IS NOT NULL
        GROUP BY o.sector_id, si.name
      ) s
    ),
    'dataCutoffAt', now(),
    'caveats', jsonb_build_array(
      'Pas d''historique de changement d''étape (opportunity_stage_history absent) — les mouvements du pipe se limitent aux opportunités créées, gagnées ou perdues sur la période, pas aux avancées intermédiaires.'
    )
  )
$$;

REVOKE ALL ON FUNCTION public.get_activity_commercial_facts(uuid, date, date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_activity_commercial_facts(uuid, date, date, date) TO service_role;

COMMENT ON FUNCTION public.get_activity_commercial_facts(uuid, date, date, date) IS
  'Hydratation déterministe pour le workflow n8n report-activity-commercial (REPORT-001 Lot 2). Anti-double-comptage interactions/calendar_events par construction temporelle (réalisé = passé, planifié = futur).';

-- ============================================================
-- 2. Activité recrutement
-- ============================================================
-- Deux funnels distincts (doctrine ChatGPT validée) :
--   - recrutement interne : candidate_hiring_processes.current_step
--     (prequalification -> ... -> integration, cf. HIRING_KANBAN_STAGES)
--   - positionnement sur besoin : opportunity_candidates.status
--     (identifie -> ... -> gagne/refuse_*, cf. RECRUITMENT_STAGES)
--
-- Caveat structurel : pas d'horodatage systématique des transitions d'étape
-- sur candidate_hiring_processes (seul current_step est stocké, pas
-- l'historique) — "temps moyen par étape" non calculable en v1.

CREATE OR REPLACE FUNCTION public.get_activity_recruitment_facts(
  p_workspace_id uuid,
  p_period_start date,
  p_period_end date,
  p_as_of_date date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'startDate', p_period_start,
      'endDate', p_period_end,
      'asOfDate', p_as_of_date
    ),
    'hiringFunnel', jsonb_build_object(
      'byStep', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'step', chp.current_step,
          'count', chp.cnt
        ) ORDER BY chp.cnt DESC), '[]'::jsonb)
        FROM (
          SELECT current_step, count(*) AS cnt
          FROM public.candidate_hiring_processes
          WHERE workspace_id = p_workspace_id AND status = 'active'
          GROUP BY current_step
        ) chp
      ),
      'closedThisPeriod', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'closeReason', cr.close_reason,
          'count', cr.cnt
        ) ORDER BY cr.cnt DESC), '[]'::jsonb)
        FROM (
          SELECT close_reason, count(*) AS cnt
          FROM public.candidate_hiring_processes
          WHERE workspace_id = p_workspace_id
            AND closed_at::date BETWEEN p_period_start AND p_period_end
          GROUP BY close_reason
        ) cr
      ),
      'integratedThisPeriod', (
        SELECT count(*) FROM public.candidate_hiring_milestones chm
        JOIN public.candidate_hiring_processes chp ON chp.id = chm.hiring_process_id
        WHERE chp.workspace_id = p_workspace_id
          AND chm.step = 'integration'
          AND chm.completed_at::date BETWEEN p_period_start AND p_period_end
      )
    ),
    'positioningFunnel', jsonb_build_object(
      'byStatus', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'status', oc.status,
          'count', oc.cnt
        ) ORDER BY oc.cnt DESC), '[]'::jsonb)
        FROM (
          SELECT status, count(*) AS cnt
          FROM public.opportunity_candidates
          WHERE workspace_id = p_workspace_id
          GROUP BY status
        ) oc
      ),
      'sentToClientThisPeriod', (
        SELECT count(*) FROM public.opportunity_candidates
        WHERE workspace_id = p_workspace_id
          AND sent_to_client_at::date BETWEEN p_period_start AND p_period_end
      ),
      'proposedThisPeriod', (
        SELECT count(*) FROM public.opportunity_candidates
        WHERE workspace_id = p_workspace_id
          AND proposed_at::date BETWEEN p_period_start AND p_period_end
      )
    ),
    'pendingOffers', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'candidateId', cand.candidate_id,
        'candidateName', p.full_name,
        'offerStatus', cand.active_offer_status,
        'deadline', cand.active_offer_deadline
      ) ORDER BY cand.active_offer_deadline ASC NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT id AS candidate_id, person_id, active_offer_status, active_offer_deadline
        FROM public.candidates
        WHERE workspace_id = p_workspace_id AND active_offer_status IS NOT NULL
        ORDER BY active_offer_deadline ASC NULLS LAST
        LIMIT 5
      ) cand
      LEFT JOIN public.persons p ON p.id = cand.person_id
    ),
    'availableSoon', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'candidateId', cand.candidate_id,
        'candidateName', p.full_name,
        'availableFrom', cand.available_from
      ) ORDER BY cand.available_from ASC), '[]'::jsonb)
      FROM (
        SELECT id AS candidate_id, person_id, available_from
        FROM public.candidates
        WHERE workspace_id = p_workspace_id
          AND available_from BETWEEN p_as_of_date AND p_period_end
        ORDER BY available_from ASC
        LIMIT 5
      ) cand
      LEFT JOIN public.persons p ON p.id = cand.person_id
    ),
    'byPractice', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'practiceId', pr.practice_id,
        'practiceName', pr.practice_name,
        'activeCandidatesCount', pr.cnt
      ) ORDER BY pr.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT c.practice_id, prac.name AS practice_name, count(*) AS cnt
        FROM public.candidates c
        LEFT JOIN public.offer_practices prac ON prac.id = c.practice_id -- table réelle live, "practices" (nom générique) n'existe pas
        WHERE c.workspace_id = p_workspace_id
          AND c.status NOT IN ('recrute', 'refuse', 'ko_manager', 'archive')
        GROUP BY c.practice_id, prac.name
      ) pr
    ),
    'byOrigin', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'source', o.source,
        'count', o.cnt
      ) ORDER BY o.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT source, count(*) AS cnt
        FROM public.candidates
        WHERE workspace_id = p_workspace_id
        GROUP BY source
      ) o
    ),
    'dataCutoffAt', now(),
    'caveats', jsonb_build_array(
      'Pas d''historique horodaté des transitions d''étape sur candidate_hiring_processes — le temps moyen passé par étape n''est pas calculable en v1, seule la répartition instantanée est disponible.'
    )
  )
$$;

REVOKE ALL ON FUNCTION public.get_activity_recruitment_facts(uuid, date, date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_activity_recruitment_facts(uuid, date, date, date) TO service_role;

COMMENT ON FUNCTION public.get_activity_recruitment_facts(uuid, date, date, date) IS
  'Hydratation déterministe pour le workflow n8n report-activity-recruitment (REPORT-001 Lot 2). Deux funnels distincts : recrutement interne (candidate_hiring_processes.current_step) et positionnement sur besoin (opportunity_candidates.status).';

-- ============================================================
-- ADR-0010 — Brief hebdomadaire — Lot 1 : listes bornées en complément
-- des compteurs de get_weekly_business_facts
-- ============================================================
-- Correctif apporté avant tout appel n8n : des compteurs seuls ne
-- permettent pas de construire des WeeklyManagerPriorityItem individuels
-- (pas d'entityId à quoi rattacher une action "1-clic" ou un dismiss). On
-- ajoute donc, à côté de chaque *Count, une liste bornée (LIMIT 5, même
-- convention que get_activity_commercial_facts.staleOpportunities /
-- get_activity_recruitment_facts.pendingOffers) portant les identités
-- nécessaires. CREATE OR REPLACE sur la même signature — pas une nouvelle
-- fonction, la précédente (20260704200000) n'a jamais été consommée par un
-- appelant externe.

CREATE OR REPLACE FUNCTION public.get_weekly_business_facts(
  p_workspace_id uuid,
  p_period_start date,
  p_period_end date,
  p_owner_id uuid DEFAULT NULL,
  p_as_of_date date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'commercial', jsonb_build_object(
      'weightedPipeThisWeek', (
        SELECT coalesce(sum(o.weighted_gain), 0)
        FROM public.opportunities o
        WHERE o.workspace_id = p_workspace_id
          AND o.stage NOT IN ('gagne', 'perdu', 'abandonne')
          AND o.next_action_at::date BETWEEN p_period_start AND p_period_end
          AND (p_owner_id IS NULL OR o.owner_id = p_owner_id)
      ),
      'staleOpportunitiesCount', (
        SELECT count(*)
        FROM public.opportunities o
        WHERE o.workspace_id = p_workspace_id
          AND o.stage NOT IN ('gagne', 'perdu', 'abandonne')
          AND (o.next_action_at IS NULL OR o.next_action_at::date < p_as_of_date)
          AND (p_owner_id IS NULL OR o.owner_id = p_owner_id)
      ),
      'staleOpportunities', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', o.id,
          'title', o.title,
          'companyId', o.company_id,
          'companyName', c.name,
          'daysSinceLastAction', (p_as_of_date - coalesce(o.next_action_at::date, o.opened_at::date, o.created_at::date)),
          'weightedGain', o.weighted_gain
        ) ORDER BY coalesce(o.next_action_at::date, o.opened_at::date, o.created_at::date) ASC), '[]'::jsonb)
        FROM (
          SELECT id, title, company_id, next_action_at, opened_at, created_at, weighted_gain, owner_id
          FROM public.opportunities
          WHERE workspace_id = p_workspace_id
            AND stage NOT IN ('gagne', 'perdu', 'abandonne')
            AND (next_action_at IS NULL OR next_action_at::date < p_as_of_date)
            AND (p_owner_id IS NULL OR owner_id = p_owner_id)
          ORDER BY coalesce(next_action_at::date, opened_at::date, created_at::date) ASC
          LIMIT 5
        ) o
        LEFT JOIN public.companies c ON c.id = o.company_id
      ),
      'quietTargetAccountsCount', (
        SELECT count(*)
        FROM public.companies c
        WHERE c.workspace_id = p_workspace_id
          AND c.lifecycle_status IN ('cible', 'prospect')
          AND (c.last_contact_at IS NULL OR c.last_contact_at::date < (p_as_of_date - 30))
          AND (p_owner_id IS NULL OR c.owner_id = p_owner_id)
      ),
      'quietTargetAccounts', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'lastContactAt', c.last_contact_at
        ) ORDER BY c.last_contact_at ASC NULLS FIRST), '[]'::jsonb)
        FROM (
          SELECT id, name, last_contact_at
          FROM public.companies
          WHERE workspace_id = p_workspace_id
            AND lifecycle_status IN ('cible', 'prospect')
            AND (last_contact_at IS NULL OR last_contact_at::date < (p_as_of_date - 30))
            AND (p_owner_id IS NULL OR owner_id = p_owner_id)
          ORDER BY last_contact_at ASC NULLS FIRST
          LIMIT 5
        ) c
      )
    ),
    'delivery', jsonb_build_object(
      'lowMarginMissionsCount', (
        SELECT count(*)
        FROM public.missions m
        LEFT JOIN public.companies c ON c.id = m.company_id
        WHERE m.workspace_id = p_workspace_id
          AND m.status = 'active'
          AND m.gross_margin_pct < 15
          AND (p_owner_id IS NULL OR c.owner_id = p_owner_id)
      ),
      'lowMarginMissions', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'companyId', m.company_id,
          'companyName', c.name,
          'grossMarginPct', m.gross_margin_pct
        ) ORDER BY m.gross_margin_pct ASC), '[]'::jsonb)
        FROM (
          SELECT mi.id, mi.title, mi.company_id, mi.gross_margin_pct
          FROM public.missions mi
          LEFT JOIN public.companies co ON co.id = mi.company_id
          WHERE mi.workspace_id = p_workspace_id
            AND mi.status = 'active'
            AND mi.gross_margin_pct < 15
            AND (p_owner_id IS NULL OR co.owner_id = p_owner_id)
          ORDER BY mi.gross_margin_pct ASC
          LIMIT 5
        ) m
        LEFT JOIN public.companies c ON c.id = m.company_id
      ),
      'lowActivityCollaboratorsCount', (
        WITH latest_cra AS (
          SELECT DISTINCT ON (mar.collaborator_id)
            mar.collaborator_id, mar.activity_rate_percent
          FROM public.mission_activity_reports mar
          WHERE mar.workspace_id = p_workspace_id
          ORDER BY mar.collaborator_id, mar.period_start DESC
        )
        SELECT count(*) FROM latest_cra WHERE activity_rate_percent < 70
      ),
      'lowActivityCollaborators', (
        WITH latest_cra AS (
          SELECT DISTINCT ON (mar.collaborator_id)
            mar.collaborator_id, mar.activity_rate_percent
          FROM public.mission_activity_reports mar
          WHERE mar.workspace_id = p_workspace_id
          ORDER BY mar.collaborator_id, mar.period_start DESC
        )
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', lc.collaborator_id,
          'fullName', p.full_name,
          'activityRatePercent', lc.activity_rate_percent
        ) ORDER BY lc.activity_rate_percent ASC), '[]'::jsonb)
        FROM (
          SELECT collaborator_id, activity_rate_percent
          FROM latest_cra
          WHERE activity_rate_percent < 70
          ORDER BY activity_rate_percent ASC
          LIMIT 5
        ) lc
        LEFT JOIN public.collaborators col ON col.id = lc.collaborator_id
        LEFT JOIN public.persons p ON p.id = col.person_id
      )
    ),
    'recruitment', jsonb_build_object(
      'openPositioningCount', (
        SELECT count(*)
        FROM public.opportunity_candidates oc
        WHERE oc.workspace_id = p_workspace_id
          AND oc.status NOT IN ('retenu', 'refuse_candidat', 'refuse_client')
          AND (p_owner_id IS NULL OR oc.recruiter_id = p_owner_id)
      ),
      'pendingOffersCount', (
        SELECT count(*)
        FROM public.candidates cand
        WHERE cand.workspace_id = p_workspace_id
          AND cand.active_offer_status IS NOT NULL
          AND (p_owner_id IS NULL OR cand.recruiter_id = p_owner_id)
      ),
      'pendingOffers', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', cand.candidate_id,
          'candidateName', p.full_name,
          'offerStatus', cand.active_offer_status,
          'deadline', cand.active_offer_deadline
        ) ORDER BY cand.active_offer_deadline ASC NULLS LAST), '[]'::jsonb)
        FROM (
          SELECT id AS candidate_id, person_id, active_offer_status, active_offer_deadline
          FROM public.candidates
          WHERE workspace_id = p_workspace_id
            AND active_offer_status IS NOT NULL
            AND (p_owner_id IS NULL OR recruiter_id = p_owner_id)
          ORDER BY active_offer_deadline ASC NULLS LAST
          LIMIT 5
        ) cand
        LEFT JOIN public.persons p ON p.id = cand.person_id
      )
    ),
    'dataCutoffAt', now(),
    'caveats', jsonb_build_array(
      'quietTargetAccountsCount dépend de companies.last_contact_at — ce champ n''est pas systématiquement maintenu par tous les workflows de saisie, un compte peut donc apparaître "silencieux" à tort si son dernier contact n''a pas été loggé.',
      'lowActivityCollaboratorsCount reste toujours calculé sur l''ensemble du workspace, même en périmètre personnel (p_owner_id) — aucune notion d''"owner commercial" ne s''applique à un collaborateur en delivery.',
      'Les listes (staleOpportunities, quietTargetAccounts, lowMarginMissions, lowActivityCollaborators, pendingOffers) sont bornées à 5 éléments — les compteurs *Count reflètent le total réel, pas la taille de la liste.'
    )
  )
$$;

COMMENT ON FUNCTION public.get_weekly_business_facts(uuid, date, date, uuid, date) IS
  'Hydratation déterministe des faits business du brief hebdomadaire (ADR-0010 Lot 1), utilisée en complément de loadAgendaSnapshot() côté Next.js (computeWeeklyBrief) — jamais seule. Ne couvre que ce que l''agenda ne peut pas produire (montants, comptes sans trace agenda, indicateurs CRA). Chaque *Count est accompagné d''une liste bornée (LIMIT 5) portant les identités nécessaires aux priorités individuelles et aux actions 1-clic. p_owner_id NULL = périmètre workspace.';

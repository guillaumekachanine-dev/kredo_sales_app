-- ============================================================
-- REPORT-001 — Lot 1 : RPC unique d'hydratation de la fiche
-- de synthèse compte (workflow n8n report-account-summary).
-- Même pattern que get_communication_context (migration
-- 20260702090000) : un seul appel POST /rest/v1/rpc/... depuis
-- n8n (service_role, hors RLS) au lieu de 8+ requêtes REST.
-- Tous les faits sont déterministes — le LLM ne fait que les
-- expliquer (voir compute_conviction_score_v1/investment_score_v1,
-- migration 20260703120000).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_account_summary_facts(
  p_workspace_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'identity', (
      SELECT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'lifecycleStatus', c.lifecycle_status,
        'sector', c.sector,
        'sectorId', c.sector_id,
        'segment', c.segment,
        'aiScore', c.ai_score,
        'priority', c.priority
      )
      FROM public.companies c
      WHERE c.id = p_company_id AND c.workspace_id = p_workspace_id
    ),
    'potential', (
      SELECT jsonb_build_object(
        'openPipeWeighted', coalesce(sum(o.weighted_gain), 0),
        'openOpportunitiesCount', count(*) FILTER (WHERE o.stage NOT IN ('gagne', 'perdu', 'abandonne')),
        'wonOpportunitiesCount', count(*) FILTER (WHERE o.stage = 'gagne'),
        'totalOpportunitiesCount', count(*)
      )
      FROM public.opportunities o
      WHERE o.company_id = p_company_id AND o.workspace_id = p_workspace_id
    ),
    'relation', (
      SELECT jsonb_build_object(
        'activeMissionsCount', (
          SELECT count(*) FROM public.missions m
          WHERE m.company_id = p_company_id AND m.workspace_id = p_workspace_id AND m.status = 'active'
        ),
        'avgTheoreticalMarginPct', (
          SELECT round(avg(m.gross_margin_pct), 1) FROM public.missions m
          WHERE m.company_id = p_company_id AND m.workspace_id = p_workspace_id AND m.status = 'active'
        ),
        'totalRevenueProduced', (
          SELECT coalesce(sum(mar.billable_days * mar.tjm_snapshot), 0)
          FROM public.mission_activity_reports mar
          JOIN public.missions m ON m.id = mar.mission_id
          WHERE m.company_id = p_company_id AND m.workspace_id = p_workspace_id
        ),
        'ytdRevenueProduced', (
          SELECT coalesce(sum(mar.billable_days * mar.tjm_snapshot), 0)
          FROM public.mission_activity_reports mar
          JOIN public.missions m ON m.id = mar.mission_id
          WHERE m.company_id = p_company_id AND m.workspace_id = p_workspace_id
            AND mar.period_start >= date_trunc('year', now())
        ),
        'contactsCount', (
          SELECT count(*) FROM public.contacts ct
          WHERE ct.company_id = p_company_id AND ct.workspace_id = p_workspace_id
        )
      )
    ),
    'activity', (
      SELECT jsonb_build_object(
        'needsTreatedCount', (
          SELECT count(*) FROM public.opportunities o
          WHERE o.company_id = p_company_id AND o.workspace_id = p_workspace_id
        ),
        'meetingsRealizedLast12m', (
          SELECT count(*) FROM public.interactions i
          WHERE i.company_id = p_company_id AND i.workspace_id = p_workspace_id
            AND i.occurred_at >= now() - interval '12 months'
        ),
        'nextActions', (
          SELECT coalesce(jsonb_agg(jsonb_build_object(
            'opportunityId', o.id,
            'label', o.next_action_label,
            'at', o.next_action_at
          ) ORDER BY o.next_action_at ASC), '[]'::jsonb)
          FROM (
            SELECT id, next_action_label, next_action_at FROM public.opportunities
            WHERE company_id = p_company_id AND workspace_id = p_workspace_id
              AND stage NOT IN ('gagne', 'perdu', 'abandonne')
              AND next_action_at IS NOT NULL
            ORDER BY next_action_at ASC
            LIMIT 3
          ) o
        )
      )
    ),
    'signals', jsonb_build_object(
      'news', (
        SELECT jsonb_build_object(
          'title', sn.title,
          'summary', sn.summary,
          'publishedAt', sn.published_at,
          'isTriggerEvent', sn.is_trigger_event
        )
        FROM public.sector_news sn
        JOIN public.companies c ON c.sector_id = sn.sector_id
        WHERE c.id = p_company_id AND sn.workspace_id = p_workspace_id
        ORDER BY sn.relevance_score DESC NULLS LAST, sn.published_at DESC
        LIMIT 1
      ),
      'regulatoryDeadline', (
        SELECT jsonb_build_object(
          'name', sri.name,
          'description', sri.description,
          'deadlineDate', sri.deadline_date,
          'urgency', sri.urgency,
          'isCommercialWindow', sri.is_commercial_window
        )
        FROM public.sector_regulatory_items sri
        JOIN public.companies c ON c.sector_id = sri.sector_id
        WHERE c.id = p_company_id AND sri.workspace_id = p_workspace_id
          AND (sri.deadline_date IS NULL OR sri.deadline_date >= current_date)
        ORDER BY sri.deadline_date ASC NULLS LAST
        LIMIT 1
      )
    ),
    'scores', jsonb_build_object(
      'conviction', public.compute_conviction_score_v1(p_company_id),
      'investment', public.compute_investment_score_v1(p_company_id)
    ),
    'dataCutoffAt', now(),
    'caveats', (
      SELECT coalesce(jsonb_agg(caveat), '[]'::jsonb)
      FROM (
        SELECT 'Aucun secteur structuré rattaché au compte — signaux et échéances réglementaires indisponibles.' AS caveat
        WHERE NOT EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = p_company_id AND c.workspace_id = p_workspace_id AND c.sector_id IS NOT NULL
        )
      ) caveats
    )
  )
$$;

REVOKE ALL ON FUNCTION public.get_account_summary_facts(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_account_summary_facts(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.get_account_summary_facts(uuid, uuid) IS
  'Hydratation déterministe pour le workflow n8n report-account-summary (REPORT-001 Lot 1). Un seul appel POST /rest/v1/rpc/get_account_summary_facts (service_role, filtrage workspace explicite car hors RLS) remplace 8+ requêtes REST séparées. Le LLM ne reçoit que ce JSON et ne peut citer que les valeurs qui y figurent.';

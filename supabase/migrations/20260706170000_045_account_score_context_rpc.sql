-- ============================================================
-- ADR-0011 Lot 3 — RPC unique d'hydratation de contexte pour le
-- moteur de scoring TypeScript (src/lib/account-scoring/).
-- Même pattern que get_pitch_context/get_communication_context/
-- get_account_summary_facts : un seul appel remplace plusieurs
-- requêtes REST séparées. Appelée depuis une Server Action en
-- session utilisateur standard (SECURITY INVOKER, RLS normal),
-- pas depuis n8n — pas de contrainte de clé JSON héritée ici.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_account_score_context(
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
    'company', (
      SELECT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'lifecycleStatus', c.lifecycle_status,
        'sector', c.sector,
        'sectorId', c.sector_id,
        'segment', c.segment,
        'revenue', c.revenue,
        'employeeCount', c.employee_count,
        'sizeBand', c.size_band,
        'priority', c.priority
      )
      FROM public.companies c
      WHERE c.id = p_company_id AND c.workspace_id = p_workspace_id
    ),
    'sector', (
      SELECT jsonb_build_object(
        'slug', si.slug,
        'attractivenessScore', si.attractiveness_score,
        'practicesFit', si.practices_fit
      )
      FROM public.sector_intelligence si
      JOIN public.companies c ON c.sector_id = si.id
      WHERE c.id = p_company_id AND si.workspace_id = p_workspace_id
    ),
    'contacts', (
      SELECT jsonb_build_object(
        'totalCount', count(*),
        'decisionMakerCount', count(*) FILTER (WHERE relationship_role IN ('decideur', 'dsi', 'direction_metier', 'sponsor')),
        'priorityCount', count(*) FILTER (WHERE is_priority),
        'strongRelationshipCount', count(*) FILTER (WHERE relationship_level = 'fort')
      )
      FROM public.contacts
      WHERE company_id = p_company_id AND workspace_id = p_workspace_id
    ),
    'opportunities', (
      SELECT jsonb_build_object(
        'openCount', count(*) FILTER (WHERE stage NOT IN ('gagne', 'perdu', 'abandonne')),
        'openWeightedGain', coalesce(sum(weighted_gain) FILTER (WHERE stage NOT IN ('gagne', 'perdu', 'abandonne')), 0),
        'wonCount', count(*) FILTER (WHERE stage = 'gagne'),
        'lostCount', count(*) FILTER (WHERE stage IN ('perdu', 'abandonne')),
        'hasOverdueNextAction', bool_or(
          stage NOT IN ('gagne', 'perdu', 'abandonne')
          AND next_action_at IS NOT NULL
          AND next_action_at < now()
        ),
        'hasUpcomingNextAction', bool_or(
          stage NOT IN ('gagne', 'perdu', 'abandonne')
          AND next_action_at IS NOT NULL
          AND next_action_at >= now()
        )
      )
      FROM public.opportunities
      WHERE company_id = p_company_id AND workspace_id = p_workspace_id
    ),
    'missions', (
      SELECT jsonb_build_object(
        'activeCount', count(*),
        'avgGrossMarginPct', round(avg(gross_margin_pct), 1)
      )
      FROM public.missions
      WHERE company_id = p_company_id AND workspace_id = p_workspace_id AND status = 'active'
    ),
    'interactions', (
      SELECT jsonb_build_object(
        'recentCount90d', count(*) FILTER (WHERE occurred_at >= now() - interval '90 days'),
        'lastInteractionAt', max(occurred_at)
      )
      FROM public.interactions
      WHERE company_id = p_company_id AND workspace_id = p_workspace_id
    ),
    'signals', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'category', s.signal_category,
        'type', s.signal_type,
        'title', s.title,
        'confidenceScore', s.confidence_score,
        'relevanceScore', s.relevance_score,
        'urgencyScore', s.urgency_score,
        'detectedAt', s.detected_at,
        'expiresAt', s.expires_at,
        'eventAt', s.event_at
      ) ORDER BY s.detected_at DESC), '[]'::jsonb)
      FROM (
        SELECT *
        FROM public.account_signals
        WHERE company_id = p_company_id
          AND workspace_id = p_workspace_id
          AND status NOT IN ('dismissed', 'false_positive', 'expired', 'archived')
          AND (expires_at IS NULL OR expires_at >= now())
        ORDER BY detected_at DESC
        LIMIT 30
      ) s
    ),
    'dataCutoffAt', now()
  )
$$;

REVOKE ALL ON FUNCTION public.get_account_score_context(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_account_score_context(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_account_score_context(uuid, uuid) IS
  'ADR-0011 Lot 3 — hydratation déterministe pour le moteur de scoring TypeScript (src/lib/account-scoring/). Appelée en session utilisateur (SECURITY INVOKER, RLS normal) depuis la Server Action recomputeAccountScore, pas depuis n8n. GRANT authenticated (contrairement aux RPC service_role de communication/pitch/reports) car c''est l''utilisateur connecté qui déclenche le recalcul via le bouton "Actualiser".';

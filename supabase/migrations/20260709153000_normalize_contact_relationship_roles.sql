BEGIN;

CREATE OR REPLACE FUNCTION private.normalize_contact_relationship_role(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  WITH normalized AS (
    SELECT NULLIF(regexp_replace(lower(btrim(p_value)), '\s+', ' ', 'g'), '') AS value
  )
  SELECT CASE value
    WHEN 'decideur' THEN 'decideur'
    WHEN 'dsi' THEN 'decideur'
    WHEN 'direction_metier' THEN 'decideur'
    WHEN 'prescripteur' THEN 'prescripteur'
    WHEN 'rh' THEN 'prescripteur'
    WHEN 'sponsor' THEN 'sponsor'
    WHEN 'operationnel' THEN 'operationnel'
    WHEN 'manager_technique' THEN 'operationnel'
    WHEN 'utilisateur_final' THEN 'operationnel'
    WHEN 'acheteur' THEN 'acheteur'
    ELSE value
  END
  FROM normalized;
$$;

CREATE OR REPLACE FUNCTION private.contacts_normalize_relationship_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.relationship_role := private.normalize_contact_relationship_role(NEW.relationship_role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_normalize_relationship_role ON public.contacts;

CREATE TRIGGER trg_contacts_normalize_relationship_role
BEFORE INSERT OR UPDATE OF relationship_role
ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION private.contacts_normalize_relationship_role();

UPDATE public.contacts
SET relationship_role = private.normalize_contact_relationship_role(relationship_role)
WHERE relationship_role IS NOT NULL;

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_relationship_role_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_relationship_role_check
  CHECK (
    relationship_role IS NULL
    OR relationship_role = ANY (
      ARRAY[
        'decideur'::text,
        'prescripteur'::text,
        'sponsor'::text,
        'operationnel'::text,
        'acheteur'::text
      ]
    )
  );

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
        'decisionMakerCount', count(*) FILTER (WHERE relationship_role IN ('decideur', 'sponsor')),
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

CREATE OR REPLACE FUNCTION public.compute_conviction_score_v1(p_company_id uuid)
RETURNS numeric(3,1)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH pipe AS (
    SELECT coalesce(sum(weighted_gain), 0) AS weighted_pipe,
           count(*) FILTER (WHERE stage NOT IN ('gagne', 'perdu', 'abandonne')) AS open_count
    FROM public.opportunities
    WHERE company_id = p_company_id
  ),
  won AS (
    SELECT count(*) AS won_count
    FROM public.opportunities
    WHERE company_id = p_company_id AND stage = 'gagne'
  ),
  signals AS (
    SELECT count(*) AS recent_signal_count
    FROM public.sector_news sn
    JOIN public.companies c ON c.sector_id = sn.sector_id
    WHERE c.id = p_company_id
      AND sn.published_at >= now() - interval '90 days'
  ),
  key_contacts AS (
    SELECT count(*) AS decision_maker_count
    FROM public.contacts
    WHERE company_id = p_company_id
      AND relationship_role IN ('decideur', 'sponsor')
  )
  SELECT round((
      0.45 * least(5.0, (pipe.weighted_pipe / 20000.0))
      + 0.20 * least(5.0, signals.recent_signal_count * 1.25)
      + 0.20 * least(5.0, key_contacts.decision_maker_count * 1.7)
      + 0.15 * least(5.0, pipe.open_count * 1.0 + won.won_count * 1.5)
    )::numeric, 1)
  FROM pipe, won, signals, key_contacts
$$;

COMMIT;

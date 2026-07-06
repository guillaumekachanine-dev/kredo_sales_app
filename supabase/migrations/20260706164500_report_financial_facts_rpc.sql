-- ============================================================
-- REPORT-001 — Lot 1 : RPC unique de calcul des faits du
-- rapport financier V1 (get_financial_report_facts).
-- Génération déterministe, sans n8n, sans LLM.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_financial_report_facts(
  p_workspace_id uuid,
  p_fiscal_year integer,
  p_as_of_date date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  -- Variables intermédiaires
  v_linear_fraction numeric(4,3);
  v_months_count integer;
  v_expected_months integer;
  v_missing_months_count integer;
  v_last_closed_month date;
  v_max_cra_month date;
  
  -- KPIs P&L
  v_ytd_revenue numeric(12,2) := 0;
  v_ytd_gm_value numeric(12,2) := 0;
  v_ytd_gm_pct numeric(5,2);
  v_monthly_pnl jsonb := '[]'::jsonb;

  -- Bridge
  v_assistance_all numeric(12,2) := 0;
  v_assistance_validated numeric(12,2) := 0;
  v_project_milestones numeric(12,2) := 0;
  v_pnl_residual numeric(12,2) := 0;
  v_pnl_residual_pct numeric(5,2);
  v_cra_coverage numeric(5,2);

  -- Pipeline
  v_assistance_pipe numeric(12,2) := 0;
  v_project_pipe numeric(12,2) := 0;
  v_audit_pipe numeric(12,2) := 0;
  v_total_pipe numeric(12,2) := 0;
  v_open_opps_count integer := 0;

  -- Targets
  v_rev_target numeric(12,2);
  v_margin_target numeric(5,2);
  v_rev_completion_pct numeric(5,2);
  v_linear_target_gap numeric(12,2);

  -- Trajectory
  v_run_rate numeric(12,2);
  v_projected_revenue numeric(12,2);
  v_confidence_index integer := 70;
  v_confidence_label text := 'medium';

  -- Outputs
  v_missing_months jsonb := '[]'::jsonb;
  v_caveats jsonb := '[]'::jsonb;
  v_alerts jsonb := '[]'::jsonb;
  v_quick_win jsonb := '{}'::jsonb;

  -- Temporary structures
  v_caveat_text text;
  v_alert_item jsonb;
BEGIN
  -- ── 1. Fraction linéaire de l'année ─────────────────────────────────────────
  IF extract(year FROM p_as_of_date) < p_fiscal_year THEN
    v_linear_fraction := 0.0;
  ELSIF extract(year FROM p_as_of_date) > p_fiscal_year THEN
    v_linear_fraction := 1.0;
  ELSE
    v_linear_fraction := least(1.0, greatest(0.0, extract(doy FROM p_as_of_date) / 365.0));
  END IF;

  -- ── 2. Calcul du P&L Officiel ───────────────────────────────────────────────
  -- Récupérer la liste des mois de P&L pour cette année et avant/égal à as_of_date
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'month', period_month::text,
    'revenue', revenue_total,
    'grossMarginPct', gross_margin_percent,
    'operatingProfit', operating_profit_value
  ) ORDER BY period_month ASC), '[]'::jsonb)
  INTO v_monthly_pnl
  FROM public.pnl_monthly
  WHERE workspace_id = p_workspace_id
    AND extract(year FROM period_month) = p_fiscal_year
    AND period_month <= p_as_of_date;

  -- Agrégats P&L YTD
  SELECT
    coalesce(sum(revenue_total), 0),
    coalesce(sum(gross_margin_value), 0),
    count(*),
    max(period_month)
  INTO
    v_ytd_revenue,
    v_ytd_gm_value,
    v_months_count,
    v_last_closed_month
  FROM public.pnl_monthly
  WHERE workspace_id = p_workspace_id
    AND extract(year FROM period_month) = p_fiscal_year
    AND period_month <= p_as_of_date;

  IF v_ytd_revenue > 0 THEN
    v_ytd_gm_pct := round((v_ytd_gm_value / v_ytd_revenue * 100), 2);
  ELSE
    v_ytd_gm_pct := NULL;
  END IF;

  -- ── 3. Revenue Bridge (CRA + Projets) ───────────────────────────────────────
  -- CA Assistance issu des CRA (hors rejetés)
  SELECT
    coalesce(sum(billable_days * tjm_snapshot), 0),
    coalesce(sum(CASE WHEN status = 'validated' THEN billable_days * tjm_snapshot ELSE 0 END), 0),
    max(period_start)
  INTO
    v_assistance_all,
    v_assistance_validated,
    v_max_cra_month
  FROM public.mission_activity_reports
  WHERE workspace_id = p_workspace_id
    AND extract(year FROM period_start) = p_fiscal_year
    AND period_start <= p_as_of_date
    AND status <> 'rejected';

  -- CA Projets issu des jalons facturés (invoiced_at non null)
  SELECT coalesce(sum((m->>'amount')::numeric), 0)
  INTO v_project_milestones
  FROM public.projects p,
       jsonb_array_elements(p.billing_milestones) m
  WHERE p.workspace_id = p_workspace_id
    AND m->>'invoiced_at' IS NOT NULL
    AND (m->>'invoiced_at')::date >= make_date(p_fiscal_year, 1, 1)
    AND (m->>'invoiced_at')::date <= make_date(p_fiscal_year, 12, 31)
    AND (m->>'invoiced_at')::date <= p_as_of_date;

  -- Résiduel P&L inexpliqué
  v_pnl_residual := v_ytd_revenue - v_assistance_all - v_project_milestones;

  IF v_ytd_revenue > 0 THEN
    v_pnl_residual_pct := round((v_pnl_residual / v_ytd_revenue * 100), 2);
  ELSE
    v_pnl_residual_pct := NULL;
  END IF;

  -- Couverture CRA validée
  IF v_assistance_all > 0 THEN
    v_cra_coverage := round((v_assistance_validated / v_assistance_all * 100), 2);
  ELSE
    v_cra_coverage := 100.0;
  END IF;

  -- ── 4. Pipeline (Opportunities) ────────────────────────────────────────────
  SELECT
    coalesce(sum(coalesce(weighted_gain, estimated_gain, 0)) FILTER (WHERE opportunity_type = 'staffing'), 0),
    coalesce(sum(coalesce(weighted_gain, estimated_gain, 0)) FILTER (WHERE opportunity_type = 'forfait'), 0),
    coalesce(sum(coalesce(weighted_gain, estimated_gain, 0)) FILTER (WHERE opportunity_type = 'audit'), 0),
    coalesce(sum(coalesce(weighted_gain, estimated_gain, 0)), 0),
    count(*)
  INTO
    v_assistance_pipe,
    v_project_pipe,
    v_audit_pipe,
    v_total_pipe,
    v_open_opps_count
  FROM public.opportunities
  WHERE workspace_id = p_workspace_id
    AND stage NOT IN ('gagne', 'perdu', 'abandonne');

  -- ── 5. Targets (Performance Plan) ──────────────────────────────────────────
  SELECT
    max(pc.target_value) FILTER (WHERE pc.code = 'billed_revenue'),
    max(pc.target_value) FILTER (WHERE pc.code = 'gross_margin_pct')
  INTO
    v_rev_target,
    v_margin_target
  FROM public.performance_criteria pc
  JOIN public.performance_plans pp ON pp.id = pc.plan_id AND pp.workspace_id = pc.workspace_id
  WHERE pp.workspace_id = p_workspace_id
    AND pp.fiscal_year = p_fiscal_year;

  IF v_rev_target > 0 THEN
    v_rev_completion_pct := round((v_ytd_revenue / v_rev_target * 100), 2);
    v_linear_target_gap := v_ytd_revenue - (v_rev_target * v_linear_fraction);
  ELSE
    v_rev_completion_pct := NULL;
    v_linear_target_gap := NULL;
  END IF;

  -- ── 6. Trajectory (Run-rate & confidence) ──────────────────────────────────
  IF v_months_count > 0 THEN
    v_run_rate := round((v_ytd_revenue / v_months_count * 12), 2);
  ELSE
    v_run_rate := NULL;
  END IF;

  IF v_run_rate IS NOT NULL THEN
    v_projected_revenue := v_run_rate + v_total_pipe;
  ELSE
    v_projected_revenue := NULL;
  END IF;

  -- Confidence Index calculation
  -- expected closed months in the fiscal year up to p_as_of_date
  IF extract(year FROM p_as_of_date) < p_fiscal_year THEN
    v_expected_months := 0;
  ELSIF extract(year FROM p_as_of_date) > p_fiscal_year THEN
    v_expected_months := 12;
  ELSE
    v_expected_months := extract(month FROM p_as_of_date)::int - 1;
  END IF;

  v_missing_months_count := greatest(0, v_expected_months - v_months_count);

  -- Start from base 70
  v_confidence_index := 70;
  -- Penalties
  v_confidence_index := v_confidence_index - (v_missing_months_count * 10);
  IF v_cra_coverage < 95.0 THEN
    v_confidence_index := v_confidence_index - 15;
  END IF;
  IF abs(coalesce(v_pnl_residual_pct, 0)) > 10.0 THEN
    v_confidence_index := v_confidence_index - 15;
  END IF;
  -- Bonuses
  IF v_rev_target IS NOT NULL AND v_margin_target IS NOT NULL THEN
    v_confidence_index := v_confidence_index + 10;
  END IF;
  IF v_last_closed_month IS NOT NULL AND v_max_cra_month IS NOT NULL AND v_last_closed_month = v_max_cra_month THEN
    v_confidence_index := v_confidence_index + 10;
  END IF;

  -- Clamp 0-100
  v_confidence_index := least(100, greatest(0, v_confidence_index));

  IF v_confidence_index >= 75 THEN
    v_confidence_label := 'high';
  ELSIF v_confidence_index >= 50 THEN
    v_confidence_label := 'medium';
  ELSE
    v_confidence_label := 'low';
  END IF;

  -- ── 7. Data Health (Missing months & caveats) ──────────────────────────────
  -- Missing months list
  SELECT coalesce(jsonb_agg(g.m::text), '[]'::jsonb)
  INTO v_missing_months
  FROM (
    SELECT g.m::date
    FROM generate_series(
      make_date(p_fiscal_year, 1, 1),
      make_date(p_fiscal_year, 12, 1),
      interval '1 month'
    ) g(m)
    WHERE g.m::date <= p_as_of_date
      AND g.m::date < date_trunc('month', p_as_of_date)::date
      AND NOT EXISTS (
        SELECT 1 FROM public.pnl_monthly p
        WHERE p.workspace_id = p_workspace_id
          AND p.period_month = g.m::date
      )
  ) g;

  -- Caveats list building
  v_caveats := '[]'::jsonb;
  IF v_months_count = 0 THEN
    v_caveats := jsonb_insert(v_caveats, '{0}', '"Données de P&L totalement absentes pour cet exercice."'::jsonb);
  ELSIF v_missing_months_count > 0 THEN
    v_caveat_text := 'Il manque ' || v_missing_months_count || ' mois de P&L dans l''exercice avant la date d''analyse.';
    v_caveats := jsonb_insert(v_caveats, '{0}', to_jsonb(v_caveat_text));
  END IF;

  IF v_cra_coverage < 95.0 THEN
    v_caveat_text := 'Couverture de validation des CRA faible (' || round(v_cra_coverage, 1) || '%), les chiffres réels peuvent évoluer.';
    v_caveats := jsonb_insert(v_caveats, '{-1}', to_jsonb(v_caveat_text));
  END IF;

  IF v_rev_target IS NULL OR v_margin_target IS NULL THEN
    v_caveats := jsonb_insert(v_caveats, '{-1}', '"Objectifs annuels non configurés pour cet exercice."'::jsonb);
  END IF;

  -- Always add the standard caveat about the simple run rate projection
  v_caveats := jsonb_insert(v_caveats, '{-1}', '"La projection de fin d''année repose sur un run-rate linéaire simplifié et le pipe commercial pondéré restant."'::jsonb);

  -- ── 8. Alerts generation ───────────────────────────────────────────────────
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'kind', alert_kind,
    'severity', severity,
    'title', title,
    'description', description,
    'impactAmount', impact_amount,
    'action', jsonb_build_object(
      'type', action_type,
      'label', action_label,
      'entityType', entity_type,
      'entityId', entity_id
    )
  )), '[]'::jsonb)
  INTO v_alerts
  FROM (
    SELECT * FROM (
      -- 1. unexplained_pnl_residual
      SELECT
        'unexplained_pnl_residual' AS alert_kind,
        CASE WHEN abs(v_pnl_residual_pct) > 20 THEN 'critical'::text ELSE 'warning'::text END AS severity,
        'Écart de réconciliation P&L'::text AS title,
        'Le résiduel non expliqué entre le P&L et le CA opérationnel (CRA + projets) s''élève à ' || round(v_pnl_residual) || ' € (' || round(v_pnl_residual_pct, 1) || '%).' AS description,
        v_pnl_residual AS impact_amount,
        'create_reconciliation_task'::text AS action_type,
        'Créer une tâche de réconciliation'::text AS action_label,
        'financial_period'::text AS entity_type,
        NULL::text AS entity_id
      WHERE abs(v_pnl_residual_pct) > 10.0

      UNION ALL

      -- 2. cra_validation_gap
      SELECT
        'cra_validation_gap' AS alert_kind,
        'warning'::text AS severity,
        'CRA en attente de validation'::text AS title,
        'Le taux de validation des CRA est de ' || round(v_cra_coverage, 1) || '%. ' || round(v_assistance_all - v_assistance_validated) || ' € sont en attente de validation.' AS description,
        (v_assistance_all - v_assistance_validated) AS impact_amount,
        'review_cra_validation'::text AS action_type,
        'Valider les CRA en attente'::text AS action_label,
        'financial_period'::text AS entity_type,
        NULL::text AS entity_id
      WHERE v_cra_coverage < 95.0 AND (v_assistance_all - v_assistance_validated) > 0

      UNION ALL

      -- 3. late_project_milestone
      SELECT
        'late_project_milestone' AS alert_kind,
        'warning'::text AS severity,
        'Jalon projet non facturé'::text AS title,
        'Le jalon "' || (m->>'label') || '" du projet "' || p.title || '" (échéance le ' || (m->>'due_date') || ') de ' || round((m->>'amount')::numeric) || ' € n''est pas facturé.' AS description,
        (m->>'amount')::numeric AS impact_amount,
        'review_project_milestones'::text AS action_type,
        'Facturer le jalon'::text AS action_label,
        'project'::text AS entity_type,
        p.id::text AS entity_id
      FROM public.projects p,
           jsonb_array_elements(p.billing_milestones) m
      WHERE p.workspace_id = p_workspace_id
        AND m->>'invoiced_at' IS NULL
        AND (m->>'due_date')::date < p_as_of_date

      UNION ALL

      -- 4. low_margin_mission
      SELECT
        'low_margin_mission' AS alert_kind,
        'warning'::text AS severity,
        'Marge basse sur mission'::text AS title,
        'La mission "' || m.title || '" a une marge brute de ' || m.gross_margin_pct || '%, inférieure à l''objectif de 30%.' AS description,
        NULL::numeric AS impact_amount,
        'open_financial_simulation'::text AS action_type,
        'Simuler la rentabilité'::text AS action_label,
        'mission'::text AS entity_type,
        m.id::text AS entity_id
      FROM public.missions m
      WHERE m.workspace_id = p_workspace_id
        AND m.status = 'active'
        AND m.gross_margin_pct < 30.0

      UNION ALL

      -- 5. missing_financial_data
      SELECT
        'missing_financial_data' AS alert_kind,
        'critical'::text AS severity,
        'Données de P&L absentes'::text AS title,
        'Aucun mois de P&L n''est enregistré pour l''exercice ' || p_fiscal_year || '.' AS description,
        NULL::numeric AS impact_amount,
        'create_reconciliation_task'::text AS action_type,
        'Importer les données P&L'::text AS action_label,
        'financial_period'::text AS entity_type,
        NULL::text AS entity_id
      WHERE v_months_count = 0
    ) al_inner
    ORDER BY CASE WHEN severity = 'critical' THEN 0 ELSE 1 END ASC, impact_amount DESC NULLS LAST
    LIMIT 5
  ) al;

  -- ── 9. Quick Win generation ────────────────────────────────────────────────
  IF jsonb_array_length(v_alerts) > 0 THEN
    -- Pick the first alert and construct the corresponding quick win
    SELECT jsonb_build_object(
      'title',
      CASE 
        WHEN a->>'kind' IN ('unexplained_pnl_residual', 'missing_financial_data') THEN 'Rapprocher le P&L'::text
        WHEN a->>'kind' = 'cra_validation_gap' THEN 'Valider les CRA'::text
        WHEN a->>'kind' = 'late_project_milestone' THEN 'Facturer les jalons'::text
        WHEN a->>'kind' = 'low_margin_mission' THEN 'Recalculer la rentabilité'::text
        ELSE 'Action prioritaire'::text
      END,
      'description',
      CASE 
        WHEN a->>'kind' IN ('unexplained_pnl_residual', 'missing_financial_data') THEN 'Rapprocher l’écart P&L avant de recalculer la trajectoire.'::text
        WHEN a->>'kind' = 'cra_validation_gap' THEN 'Valider les CRA en attente pour fiabiliser le mois.'::text
        WHEN a->>'kind' = 'late_project_milestone' THEN 'Facturer ou replanifier les jalons projet échus.'::text
        WHEN a->>'kind' = 'low_margin_mission' THEN 'Recalculer la rentabilité des missions sous 30 %.'::text
        ELSE 'Examiner les alertes du rapport financier.'::text
      END,
      'actionType', a->'action'->'type'
    )
    INTO v_quick_win
    FROM jsonb_array_elements(v_alerts) a
    LIMIT 1;
  ELSE
    v_quick_win := jsonb_build_object(
      'title', 'Suivi de la trajectoire',
      'description', 'Toutes les données sont cohérentes et validées. Continuez le suivi régulier.',
      'actionType', NULL
    );
  END IF;

  -- ── 10. Assemblage du JSON final ───────────────────────────────────────────
  RETURN jsonb_build_object(
    'engineVersion', 'financial-report-v1',
    'period', jsonb_build_object(
      'fiscalYear', p_fiscal_year,
      'asOfDate', p_as_of_date::text,
      'lastClosedMonth', v_last_closed_month::text,
      'dataCutoffMonth', v_last_closed_month::text
    ),
    'officialPnl', jsonb_build_object(
      'ytdRevenue', v_ytd_revenue,
      'ytdGrossMarginValue', v_ytd_gm_value,
      'ytdGrossMarginPct', v_ytd_gm_pct,
      'monthly', v_monthly_pnl
    ),
    'revenueBridge', jsonb_build_object(
      'assistanceFromCra', v_assistance_all,
      'assistanceFromValidatedCra', v_assistance_validated,
      'projectInvoicedMilestones', v_project_milestones,
      'pnlResidualUnexplained', v_pnl_residual,
      'pnlResidualPct', v_pnl_residual_pct
    ),
    'pipeline', jsonb_build_object(
      'assistanceWeightedPipe', v_assistance_pipe,
      'projectWeightedPipe', v_project_pipe,
      'auditWeightedPipe', v_audit_pipe,
      'totalWeightedPipe', v_total_pipe,
      'openOpportunitiesCount', v_open_opps_count
    ),
    'targets', jsonb_build_object(
      'annualRevenueTarget', v_rev_target,
      'annualGrossMarginTargetPct', v_margin_target,
      'ytdRevenueCompletionPct', v_rev_completion_pct,
      'linearTargetGap', v_linear_target_gap
    ),
    'trajectory', jsonb_build_object(
      'runRateProjection', v_run_rate,
      'weightedPipeUpside', v_total_pipe,
      'projectedYearEndRevenue', v_projected_revenue,
      'confidenceIndex', v_confidence_index,
      'confidenceLabel', v_confidence_label
    ),
    'dataHealth', jsonb_build_object(
      'craValidationCoveragePct', v_cra_coverage,
      'missingMonths', v_missing_months,
      'caveats', v_caveats
    ),
    'alerts', v_alerts,
    'quickWin', v_quick_win
  );
END;
$$;

-- Revoke privileges from public and grant only to service_role
REVOKE ALL ON FUNCTION public.get_financial_report_facts(uuid, integer, date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_financial_report_facts(uuid, integer, date) TO service_role;

COMMENT ON FUNCTION public.get_financial_report_facts(uuid, integer, date) IS
  'Calcul déterministe synchrone pour le Rapport Financier V1 (sans n8n ni LLM). Fait le bridge entre le CA P&L officiel, les CRA Assistance et les Jalons Projets facturés.';

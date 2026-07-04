-- ============================================================
-- ADR-0010 — Brief hebdomadaire — Lot 1 : RPC de faits business
-- ============================================================
-- Périmètre volontairement restreint : cette RPC ne recalcule QUE les faits
-- que loadAgendaSnapshot() (src/lib/agenda/aggregate-agenda-snapshot.ts) ne
-- peut structurellement pas produire — montants monétaires agrégés, comptes
-- sans aucune trace agenda, indicateurs financiers CRA. Les débuts/fins de
-- mission, prochaines actions commerciales datées et jalons recrutement
-- datés sont déjà couverts par l'agrégateur agenda (missions-resolver.ts,
-- opportunities-resolver.ts, recruitment-resolver.ts) — les recalculer ici
-- dupliquerait une source unique. computeWeeklyBrief() (Next.js) assemble
-- le snapshot agenda + le résultat de cette RPC + le scoring déterministe
-- weekly-scoring-v1 pour produire WeeklyManagerFacts (voir reports-types.ts).
--
-- p_owner_id NULL = périmètre workspace (tous les commerciaux/recruteurs).
-- p_owner_id renseigné = périmètre personnel — filtre sur opportunities.owner_id,
-- companies.owner_id (comptes cibles silencieux) et candidates/opportunity_candidates
-- .recruiter_id. Exception documentée : lowActivityCollaboratorsCount reste
-- toujours workspace-wide (aucune notion d'"owner commercial" pour un
-- collaborateur en delivery — le staffing n'appartient à personne en
-- particulier dans le modèle actuel).
--
-- Note sécurité : v_profitability_alerts (migration 025) n'expose PAS
-- workspace_id dans ses colonnes de sortie. Cette RPC est appelée par n8n
-- via service_role (bypass RLS) — s'appuyer sur cette vue sans pouvoir
-- refiltrer par workspace_id serait une fuite cross-tenant latente en cas de
-- multi-workspace. On requête donc mission_activity_reports directement,
-- filtré explicitement sur workspace_id, plutôt que la vue.

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
      'quietTargetAccountsCount', (
        SELECT count(*)
        FROM public.companies c
        WHERE c.workspace_id = p_workspace_id
          AND c.lifecycle_status IN ('cible', 'prospect')
          AND (c.last_contact_at IS NULL OR c.last_contact_at::date < (p_as_of_date - 30))
          AND (p_owner_id IS NULL OR c.owner_id = p_owner_id)
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
      'lowActivityCollaboratorsCount', (
        WITH latest_cra AS (
          SELECT DISTINCT ON (mar.collaborator_id)
            mar.collaborator_id, mar.activity_rate_percent
          FROM public.mission_activity_reports mar
          WHERE mar.workspace_id = p_workspace_id
          ORDER BY mar.collaborator_id, mar.period_start DESC
        )
        SELECT count(*) FROM latest_cra WHERE activity_rate_percent < 70
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
      )
    ),
    'dataCutoffAt', now(),
    'caveats', jsonb_build_array(
      'quietTargetAccountsCount dépend de companies.last_contact_at — ce champ n''est pas systématiquement maintenu par tous les workflows de saisie, un compte peut donc apparaître "silencieux" à tort si son dernier contact n''a pas été loggé.',
      'lowActivityCollaboratorsCount reste toujours calculé sur l''ensemble du workspace, même en périmètre personnel (p_owner_id) — aucune notion d''"owner commercial" ne s''applique à un collaborateur en delivery.'
    )
  )
$$;

REVOKE ALL ON FUNCTION public.get_weekly_business_facts(uuid, date, date, uuid, date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_weekly_business_facts(uuid, date, date, uuid, date) TO service_role;

COMMENT ON FUNCTION public.get_weekly_business_facts(uuid, date, date, uuid, date) IS
  'Hydratation déterministe des faits business du brief hebdomadaire (ADR-0010 Lot 1), utilisée en complément de loadAgendaSnapshot() côté Next.js (computeWeeklyBrief) — jamais seule. Ne couvre que ce que l''agenda ne peut pas produire (montants, comptes sans trace agenda, indicateurs CRA). p_owner_id NULL = périmètre workspace.';

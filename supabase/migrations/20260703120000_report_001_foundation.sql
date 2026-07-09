-- ============================================================
-- REPORT-001 — Lot 0 : fondation
-- Pas de nouvelle table pour la bibliothèque : intelligence_documents
-- (migration 042) est étendue avec les colonnes nécessaires aux rapports
-- (scope, période, fraîcheur, approbation). report_exports viendra en
-- Lot 4 (V1.5) quand l'export PDF sera implémenté.
-- ============================================================

-- ============================================================
-- 1. Nouveaux types de documents (rapports)
-- ============================================================
-- ALTER TYPE ... ADD VALUE ne peut pas être utilisé dans la même transaction
-- que la valeur ajoutée — ce fichier ne fait qu'ajouter les valeurs, elles
-- ne sont consommées par aucun DML ici.

ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'activity_commercial';
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'activity_recruitment';
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'weekly_manager';
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'planning_deadlines';
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'financial';
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'quarterly_review';
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'staffing_capacity';
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'delivery_profitability';
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'account_portfolio';

-- ============================================================
-- 2. Colonnes rapport sur intelligence_documents
-- ============================================================

ALTER TABLE public.intelligence_documents
  ADD COLUMN IF NOT EXISTS scope_json     jsonb,
  ADD COLUMN IF NOT EXISTS period_start   date,
  ADD COLUMN IF NOT EXISTS period_end     date,
  ADD COLUMN IF NOT EXISTS data_cutoff_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at    timestamptz;

ALTER TABLE public.intelligence_documents
  ADD CONSTRAINT intelligence_documents_period_order
  CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start);

COMMENT ON COLUMN public.intelligence_documents.scope_json IS
  'Périmètre du rapport au moment de la génération : filtres compte(s)/secteur(s)/practice(s)/owner(s) — voir ReportBrief.scope dans src/lib/n8n/types.ts. NULL pour les documents non-rapport (communication, pitch...).';
COMMENT ON COLUMN public.intelligence_documents.period_start IS
  'Début de la période analysée par le rapport (NULL si le rapport n''est pas périodique, ex. fiche compte).';
COMMENT ON COLUMN public.intelligence_documents.period_end IS
  'Fin de la période analysée par le rapport.';
COMMENT ON COLUMN public.intelligence_documents.data_cutoff_at IS
  'Horodatage de fraîcheur des données sources au moment de la génération — affiché à l''utilisateur pour qu''il sache jusqu''à quand le rapport est à jour.';
COMMENT ON COLUMN public.intelligence_documents.approved_by IS
  'Utilisateur ayant validé le rapport avant diffusion (ex. rapport hebdo manager). NULL si aucune validation requise pour ce type de document.';
COMMENT ON COLUMN public.intelligence_documents.approved_at IS
  'Horodatage de validation — corollaire de approved_by.';

CREATE INDEX IF NOT EXISTS idx_intelligence_documents_period
  ON public.intelligence_documents (workspace_id, period_start, period_end)
  WHERE period_start IS NOT NULL;

-- ============================================================
-- 3. Scores déterministes versionnés — conviction & investissement
-- ============================================================
-- Doctrine KREDO (voir CLAUDE.md § Nouveau composant financier) : les notes
-- sont calculées en base, jamais par le LLM. Les fonctions sont marquées v1
-- dans leur nom pour permettre une v2 sans casser les rapports déjà générés
-- (le score est figé dans content_json au moment de la génération).
--
-- Pondérations conviction_score_v1 (potentiel du compte, /5) :
--   25% potentiel économique (pipe pondéré ouvert)
--   20% force des signaux sectoriels récents (nécessite companies.sector_id —
--       seuls 14/96 comptes en ont un actuellement, cf. audit Session ChatGPT ;
--       les comptes sans secteur reçoivent 0 sur ce volet, pas un fallback neutre)
--   20% accessibilité relationnelle (contacts décideurs identifiés)
--   20% adéquation practice/offre — reporté à Lot 1 (nécessite offer_catalog
--       × sector matching, pas encore branché) : pondération redistribuée sur
--       le potentiel économique en v1 (25% -> 45%) et documentée comme telle
--   15% traction commerciale (opportunités ouvertes + missions gagnées)
--
-- Pondérations investment_score_v1 (effort commercial déployé, /5) :
--   30% récence et fréquence des activités (interactions 90 derniers jours)
--   20% couverture des contacts (nombre de contacts identifiés)
--   20% opportunités et besoins ouverts
--   20% respect des prochaines actions (next_action_at renseigné et non dépassé)
--   10% diversité des interlocuteurs (rôles relationnels distincts)

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
      -- potentiel économique (45% — inclut la part practice/offre non branchée)
      0.45 * least(5.0, (pipe.weighted_pipe / 20000.0))
      -- force des signaux sectoriels (20%)
      + 0.20 * least(5.0, signals.recent_signal_count * 1.25)
      -- accessibilité relationnelle (20%)
      + 0.20 * least(5.0, key_contacts.decision_maker_count * 1.7)
      -- traction commerciale (15%)
      + 0.15 * least(5.0, pipe.open_count * 1.0 + won.won_count * 1.5)
    )::numeric, 1)
  FROM pipe, won, signals, key_contacts
$$;

CREATE OR REPLACE FUNCTION public.compute_investment_score_v1(p_company_id uuid)
RETURNS numeric(3,1)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH activity AS (
    SELECT count(*) AS recent_interaction_count
    FROM public.interactions
    WHERE company_id = p_company_id
      AND occurred_at >= now() - interval '90 days'
  ),
  contact_coverage AS (
    SELECT count(*) AS contact_count,
           count(DISTINCT relationship_role) FILTER (WHERE relationship_role IS NOT NULL) AS role_diversity
    FROM public.contacts
    WHERE company_id = p_company_id
  ),
  pipe AS (
    SELECT count(*) FILTER (WHERE stage NOT IN ('gagne', 'perdu', 'abandonne')) AS open_count,
           count(*) FILTER (
             WHERE stage NOT IN ('gagne', 'perdu', 'abandonne')
               AND next_action_at IS NOT NULL
               AND next_action_at >= now()
           ) AS on_track_count
    FROM public.opportunities
    WHERE company_id = p_company_id
  )
  SELECT round((
      -- récence et fréquence des activités (30%)
      0.30 * least(5.0, activity.recent_interaction_count * 0.7)
      -- couverture des contacts (20%)
      + 0.20 * least(5.0, contact_coverage.contact_count * 0.5)
      -- opportunités et besoins ouverts (20%)
      + 0.20 * least(5.0, pipe.open_count * 1.2)
      -- respect des prochaines actions (20%) — ratio sur le pipe ouvert
      + 0.20 * (
          CASE WHEN pipe.open_count = 0 THEN 0
               ELSE least(5.0, (pipe.on_track_count::numeric / pipe.open_count) * 5.0)
          END
        )
      -- diversité des interlocuteurs (10%)
      + 0.10 * least(5.0, contact_coverage.role_diversity * 1.25)
    )::numeric, 1)
  FROM activity, contact_coverage, pipe
$$;

COMMENT ON FUNCTION public.compute_conviction_score_v1(uuid) IS
  'Note de conviction /5 (potentiel du compte) — déterministe, pondérations versionnées v1. Le LLM ne fait qu''expliquer cette note, jamais la recalculer (REPORT-001 Lot 1). Le volet "adéquation practice/offre" (20% prévu) est redistribué sur le potentiel économique tant que offer_catalog x sector matching n''est pas branché.';
COMMENT ON FUNCTION public.compute_investment_score_v1(uuid) IS
  'Note d''investissement commercial /5 (effort déployé sur le compte) — déterministe, pondérations versionnées v1. Le LLM ne fait qu''expliquer cette note, jamais la recalculer (REPORT-001 Lot 1).';

GRANT EXECUTE ON FUNCTION public.compute_conviction_score_v1(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_investment_score_v1(uuid) TO authenticated, service_role;

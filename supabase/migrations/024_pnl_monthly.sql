-- ============================================================
-- 024_pnl_monthly
-- Table P&L mensuel consolidé + seed fictif (12 mois 2025-06 → 2026-05)
-- Architecture : colonnes d'entrée stockées + colonnes dérivées GENERATED
-- (pattern identique à missions.gross_margin_pct)
-- source='import' → sera superplanté par 'cra_derived' quand les CRA matureront
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pnl_monthly (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id                uuid          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE
                                            DEFAULT current_workspace_id(),
  period_month                date          NOT NULL,

  -- Produits
  revenue_total               numeric(12,2) NOT NULL CHECK (revenue_total >= 0),

  -- Charges directes (inputs)
  direct_costs_salaries       numeric(12,2) NOT NULL DEFAULT 0 CHECK (direct_costs_salaries >= 0),
  direct_costs_subcontractors numeric(12,2) NOT NULL DEFAULT 0 CHECK (direct_costs_subcontractors >= 0),

  -- Charges de structure (inputs, révisables mois par mois)
  structural_costs_mgmt       numeric(12,2) NOT NULL DEFAULT 18000 CHECK (structural_costs_mgmt >= 0),
  structural_costs_rent       numeric(12,2) NOT NULL DEFAULT 4500  CHECK (structural_costs_rent >= 0),
  structural_costs_it         numeric(12,2) NOT NULL DEFAULT 2500  CHECK (structural_costs_it >= 0),

  -- Dérivés GENERATED — ne jamais recalculer côté front
  gross_margin_value          numeric(12,2) GENERATED ALWAYS AS (
    revenue_total - direct_costs_salaries - direct_costs_subcontractors
  ) STORED,

  gross_margin_percent        numeric(5,2)  GENERATED ALWAYS AS (
    ROUND(
      (revenue_total - direct_costs_salaries - direct_costs_subcontractors)
      / NULLIF(revenue_total, 0) * 100,
    2)
  ) STORED,

  operating_profit_value      numeric(12,2) GENERATED ALWAYS AS (
    (revenue_total - direct_costs_salaries - direct_costs_subcontractors)
    - structural_costs_mgmt - structural_costs_rent - structural_costs_it
  ) STORED,

  operating_profit_percent    numeric(5,2)  GENERATED ALWAYS AS (
    ROUND(
      (
        (revenue_total - direct_costs_salaries - direct_costs_subcontractors)
        - structural_costs_mgmt - structural_costs_rent - structural_costs_it
      ) / NULLIF(revenue_total, 0) * 100,
    2)
  ) STORED,

  -- Métadonnées
  source                      text          NOT NULL DEFAULT 'import'
                                            CHECK (source IN ('import', 'cra_derived', 'budget', 'forecast')),
  notes                       text,
  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT pnl_monthly_workspace_period_unique UNIQUE (workspace_id, period_month)
);

-- Index principal (lecture chronologique par workspace)
CREATE INDEX IF NOT EXISTS idx_pnl_monthly_workspace_period
  ON public.pnl_monthly (workspace_id, period_month DESC);

-- Trigger updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.pnl_monthly
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger audit
CREATE TRIGGER log_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.pnl_monthly
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- RLS — motif workspace standard
ALTER TABLE public.pnl_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnl_monthly_select" ON public.pnl_monthly
  FOR SELECT USING (workspace_id = current_workspace_id());

CREATE POLICY "pnl_monthly_insert" ON public.pnl_monthly
  FOR INSERT WITH CHECK (true);

CREATE POLICY "pnl_monthly_update" ON public.pnl_monthly
  FOR UPDATE USING (workspace_id = current_workspace_id());

CREATE POLICY "pnl_monthly_delete" ON public.pnl_monthly
  FOR DELETE USING (workspace_id = current_workspace_id());

-- ============================================================
-- SEED — 12 mois de P&L fictif (2025-06 → 2026-05)
-- CROSS JOIN workspaces car un seul workspace existe
-- ON CONFLICT idempotent (re-run safe)
-- ============================================================
INSERT INTO public.pnl_monthly (
  workspace_id,
  period_month,
  revenue_total,
  direct_costs_salaries,
  direct_costs_subcontractors,
  structural_costs_mgmt,
  structural_costs_rent,
  structural_costs_it,
  source
)
SELECT
  w.id,
  v.period_month::date,
  v.revenue_total,
  v.direct_costs_salaries,
  v.direct_costs_subcontractors,
  v.structural_costs_mgmt,
  v.structural_costs_rent,
  v.structural_costs_it,
  'import'
FROM public.workspaces w
CROSS JOIN (VALUES
  ('2025-06-01'::date, 165000, 96773,  17077, 18000, 4500, 2500),
  ('2025-07-01'::date, 172000, 100147, 17673, 18000, 4500, 2500),
  ('2025-08-01'::date, 115000, 70380,  12420, 18000, 4500, 2500),
  ('2025-09-01'::date, 185000, 106616, 18814, 18000, 4500, 2500),
  ('2025-10-01'::date, 190000, 109013, 19237, 18000, 4500, 2500),
  ('2025-11-01'::date, 188000, 108664, 19176, 18000, 4500, 2500),
  ('2025-12-01'::date, 145000, 86892,  15333, 18000, 4500, 2500),
  ('2026-01-01'::date, 195000, 111053, 19597, 18000, 4500, 2500),
  ('2026-02-01'::date, 190000, 107882, 19038, 18000, 4500, 2500),
  ('2026-03-01'::date, 205000, 115354, 20356, 18000, 4500, 2500),
  ('2026-04-01'::date, 200000, 113050, 19950, 18000, 4500, 2500),
  ('2026-05-01'::date, 215000, 120433, 21252, 18000, 4500, 2500)
) AS v(
  period_month, revenue_total, direct_costs_salaries, direct_costs_subcontractors,
  structural_costs_mgmt, structural_costs_rent, structural_costs_it
)
ON CONFLICT (workspace_id, period_month) DO NOTHING;

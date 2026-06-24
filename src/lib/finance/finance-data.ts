import { createClient } from "@/lib/supabase/server"
import { formatEuroCompact, formatPct } from "@/lib/formatters"

// ─────────────────────────────────────────────────────────────────────────────
//  Finance — couche données
//
//  Sources réelles :
//  - pnl_monthly (12 mois, colonnes GENERATED côté DB) → KPIs + graphique P&L
//  - opportunities.weighted_gain → pipe commercial pondéré
//  - v_mission_quarterly_revenue (year courant) → breakdown par practice
//
//  Fallbacks (pas de table source encore) :
//  - anomalies : structure anticipée des sorties n8n audit sémantique
//  - lateBillings : structure anticipée des sorties n8n dunning
// ─────────────────────────────────────────────────────────────────────────────

export type FinanceKpiDeltaTone = "positive" | "negative" | "neutral"

export type FinanceKpi = {
  id: string
  label: string
  value: string
  delta?: string
  deltaTone?: FinanceKpiDeltaTone
  context?: string
}

export type PnlMonthRow = {
  period_month: string
  revenue_total: number
  gross_margin_value: number | null
  gross_margin_percent: number | null
  operating_profit_value: number | null
  operating_profit_percent: number | null
  source: string
}

export type BillingAnomaly = {
  id: string
  consultantName: string
  tjm: string
  anomalyText: string
  actionLabel: string
  badgeText?: string
}

export type LateBilling = {
  id: string
  clientName: string
  bcNumber: string
  delayDays: number
  valueAmount: string
  actionLabel: string
}

export type PracticeMetric = {
  practice: string
  revenue: number
  grossMargin: number
  grossMarginPct: number
  billableDays: number
  consultantCount: number
}

export type FinanceDashboardData = {
  kpis: FinanceKpi[]
  pnlRows: PnlMonthRow[]
  anomalies: BillingAnomaly[]
  lateBillings: LateBilling[]
  pipeTotal: number
  practiceMetrics: PracticeMetric[]
}


function calcDeltaTone(current: number, previous: number): FinanceKpiDeltaTone {
  if (current > previous) return "positive"
  if (current < previous) return "negative"
  return "neutral"
}

function calcDeltaLabel(current: number, previous: number): string | undefined {
  if (previous === 0) return undefined
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct.toFixed(1)} %`
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const supabase = await createClient()

  let pnlRows: PnlMonthRow[] = []
  let pipeTotal = 0
  let practiceMetrics: PracticeMetric[] = []

  const currentYear = new Date().getFullYear()

  try {
    const [pnlRes, oppRes, practiceRes] = await Promise.all([
      supabase
        .from("pnl_monthly")
        .select(
          "period_month, revenue_total, gross_margin_value, gross_margin_percent, operating_profit_value, operating_profit_percent, source",
        )
        .order("period_month", { ascending: true })
        .limit(12),
      supabase.from("opportunities").select("weighted_gain"),
      supabase
        .from("v_mission_quarterly_revenue")
        .select("practice, revenue, gross_margin, gross_margin_pct, billable_days, collaborator_id")
        .gte("quarter_start", `${currentYear}-01-01`)
        .lt("quarter_start", `${currentYear + 1}-01-01`),
    ])

    pnlRows = (pnlRes.data ?? []) as PnlMonthRow[]
    pipeTotal = (oppRes.data ?? []).reduce(
      (sum, o) => sum + (o.weighted_gain ?? 0),
      0,
    )

    // Agrégation par practice côté JS (PostgREST ne supporte pas GROUP BY)
    type QRow = {
      practice: string | null
      revenue: number | null
      gross_margin: number | null
      billable_days: number | null
      collaborator_id: string | null
    }
    const qRows = (practiceRes.data ?? []) as QRow[]
    const practiceMap = new Map<string, { revenue: number; grossMargin: number; billableDays: number; colIds: Set<string> }>()

    for (const row of qRows) {
      const key = row.practice ?? "Non définie"
      const existing = practiceMap.get(key) ?? { revenue: 0, grossMargin: 0, billableDays: 0, colIds: new Set() }
      existing.revenue += row.revenue ?? 0
      existing.grossMargin += row.gross_margin ?? 0
      existing.billableDays += row.billable_days ?? 0
      if (row.collaborator_id) existing.colIds.add(row.collaborator_id)
      practiceMap.set(key, existing)
    }

    practiceMetrics = Array.from(practiceMap.entries())
      .map(([practice, agg]) => ({
        practice,
        revenue: agg.revenue,
        grossMargin: agg.grossMargin,
        grossMarginPct: agg.revenue > 0 ? (agg.grossMargin / agg.revenue) * 100 : 0,
        billableDays: agg.billableDays,
        consultantCount: agg.colIds.size,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  } catch (err) {
    console.error("[finance-data] Supabase error:", err)
  }

  // ─── KPIs depuis pnl_monthly ──────────────────────────────────────────────
  const last = pnlRows[pnlRows.length - 1]
  const prev = pnlRows[pnlRows.length - 2]

  const lastPeriodLabel = last?.period_month
    ? new Date(last.period_month).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      })
    : undefined

  // CA dernière période
  const caValue = last?.revenue_total ?? 0
  const caLabel = last ? formatEuroCompact(caValue) : "—"
  const caDelta =
    last && prev ? calcDeltaLabel(caValue, prev.revenue_total) : undefined
  const caTone =
    last && prev ? calcDeltaTone(caValue, prev.revenue_total) : "neutral"

  // Marge brute %
  const margeValue = last?.gross_margin_percent ?? null
  const margeLabel = formatPct(margeValue)
  const margePrev = prev?.gross_margin_percent ?? null
  const margeDelta =
    margeValue !== null && margePrev !== null
      ? `${margeValue >= margePrev ? "+" : ""}${(margeValue - margePrev).toFixed(1)} pts`
      : undefined
  const margeTone: FinanceKpiDeltaTone =
    margeValue !== null && margePrev !== null
      ? calcDeltaTone(margeValue, margePrev)
      : "neutral"

  // Résultat opérationnel
  const opValue = last?.operating_profit_value ?? null
  const opLabel = opValue !== null ? formatEuroCompact(opValue) : "—"
  const opTone: FinanceKpiDeltaTone =
    opValue !== null
      ? opValue > 0
        ? "positive"
        : opValue < 0
          ? "negative"
          : "neutral"
      : "neutral"

  // Pipe CRM pondéré
  const pipeLabel = pipeTotal > 0 ? formatEuroCompact(pipeTotal) : "—"

  const kpis: FinanceKpi[] = [
    {
      id: "f-ca-period",
      label: "CA — Dernière période",
      value: caLabel,
      delta: caDelta,
      deltaTone: caTone,
      context: lastPeriodLabel,
    },
    {
      id: "f-marge-brute",
      label: "Marge brute",
      value: margeLabel,
      delta: margeDelta,
      deltaTone: margeTone,
      context: "Taux période courante",
    },
    {
      id: "f-resultat-op",
      label: "Résultat opérationnel",
      value: opLabel,
      deltaTone: opTone,
      context: lastPeriodLabel,
    },
    {
      id: "f-pipe-crm",
      label: "Pipe pondéré (CRM)",
      value: pipeLabel,
      deltaTone: "neutral",
      context: "opportunities × conviction",
    },
  ]

  // ─── Anomalies (fallback — structure n8n anticipée) ───────────────────────
  const anomalies: BillingAnomaly[] = [
    {
      id: "fa-1",
      consultantName: "Consultant A",
      tjm: "680 €",
      anomalyText: "Incohérence temps déclaré vs plan de charge (n8n audit sémantique)",
      actionLabel: "Gérer Bench",
    },
    {
      id: "fa-2",
      consultantName: "Consultant B",
      tjm: "680 €",
      anomalyText: "Taux d'adéquation matching sémantique insuffisant",
      actionLabel: "Lancer Match",
      badgeText: "<10 %",
    },
  ]

  // ─── Facturations en retard (fallback — structure n8n dunning anticipée) ──
  const lateBillings: LateBilling[] = [
    {
      id: "lb-1",
      clientName: "Client A",
      bcNumber: "BC-22102",
      delayDays: 134,
      valueAmount: "43 800 €",
      actionLabel: "Relancer",
    },
    {
      id: "lb-2",
      clientName: "Client B",
      bcNumber: "BC-22103",
      delayDays: 92,
      valueAmount: "12 500 €",
      actionLabel: "Relancer",
    },
    {
      id: "lb-3",
      clientName: "Client C",
      bcNumber: "BC-22104",
      delayDays: 67,
      valueAmount: "8 200 €",
      actionLabel: "Relancer",
    },
  ]

  return { kpis, pnlRows, anomalies, lateBillings, pipeTotal, practiceMetrics }
}

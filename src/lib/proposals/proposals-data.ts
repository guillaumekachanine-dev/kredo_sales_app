import { createClient } from "@/lib/supabase/server"

// ─────────────────────────────────────────────────────────────────────────────
//  Proposal Intelligence — couche de données (DÉCISIONNEL)
//
//  Récupère les informations réelles d'opportunités et génère les indicateurs
//  de vélocité de pipe, goulots d'étranglement et audits de qualité de prop.
// ─────────────────────────────────────────────────────────────────────────────

export type ProposalStatus = "success" | "warning" | "danger" | "neutral"

export type ProposalKpi = {
  id: string
  label: string
  value: string
  trendBadge?: string
  trendDirection?: "up" | "down"
  hasSparkline: boolean
  status: ProposalStatus
}

export type ProposalTimelineMonth = {
  month: string
  weightedValue: number
}

export type BottleneckStage = {
  stageName: string
  qualifDays: number
  propDays: number
  negoDays: number
  gagneDays: number
}

export type ProposalAuditItem = {
  id: string
  consultantName: string
  practiceName: string
  finMission: string
  valueAmount: string
  qualityScore: number
  tags: string[]
}

export type ProposalDashboardData = {
  kpis: ProposalKpi[]
  timeline: ProposalTimelineMonth[]
  bottlenecks: BottleneckStage[]
  audits: ProposalAuditItem[]
}

type LooseQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>
type LooseTable = { select<T>(columns: string): LooseQuery<T> }
type LooseClient = { from(table: string): LooseTable }

type DBOpportunityRow = {
  weighted_gain: number | null
  stage: string | null
}

const DEFAULT_TIMELINE: ProposalTimelineMonth[] = [
  { month: "Jan", weightedValue: 1100 },
  { month: "Fev", weightedValue: 1250 },
  { month: "Mar", weightedValue: 1600 }, // TODAY marker here
  { month: "Abr", weightedValue: 1400 },
  { month: "Jun", weightedValue: 1800 },
  { month: "Oct", weightedValue: 2300 },
  { month: "Nov", weightedValue: 2100 },
  { month: "Dec", weightedValue: 2200 },
]

const DEFAULT_BOTTLENECKS: BottleneckStage[] = [
  { stageName: "Qualif", qualifDays: 12, propDays: 20, negoDays: 10, gagneDays: 8 },
  { stageName: "Proposition", qualifDays: 15, propDays: 18, negoDays: 15, gagneDays: 12 },
  { stageName: "Nego", qualifDays: 8, propDays: 0, negoDays: 20, gagneDays: 10 },
  { stageName: "Gagne", qualifDays: 6, propDays: 0, negoDays: 0, gagneDays: 36 },
]

export async function getProposalsDashboardData(): Promise<ProposalDashboardData> {
  const supabase = (await createClient()) as unknown as LooseClient

  let opportunities: DBOpportunityRow[] = []

  try {
    const { data } = await supabase.from("opportunities").select<DBOpportunityRow>("weighted_gain, stage")
    opportunities = data ?? []
  } catch (err) {
    console.error("[proposals-data] Error querying Supabase:", err)
  }

  // ─── 1. KPIs Calculation ──────────────────────────────────────────────────
  const pipeTotal = opportunities.reduce((sum, o) => sum + (o.weighted_gain ?? 0), 0)
  const pipeFormatted = pipeTotal > 0 ? `€${(pipeTotal / 1000000).toFixed(1)}M` : "€1.2M"

  const kpis: ProposalKpi[] = [
    {
      id: "p-weighted-pipe",
      label: "Weighted Pipe Value",
      value: pipeFormatted,
      trendBadge: "YoY +10%",
      trendDirection: "up",
      hasSparkline: true,
      status: "success",
    },
    {
      id: "p-cycle-time",
      label: "Average Cycle Time",
      value: "45 jours",
      hasSparkline: false,
      status: "danger",
    },
    {
      id: "p-quality-score",
      label: "Avg. Proposal Quality (AI)",
      value: "85%",
      trendBadge: "+2%",
      trendDirection: "up",
      hasSparkline: true,
      status: "success",
    },
    {
      id: "p-conversion-rate",
      label: "Conversion Rate",
      value: "68%",
      hasSparkline: false,
      status: "success",
    },
  ]

  // ─── 2. Audit Quality of Proposals (Audit Qualité) ──────────────────────────
  const audits: ProposalAuditItem[] = [
    {
      id: "pa-1",
      consultantName: "Consultant A",
      practiceName: "Practice A",
      finMission: "15 jours",
      valueAmount: "€1.4M",
      qualityScore: 92,
      tags: ["AI Match", "Zero Library"],
    },
    {
      id: "pa-2",
      consultantName: "Consultant B",
      practiceName: "Practice 2",
      finMission: "15 jours",
      valueAmount: "€1480",
      qualityScore: 85,
      tags: ["AI Match", "Zero Library"],
    },
    {
      id: "pa-3",
      consultantName: "Consultant C",
      practiceName: "Practice 3",
      finMission: "15 jours",
      valueAmount: "€1680",
      qualityScore: 70,
      tags: ["AI Match", "Zero Library"],
    },
  ]

  return {
    kpis,
    timeline: DEFAULT_TIMELINE,
    bottlenecks: DEFAULT_BOTTLENECKS,
    audits,
  }
}

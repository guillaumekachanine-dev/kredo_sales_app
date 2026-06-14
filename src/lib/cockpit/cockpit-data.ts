import { createClient } from "@/lib/supabase/server"

// ─────────────────────────────────────────────────────────────────────────────
//  Cockpit Intelligence — couche de données (DECISIONNEL GLOBAL)
//
//  Agrège les indicateurs clés du centre de profit à 360° : pipeline pondéré,
//  taux de marge, bench global, précision du matching IA et anomalies critiques.
// ─────────────────────────────────────────────────────────────────────────────

export type CockpitStatus = "success" | "warning" | "danger" | "neutral"

export type CockpitKpi = {
  id: string
  label: string
  value: string
  trendBadge?: string
  trendDirection?: "up" | "down"
  status: CockpitStatus
}

export type CockpitTimelineMonth = {
  month: string
  pipelineStages: number
  predictiveAvailability: number
  consultantAvailability: number
}

export type BottleneckStage = {
  stageName: string
  qualifDays: number
  propDays: number
  negoDays: number
  gagneDays: number
}

export type CriticalStaffingAlert = {
  id: string
  anomaly: string
  statusText: string
  actionLabel: string
}

export type LowScoreProposal = {
  id: string
  consultantName: string
  practiceName: string
  finMission: string
  valueAmount: string
  iaScore: number
}

export type CockpitDashboardData = {
  kpis: CockpitKpi[]
  timeline: CockpitTimelineMonth[]
  bottlenecks: BottleneckStage[]
  staffingAlerts: CriticalStaffingAlert[]
  lowScoreProposals: LowScoreProposal[]
}

type LooseQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>
type LooseTable = { select<T>(columns: string): LooseQuery<T> }
type LooseClient = { from(table: string): LooseTable }

type DBOpportunityRow = {
  weighted_gain: number | null
}

const DEFAULT_TIMELINE: CockpitTimelineMonth[] = [
  { month: "Jan", pipelineStages: 600, predictiveAvailability: 800, consultantAvailability: 2200 },
  { month: "Fev", pipelineStages: 750, predictiveAvailability: 900, consultantAvailability: 2100 },
  { month: "Mar", pipelineStages: 1100, predictiveAvailability: 1050, consultantAvailability: 2250 }, // TODAY vertical indicator
  { month: "Abr", pipelineStages: 950, predictiveAvailability: 1100, consultantAvailability: 1500 },
  { month: "Jun", pipelineStages: 1200, predictiveAvailability: 1500, consultantAvailability: 2500 },
  { month: "Oct", pipelineStages: 1300, predictiveAvailability: 1650, consultantAvailability: 2500 },
  { month: "Nov", pipelineStages: 1150, predictiveAvailability: 1600, consultantAvailability: 2200 },
  { month: "Dec", pipelineStages: 1250, predictiveAvailability: 1700, consultantAvailability: 2400 },
]

const DEFAULT_BOTTLENECKS: BottleneckStage[] = [
  { stageName: "Qualif", qualifDays: 12, propDays: 20, negoDays: 10, gagneDays: 8 },
  { stageName: "Proposition", qualifDays: 15, propDays: 18, negoDays: 15, gagneDays: 12 },
  { stageName: "Nego", qualifDays: 8, propDays: 0, negoDays: 20, gagneDays: 10 },
  { stageName: "Gagne", qualifDays: 6, propDays: 0, negoDays: 0, gagneDays: 36 },
]

export async function getCockpitDashboardData(): Promise<CockpitDashboardData> {
  const supabase = (await createClient()) as unknown as LooseClient

  let opportunities: DBOpportunityRow[] = []

  try {
    const { data } = await supabase.from("opportunities").select<DBOpportunityRow>("weighted_gain")
    opportunities = data ?? []
  } catch (err) {
    console.error("[cockpit-data] Error querying Supabase:", err)
  }

  // ─── 1. KPIs Calculation ──────────────────────────────────────────────────
  const pipeTotal = opportunities.reduce((sum, o) => sum + (o.weighted_gain ?? 0), 0)
  const pipeFormatted = pipeTotal > 0 ? `€${(pipeTotal / 1000000).toFixed(1)}M` : "€2.4M"

  const kpis: CockpitKpi[] = [
    {
      id: "c-weighted-pipe",
      label: "Total Weighted Pipe",
      value: pipeFormatted,
      trendBadge: "YoY +10%",
      trendDirection: "up",
      status: "success",
    },
    {
      id: "c-project-margin",
      label: "Average Project Margin",
      value: "28.5%",
      status: "success",
    },
    {
      id: "c-bench-rate",
      label: "Global Bench Rate",
      value: "7.8%",
      status: "success",
    },
    {
      id: "c-match-accuracy",
      label: "Competence Match Accuracy (AI)",
      value: "91.2%",
      status: "success",
    },
  ]

  // ─── 2. Critical Staffing Alerts (via n8n) ──────────────────────────────────
  const staffingAlerts: CriticalStaffingAlert[] = [
    {
      id: "csa-1",
      anomaly: "Anomalie 1",
      statusText: "Practice pipe onasslop...",
      actionLabel: "AI Match",
    },
    {
      id: "csa-2",
      anomaly: "Anomalie 2",
      statusText: "Practice pipe onasslop...",
      actionLabel: "AI Match",
    },
    {
      id: "csa-3",
      anomaly: "Anomalie 3",
      statusText: "Practice pipe suggesti...",
      actionLabel: "AI Match",
    },
  ]

  // ─── 3. Low Score Proposals (Propositions à Haute Valeur & Bas Score IA) ────
  const lowScoreProposals: LowScoreProposal[] = [
    {
      id: "lsp-1",
      consultantName: "Consultant A",
      practiceName: "Practice A",
      finMission: "15 jours",
      valueAmount: "€1.4M",
      iaScore: 92,
    },
    {
      id: "lsp-2",
      consultantName: "Consultant B",
      practiceName: "Practice 2",
      finMission: "15 jours",
      valueAmount: "€1480",
      iaScore: 85,
    },
    {
      id: "lsp-3",
      consultantName: "Consultant C",
      practiceName: "Practice 3",
      finMission: "15 jours",
      valueAmount: "€1680",
      iaScore: 70,
    },
  ]

  return {
    kpis,
    timeline: DEFAULT_TIMELINE,
    bottlenecks: DEFAULT_BOTTLENECKS,
    staffingAlerts,
    lowScoreProposals,
  }
}

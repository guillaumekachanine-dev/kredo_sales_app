import { getRecruitmentStatusLabel, HIRING_KANBAN_STAGES, normalizeRecruitmentKey } from "@/lib/recruitment/recruitment-stages"
import { asNumber, parseDate } from "./shared"

export const FUNNEL_STATIC_SNAPSHOT_CAVEAT =
  "Snapshot statique — le taux de conversion réel nécessite un historique des transitions (V2)."

export type HiringProcessSnapshotRow = {
  id: string
  currentStep: string | null
  status: string | null
  createdAt: string | null
}

export type StaffingFunnelSnapshotRow = {
  id: string
  status: string | null
  createdAt: string | null
}

export type CandidateSnapshotRow = {
  id: string
  status: string | null
  source: string | null
}

export type FunnelStep = {
  step: string
  stepLabel: string
  count: number
  pctOfTotal: number
}

export type StaffingFunnelStatus = {
  status: string
  statusLabel: string
  count: number
}

export type AnalyzeFunnelRulesResult = {
  hiringFunnel: FunnelStep[]
  staffingFunnel: StaffingFunnelStatus[]
  summary: {
    activeHiringProcesses: number
    staffedCandidates: number
    candidatesTotal: number
  }
  caveat: string
}

export type MarginMissionRow = {
  id: string
  title: string
  status: string | null
  grossMarginPct: number | null
  practice: string | null
  companyName: string | null
  collaboratorId: string | null
}

export type MarginActivitySummaryRow = {
  collaboratorId: string
  fullName: string | null
  periodStart: string | null
  realMarginPct: number | null
  revenue: number | null
  realMargin: number | null
}

export type MarginFocusItem = {
  missionId: string
  title: string
  companyName: string
  collaboratorName: string | null
  practice: string | null
  marginPct: number | null
  source: "mission" | "activity_summary"
}

export type AnalyzeMarginsRulesResult = {
  summary: {
    activeMissions: number
    negativeMargins: number
    lowMargins: number
    unknownMargins: number
  }
  worstMargins: MarginFocusItem[]
  financeHref: "/finance"
}

export type BuildAnalyzeFunnelInput = {
  hiringProcesses: HiringProcessSnapshotRow[]
  opportunityCandidates: StaffingFunnelSnapshotRow[]
  candidates: CandidateSnapshotRow[]
}

export type BuildAnalyzeMarginsInput = {
  missions: MarginMissionRow[]
  activitySummaries: MarginActivitySummaryRow[]
}

const LOW_MARGIN_THRESHOLD = 15
const CLOSED_HIRING_STATUSES = new Set(["hired", "rejected", "withdrawn", "cancelled", "closed"])

function roundPct(value: number): number {
  return Math.round(value * 10) / 10
}

function normalizedStatus(value: string | null | undefined): string {
  return normalizeRecruitmentKey(value) || "non_renseigne"
}

function isActiveHiringProcess(row: HiringProcessSnapshotRow): boolean {
  const status = normalizeRecruitmentKey(row.status)
  return !status || status === "active" || !CLOSED_HIRING_STATUSES.has(status)
}

export function buildAnalyzeFunnel(input: BuildAnalyzeFunnelInput): AnalyzeFunnelRulesResult {
  const activeHiringProcesses = input.hiringProcesses.filter(isActiveHiringProcess)
  const totalHiring = activeHiringProcesses.length
  const hiringCounts = new Map<string, number>()

  for (const row of activeHiringProcesses) {
    const step = normalizeRecruitmentKey(row.currentStep)
    if (step) hiringCounts.set(step, (hiringCounts.get(step) ?? 0) + 1)
  }

  const hiringFunnel = HIRING_KANBAN_STAGES.map<FunnelStep>((stage) => {
    const count = hiringCounts.get(stage.key) ?? 0
    return {
      step: stage.key,
      stepLabel: stage.label,
      count,
      pctOfTotal: totalHiring > 0 ? roundPct((count / totalHiring) * 100) : 0,
    }
  })

  const staffingCounts = new Map<string, number>()
  for (const row of input.opportunityCandidates) {
    const status = normalizedStatus(row.status)
    staffingCounts.set(status, (staffingCounts.get(status) ?? 0) + 1)
  }

  const staffingFunnel = Array.from(staffingCounts.entries())
    .map<StaffingFunnelStatus>(([status, count]) => ({
      status,
      statusLabel: getRecruitmentStatusLabel(status),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.statusLabel.localeCompare(b.statusLabel, "fr"))
    .slice(0, 10)

  return {
    hiringFunnel,
    staffingFunnel,
    summary: {
      activeHiringProcesses: totalHiring,
      staffedCandidates: input.opportunityCandidates.length,
      candidatesTotal: input.candidates.length,
    },
    caveat: FUNNEL_STATIC_SNAPSHOT_CAVEAT,
  }
}

function latestSummaryByCollaborator(activitySummaries: MarginActivitySummaryRow[]): Map<string, MarginActivitySummaryRow> {
  const latest = new Map<string, MarginActivitySummaryRow>()
  for (const row of activitySummaries) {
    const current = latest.get(row.collaboratorId)
    const rowDate = parseDate(row.periodStart)?.getTime() ?? 0
    const currentDate = parseDate(current?.periodStart)?.getTime() ?? 0
    if (!current || rowDate >= currentDate) latest.set(row.collaboratorId, row)
  }
  return latest
}

function missionMarginItem(
  mission: MarginMissionRow,
  latestActivity: Map<string, MarginActivitySummaryRow>,
): MarginFocusItem {
  const activity = mission.collaboratorId ? latestActivity.get(mission.collaboratorId) ?? null : null
  const missionMargin = typeof mission.grossMarginPct === "number" && Number.isFinite(mission.grossMarginPct)
    ? mission.grossMarginPct
    : null
  const activityMargin = typeof activity?.realMarginPct === "number" && Number.isFinite(activity.realMarginPct)
    ? activity.realMarginPct
    : null

  return {
    missionId: mission.id,
    title: mission.title,
    companyName: mission.companyName ?? "Client non renseigné",
    collaboratorName: activity?.fullName ?? null,
    practice: mission.practice,
    marginPct: missionMargin ?? activityMargin,
    source: missionMargin === null && activityMargin !== null ? "activity_summary" : "mission",
  }
}

export function buildAnalyzeMargins(input: BuildAnalyzeMarginsInput): AnalyzeMarginsRulesResult {
  const activeMissions = input.missions.filter((mission) => normalizeRecruitmentKey(mission.status) === "active")
  const latestActivity = latestSummaryByCollaborator(input.activitySummaries)
  const items = activeMissions.map((mission) => missionMarginItem(mission, latestActivity))
  const knownMargins = items.filter((item) => item.marginPct !== null)

  return {
    summary: {
      activeMissions: activeMissions.length,
      negativeMargins: knownMargins.filter((item) => asNumber(item.marginPct) < 0).length,
      lowMargins: knownMargins.filter((item) => {
        const margin = asNumber(item.marginPct)
        return margin >= 0 && margin < LOW_MARGIN_THRESHOLD
      }).length,
      unknownMargins: items.length - knownMargins.length,
    },
    worstMargins: knownMargins
      .sort((a, b) => asNumber(a.marginPct) - asNumber(b.marginPct))
      .slice(0, 3),
    financeHref: "/finance",
  }
}

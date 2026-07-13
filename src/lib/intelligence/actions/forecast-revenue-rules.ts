import { asNumber } from "./shared"
import {
  addCalendarDays,
  businessDaysForMonth,
  compareDateKeys,
  countFrenchBusinessDays,
  dateKeyFromDate,
  maxDateKey,
  minDateKey,
  monthEndKey,
  monthStartKey,
} from "./french-business-days"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"

export type ForecastTrend = "growing" | "stable" | "declining"

export type ForecastMissionRow = {
  id: string
  title: string
  status: string | null
  tjm: number | null
  startDate: string | null
  endDate: string | null
  collaboratorId: string | null
  companyId: string | null
}

export type ForecastOpportunityRow = {
  id: string
  title: string
  stage: string | null
  weightedGain: number | null
  estimatedGain: number | null
  durationDays: number | null
  nextActionAt: string | null
  createdAt: string | null
}

export type ForecastAbsenceRow = {
  collaboratorId: string
  startDate: string
  endDate: string
}

export type ForecastClientClosureRow = {
  companyId: string
  startDate: string
  endDate: string
}

export type ForecastPnlRow = {
  periodMonth: string
  revenueTotal: number
}

export type ForecastMonth = {
  month: string
  label: string
  pessimistic: number
  realistic: number
  optimistic: number
  missionContribution: number
  pipeContribution: number
}

export type ForecastRevenueRulesResult = {
  months: ForecastMonth[]
  summary: {
    q_current_realistic: number
    q_next_realistic: number
    missionsCoveringNextQuarter: number
    missionsEndingNextQuarter: number
    pipeWeightedTotal: number
    trend: ForecastTrend
  }
}

export type ComputeMonthlyForecastInput = {
  now: string
  missions: ForecastMissionRow[]
  opportunities: ForecastOpportunityRow[]
  absences: ForecastAbsenceRow[]
  clientClosures: ForecastClientClosureRow[]
  pnlMonths: ForecastPnlRow[]
}

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]
const DEFAULT_OPPORTUNITY_DURATION_DAYS = 20

function toDateKey(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return dateKeyFromDate(date)
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number)
  return `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`
}

function nextMonthKeys(now: string, count: number): string[] {
  const nowDate = new Date(now)
  const year = nowDate.getUTCFullYear()
  const month = nowDate.getUTCMonth()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month + index + 1, 1))
    return date.toISOString().slice(0, 7)
  })
}

function quarterKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number)
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`
}

function nextQuarterRange(now: string): { start: string; end: string } {
  const nowDate = new Date(now)
  const currentQuarter = Math.floor(nowDate.getUTCMonth() / 3)
  const nextQuarterStartMonth = (currentQuarter + 1) * 3
  const start = new Date(Date.UTC(nowDate.getUTCFullYear(), nextQuarterStartMonth, 1))
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0))
  return { start: dateKeyFromDate(start), end: dateKeyFromDate(end) }
}

function overlapBusinessDays(startA: string, endA: string, startB: string, endB: string): number {
  const start = maxDateKey(startA, startB)
  const end = minDateKey(endA, endB)
  return countFrenchBusinessDays(start, end)
}

function missionRevenueForMonth(
  mission: ForecastMissionRow,
  monthKey: string,
  absences: ForecastAbsenceRow[],
  clientClosures: ForecastClientClosureRow[],
): number {
  if (mission.status && mission.status !== "active") return 0
  const tjm = asNumber(mission.tjm)
  if (tjm <= 0) return 0

  const monthStart = monthStartKey(monthKey)
  const monthEnd = monthEndKey(monthKey)
  const missionStart = toDateKey(mission.startDate) ?? monthStart
  const missionEnd = toDateKey(mission.endDate) ?? monthEnd
  const start = maxDateKey(monthStart, missionStart)
  const end = minDateKey(monthEnd, missionEnd)
  if (compareDateKeys(start, end) > 0) return 0

  let billableDays = countFrenchBusinessDays(start, end)
  if (mission.collaboratorId) {
    for (const absence of absences.filter((row) => row.collaboratorId === mission.collaboratorId)) {
      billableDays -= overlapBusinessDays(start, end, absence.startDate, absence.endDate)
    }
  }
  if (mission.companyId) {
    for (const closure of clientClosures.filter((row) => row.companyId === mission.companyId)) {
      billableDays -= overlapBusinessDays(start, end, closure.startDate, closure.endDate)
    }
  }

  return Math.max(0, billableDays) * tjm
}

function opportunityWindow(opportunity: ForecastOpportunityRow): { start: string; end: string; durationDays: number } | null {
  if (isTerminalOpportunityStage(opportunity.stage)) return null
  const durationDays = Math.max(1, Math.round(asNumber(opportunity.durationDays) || DEFAULT_OPPORTUNITY_DURATION_DAYS))
  const baseDate = toDateKey(opportunity.nextActionAt) ?? toDateKey(opportunity.createdAt)
  if (!baseDate) return null
  const start = addCalendarDays(baseDate, durationDays)
  const end = addCalendarDays(start, durationDays - 1)
  return { start, end, durationDays }
}

function opportunityContributionForMonth(opportunity: ForecastOpportunityRow, monthKey: string) {
  const window = opportunityWindow(opportunity)
  if (!window) return { weighted: 0, optimistic: 0 }
  const monthStart = monthStartKey(monthKey)
  const monthEnd = monthEndKey(monthKey)
  const businessDays = overlapBusinessDays(monthStart, monthEnd, window.start, window.end)
  if (businessDays <= 0) return { weighted: 0, optimistic: 0 }

  return {
    weighted: (asNumber(opportunity.weightedGain) / window.durationDays) * businessDays,
    optimistic: (asNumber(opportunity.estimatedGain) / window.durationDays) * businessDays,
  }
}

function computeTrend(pnlMonths: ForecastPnlRow[]): ForecastTrend {
  const sorted = [...pnlMonths].sort((a, b) => a.periodMonth.localeCompare(b.periodMonth)).slice(-3)
  if (sorted.length < 2) return "stable"
  const first = sorted[0].revenueTotal
  const last = sorted[sorted.length - 1].revenueTotal
  if (first <= 0) return last > 0 ? "growing" : "stable"
  const ratio = last / first
  if (ratio >= 1.05) return "growing"
  if (ratio <= 0.95) return "declining"
  return "stable"
}

export function computeMonthlyForecast(input: ComputeMonthlyForecastInput): ForecastRevenueRulesResult {
  const months = nextMonthKeys(input.now, 3).map<ForecastMonth>((month) => {
    const missionContribution = input.missions.reduce(
      (sum, mission) => sum + missionRevenueForMonth(mission, month, input.absences, input.clientClosures),
      0,
    )
    const pipe = input.opportunities.reduce(
      (sum, opportunity) => {
        const contribution = opportunityContributionForMonth(opportunity, month)
        sum.weighted += contribution.weighted
        sum.optimistic += contribution.optimistic
        return sum
      },
      { weighted: 0, optimistic: 0 },
    )

    return {
      month,
      label: monthLabel(month),
      pessimistic: Math.round(missionContribution),
      realistic: Math.round(missionContribution + pipe.weighted),
      optimistic: Math.round(missionContribution + pipe.optimistic),
      missionContribution: Math.round(missionContribution),
      pipeContribution: Math.round(pipe.weighted),
    }
  })

  const currentQuarter = quarterKey(input.now.slice(0, 7))
  const { start: nextQuarterStart, end: nextQuarterEnd } = nextQuarterRange(input.now)
  const nextQuarter = quarterKey(nextQuarterStart.slice(0, 7))
  const pipeWeightedTotal = input.opportunities
    .filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage))
    .reduce((sum, opportunity) => sum + asNumber(opportunity.weightedGain), 0)

  return {
    months,
    summary: {
      q_current_realistic: months
        .filter((month) => quarterKey(month.month) === currentQuarter)
        .reduce((sum, month) => sum + month.realistic, 0),
      q_next_realistic: months
        .filter((month) => quarterKey(month.month) === nextQuarter)
        .reduce((sum, month) => sum + month.realistic, 0),
      missionsCoveringNextQuarter: input.missions.filter((mission) => {
        const start = toDateKey(mission.startDate) ?? nextQuarterStart
        const end = toDateKey(mission.endDate) ?? nextQuarterEnd
        return mission.status === "active" && compareDateKeys(start, nextQuarterEnd) <= 0 && compareDateKeys(end, nextQuarterStart) >= 0
      }).length,
      missionsEndingNextQuarter: input.missions.filter((mission) => {
        const end = toDateKey(mission.endDate)
        return Boolean(end && compareDateKeys(end, nextQuarterStart) >= 0 && compareDateKeys(end, nextQuarterEnd) <= 0)
      }).length,
      pipeWeightedTotal: Math.round(pipeWeightedTotal),
      trend: computeTrend(input.pnlMonths),
    },
  }
}

export { businessDaysForMonth }

import { createClient } from "@/lib/supabase/server"
import type { Trajectory2026Data, TrajectoryPoint2026 } from "@/components/missions/dashboard/trajectory-2026-types"

type MissionRow = {
  id: string
  status: string
  start_date: string | null
  end_date: string | null
}

type PnlMonthlyRow = {
  period_month: string
  revenue_total: number
  gross_margin_percent: number | null
  gross_margin_value: number | null
}

type SupabaseError = { message: string; code?: string; details?: string; hint?: string }

type MissionsQuery = PromiseLike<{ data: MissionRow[] | null; error: SupabaseError | null }> & {
  select(columns: string): MissionsQuery
}

type PnlQuery = PromiseLike<{ data: PnlMonthlyRow[] | null; error: SupabaseError | null }> & {
  select(columns: string): PnlQuery
  gte(column: string, value: string): PnlQuery
  lt(column: string, value: string): PnlQuery
  order(column: string, options?: { ascending?: boolean }): PnlQuery
}

type LooseSupabaseClient = {
  from(table: "missions"): MissionsQuery
  from(table: "pnl_monthly"): PnlQuery
}

const MONTHS_2026 = [
  { key: "2026-01", label: "Jan" },
  { key: "2026-02", label: "Fev" },
  { key: "2026-03", label: "Mar" },
  { key: "2026-04", label: "Avr" },
  { key: "2026-05", label: "Mai" },
  { key: "2026-06", label: "Jun" },
  { key: "2026-07", label: "Jul" },
  { key: "2026-08", label: "Aou" },
  { key: "2026-09", label: "Sep" },
  { key: "2026-10", label: "Oct" },
  { key: "2026-11", label: "Nov" },
  { key: "2026-12", label: "Dec" },
] as const

const ASSUMPTIONS = {
  annualRevenueTarget: 2_400_000,
  monthlyRevenueTarget: 200_000,
  marginTarget: 32,
  historicalAnnualRevenue: 2_165_000,
  historicalConsultantMonths: 204,
}

const PRODUCTIVITY_PER_ACTIVE_MONTH =
  ASSUMPTIONS.historicalAnnualRevenue / ASSUMPTIONS.historicalConsultantMonths

const CAPACITY_TARGET = ASSUMPTIONS.monthlyRevenueTarget / PRODUCTIVITY_PER_ACTIVE_MONTH

function parseUtcDate(date: string | null): Date | null {
  if (!date) return null
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function monthStartUtc(monthKey: string): Date {
  return new Date(`${monthKey}-01T00:00:00Z`)
}

function nextMonthUtc(monthKey: string): Date {
  const start = monthStartUtc(monthKey)
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
}

function missionOverlapsMonth(mission: MissionRow, monthKey: string): boolean {
  const start = parseUtcDate(mission.start_date)
  const end = parseUtcDate(mission.end_date)
  const monthStart = monthStartUtc(monthKey)
  const monthEndExclusive = nextMonthUtc(monthKey)

  if (start && start >= monthEndExclusive) return false
  if (end && end < monthStart) return false

  return true
}

export async function getTrajectory2026(): Promise<Trajectory2026Data> {
  const supabase = (await createClient()) as unknown as LooseSupabaseClient

  const [missionsResult, pnlResult] = await Promise.all([
    supabase
      .from("missions")
      .select("id,status,start_date,end_date"),
    supabase
      .from("pnl_monthly")
      .select("period_month,revenue_total,gross_margin_percent,gross_margin_value")
      .gte("period_month", "2026-01-01")
      .lt("period_month", "2027-01-01")
      .order("period_month", { ascending: true }),
  ])

  if (missionsResult.error) {
    console.error(
      "Supabase error fetching missions trajectory:",
      missionsResult.error.message,
      missionsResult.error.code,
      missionsResult.error.details,
      missionsResult.error.hint
    )
  }

  if (pnlResult.error) {
    console.error(
      "Supabase error fetching pnl trajectory:",
      pnlResult.error.message,
      pnlResult.error.code,
      pnlResult.error.details,
      pnlResult.error.hint
    )
  }

  const missions = (missionsResult.data ?? []) as MissionRow[]
  const pnlRows = (pnlResult.data ?? []) as PnlMonthlyRow[]
  const pnlByMonth = new Map(pnlRows.map((row) => [row.period_month.slice(0, 7), row]))

  const points: TrajectoryPoint2026[] = MONTHS_2026.map(({ key, label }) => {
    const pnlRow = pnlByMonth.get(key)
    const capacityActual = missions.filter((mission) => missionOverlapsMonth(mission, key)).length

    return {
      monthKey: key,
      monthLabel: label,
      revenueActual: pnlRow?.revenue_total ?? null,
      revenueTarget: ASSUMPTIONS.monthlyRevenueTarget,
      capacityActual: capacityActual > 0 ? capacityActual : null,
      capacityTarget: Number(CAPACITY_TARGET.toFixed(1)),
      marginActual: pnlRow?.gross_margin_percent ?? null,
      marginTarget: ASSUMPTIONS.marginTarget,
      annotation: null,
    }
  })

  const ytdRows = points.filter((point) => point.revenueActual !== null)
  const ytdRevenueActual = ytdRows.reduce((sum, point) => sum + (point.revenueActual ?? 0), 0)
  const ytdRevenueTarget = ytdRows.length * ASSUMPTIONS.monthlyRevenueTarget
  const ytdRevenueDelta = ytdRevenueActual - ytdRevenueTarget

  const ytdPnlRows = pnlRows.filter((row) => row.gross_margin_value !== null && row.revenue_total > 0)
  const ytdMarginActual = ytdPnlRows.length
    ? Number(
        (
          ytdPnlRows.reduce((sum, row) => sum + (row.gross_margin_value ?? 0), 0)
          / ytdPnlRows.reduce((sum, row) => sum + row.revenue_total, 0)
        * 100
        ).toFixed(2)
      )
    : null

  const ytdCapacityValues = points
    .filter((point) => point.revenueActual !== null && point.capacityActual !== null)
    .map((point) => point.capacityActual as number)

  const ytdCapacityActual = ytdCapacityValues.length
    ? Number((ytdCapacityValues.reduce((sum, value) => sum + value, 0) / ytdCapacityValues.length).toFixed(1))
    : null

  return {
    points,
    summary: {
      ytdRevenueActual,
      ytdRevenueTarget,
      ytdRevenueDelta,
      ytdMarginActual,
      ytdMarginTarget: ASSUMPTIONS.marginTarget,
      ytdCapacityActual,
      ytdCapacityTarget: Number(CAPACITY_TARGET.toFixed(1)),
    },
    assumptions: {
      ...ASSUMPTIONS,
      productivityPerActiveMonth: Number(PRODUCTIVITY_PER_ACTIVE_MONTH.toFixed(2)),
      capacityTarget: Number(CAPACITY_TARGET.toFixed(2)),
    },
  }
}

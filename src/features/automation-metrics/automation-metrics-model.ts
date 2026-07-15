import type {
  AutomationMetricsComparison,
  AutomationMetricsFilters,
  AutomationMetricsGrain,
  AutomationMetricsRun,
  AutomationMetricsSnapshot,
  AutomationMetricsSummary,
  AutomationMetricsTimelinePoint,
} from "./automation-metrics-types"

const DAY_MS = 86_400_000

function validDate(value: string): Date {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error("Période invalide")
  return date
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const offset = (next.getUTCDay() + 6) % 7
  next.setUTCDate(next.getUTCDate() - offset)
  return next
}

function weekLabel(key: string): string {
  const date = new Date(`${key}T00:00:00.000Z`)
  const thursday = new Date(date)
  thursday.setUTCDate(thursday.getUTCDate() + 3)
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4))
  const offset = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - offset + 3)
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS))
  return `S. ${week}`
}

function bucketKey(date: Date, grain: AutomationMetricsGrain): string {
  return grain === "day" ? dateKey(date) : dateKey(startOfWeek(date))
}

function bucketLabel(key: string, grain: AutomationMetricsGrain): string {
  const date = new Date(`${key}T12:00:00.000Z`)
  return grain === "day"
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date)
    : weekLabel(key)
}

function bucketKeys(from: Date, to: Date, grain: AutomationMetricsGrain): string[] {
  const keys: string[] = []
  const end = new Date(to.getTime() - 1)
  let cursor = grain === "day"
    ? new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
    : startOfWeek(from)
  const last = bucketKey(end, grain)

  while (dateKey(cursor) <= last) {
    keys.push(dateKey(cursor))
    cursor = new Date(cursor)
    cursor.setUTCDate(cursor.getUTCDate() + (grain === "day" ? 1 : 7))
  }
  return keys
}

export function getAutomationMetricsGrain(filters: AutomationMetricsFilters): AutomationMetricsGrain {
  if (filters.preset === "12w" || filters.preset === "year") return "week"
  if (filters.preset !== "custom") return "day"
  const duration = validDate(filters.to).getTime() - validDate(filters.from).getTime()
  return duration <= 60 * DAY_MS ? "day" : "week"
}

export function percentile95(values: Array<number | null>): number | null {
  const sorted = values.filter((value): value is number => value !== null && Number.isFinite(value)).sort((left, right) => left - right)
  if (sorted.length === 0) return null
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? null
}

export function percentageComparison(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || !Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null
  const result = ((current - previous) / previous) * 100
  return Number.isFinite(result) ? result : null
}

export function summarizeAutomationRuns(runs: AutomationMetricsRun[]): AutomationMetricsSummary {
  const succeeded = runs.filter((run) => run.status === "succeeded").length
  const failed = runs.filter((run) => run.status === "failed").length
  const decided = succeeded + failed
  const measuredCosts = runs.map((run) => run.costEstimate).filter((cost): cost is number => cost !== null && Number.isFinite(cost))

  return {
    executions: runs.length,
    succeeded,
    failed,
    successRatePct: decided === 0 ? null : (succeeded / decided) * 100,
    p95DurationMs: percentile95(runs.map((run) => run.durationMs)),
    measuredCost: measuredCosts.length === 0 ? null : measuredCosts.reduce((sum, cost) => sum + cost, 0),
    costCoveragePct: runs.length === 0 ? null : (measuredCosts.length / runs.length) * 100,
  }
}

export function compareAutomationSummaries(current: AutomationMetricsSummary, previous: AutomationMetricsSummary): AutomationMetricsComparison {
  return {
    executionsPct: percentageComparison(current.executions, previous.executions),
    successRatePoints: current.successRatePct === null || previous.successRatePct === null ? null : current.successRatePct - previous.successRatePct,
    p95DurationPct: percentageComparison(current.p95DurationMs, previous.p95DurationMs),
    measuredCostPct: percentageComparison(current.measuredCost, previous.measuredCost),
  }
}

export function buildAutomationTimeline(runs: AutomationMetricsRun[], from: string, to: string, grain: AutomationMetricsGrain): AutomationMetricsTimelinePoint[] {
  const start = validDate(from)
  const end = validDate(to)
  const byKey = new Map<string, { succeeded: number; failed: number }>()

  for (const run of runs) {
    const createdAt = validDate(run.createdAt)
    if (createdAt < start || createdAt >= end) continue
    const key = bucketKey(createdAt, grain)
    const current = byKey.get(key) ?? { succeeded: 0, failed: 0 }
    if (run.status === "succeeded") current.succeeded += 1
    if (run.status === "failed") current.failed += 1
    byKey.set(key, current)
  }

  return bucketKeys(start, end, grain).map((key) => {
    const values = byKey.get(key) ?? { succeeded: 0, failed: 0 }
    const decided = values.succeeded + values.failed
    return {
      key,
      label: bucketLabel(key, grain),
      ...values,
      successRatePct: decided === 0 ? null : (values.succeeded / decided) * 100,
    }
  })
}

function isInRange(run: AutomationMetricsRun, from: Date, to: Date): boolean {
  const createdAt = validDate(run.createdAt)
  return createdAt >= from && createdAt < to
}

export function buildAutomationMetricsSnapshot(runs: AutomationMetricsRun[], filters: AutomationMetricsFilters): AutomationMetricsSnapshot {
  const from = validDate(filters.from)
  const to = validDate(filters.to)
  if (to <= from) throw new Error("La date de fin doit être postérieure à la date de début")

  const duration = to.getTime() - from.getTime()
  const previousFrom = new Date(from.getTime() - duration)
  const workflowOptions = Array.from(new Set(runs.map((run) => run.runType))).sort((left, right) => left.localeCompare(right, "fr"))
  const matching = filters.workflow === "all" ? runs : runs.filter((run) => run.runType === filters.workflow)
  const currentRuns = matching.filter((run) => isInRange(run, from, to))
  const previousRuns = matching.filter((run) => isInRange(run, previousFrom, from))
  const summary = summarizeAutomationRuns(currentRuns)
  const previousSummary = summarizeAutomationRuns(previousRuns)
  const grain = getAutomationMetricsGrain(filters)

  return {
    range: { from: from.toISOString(), to: to.toISOString(), previousFrom: previousFrom.toISOString(), grain },
    workflowOptions,
    summary,
    previousSummary,
    comparison: compareAutomationSummaries(summary, previousSummary),
    timeline: buildAutomationTimeline(currentRuns, from.toISOString(), to.toISOString(), grain),
  }
}

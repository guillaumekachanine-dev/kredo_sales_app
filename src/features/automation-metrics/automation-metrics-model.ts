import type {
  AutomationMetricsComparison,
  AutomationMetricsCostSort,
  AutomationMetricsCostSummary,
  AutomationMetricsFilters,
  AutomationMetricsGrain,
  AutomationMetricsIncidentRun,
  AutomationMetricsRun,
  AutomationMetricsSnapshot,
  AutomationMetricsSummary,
  AutomationMetricsTimelinePoint,
  AutomationMetricsPerformanceSort,
  AutomationIncidentCategory,
  AutomationIncidentCategoryId,
  AutomationIncidentsSummary,
  AutomationWorkflowCostEfficiency,
  AutomationWorkflowPerformance,
  AutomationWorkflowReliability,
  AutomationWorkflowSampleState,
} from "./automation-metrics-types"
import { workflowLabelForRunType } from "@/lib/automations/workflow-labels"

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

export function percentileNearestRank(values: Array<number | null>, percentile: number): number | null {
  const sorted = values.filter((value): value is number => value !== null && Number.isFinite(value)).sort((left, right) => left - right)
  if (sorted.length === 0 || percentile <= 0 || percentile > 1) return null
  return sorted[Math.ceil(sorted.length * percentile) - 1] ?? null
}

export function percentile95(values: Array<number | null>): number | null {
  return percentileNearestRank(values, 0.95)
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
  const measuredCosts = runs.map((run) => run.costEstimate).filter((cost): cost is number => cost !== null && Number.isFinite(cost) && cost >= 0)

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

function workflowRunTypes(currentRuns: AutomationMetricsRun[], previousRuns: AutomationMetricsRun[]): string[] {
  return Array.from(new Set([...currentRuns, ...previousRuns].map((run) => run.runType)))
}

function sampleStateFor(decided: number): AutomationWorkflowSampleState {
  if (decided === 0) return "none"
  if (decided < 5) return "limited"
  return "sufficient"
}

function runsByWorkflow(runs: AutomationMetricsRun[]): Map<string, AutomationMetricsRun[]> {
  const groups = new Map<string, AutomationMetricsRun[]>()
  for (const run of runs) {
    const group = groups.get(run.runType) ?? []
    group.push(run)
    groups.set(run.runType, group)
  }
  return groups
}

export function sortWorkflowReliability(workflows: AutomationWorkflowReliability[]): AutomationWorkflowReliability[] {
  return [...workflows].sort((left, right) => {
    const leftHasDecisions = left.decided > 0
    const rightHasDecisions = right.decided > 0
    if (leftHasDecisions !== rightHasDecisions) return leftHasDecisions ? -1 : 1
    if (!leftHasDecisions && !rightHasDecisions) return workflowLabelForRunType(left.runType).localeCompare(workflowLabelForRunType(right.runType), "fr")
    return (left.successRatePct ?? Infinity) - (right.successRatePct ?? Infinity)
      || right.failed - left.failed
      || right.decided - left.decided
      || workflowLabelForRunType(left.runType).localeCompare(workflowLabelForRunType(right.runType), "fr")
  })
}

export function buildWorkflowReliability(currentRuns: AutomationMetricsRun[], previousRuns: AutomationMetricsRun[]): AutomationWorkflowReliability[] {
  const currentByWorkflow = runsByWorkflow(currentRuns)
  const previousByWorkflow = runsByWorkflow(previousRuns)
  const workflows = workflowRunTypes(currentRuns, previousRuns).map((runType) => {
    const current = summarizeAutomationRuns(currentByWorkflow.get(runType) ?? [])
    const previous = summarizeAutomationRuns(previousByWorkflow.get(runType) ?? [])
    const decided = current.succeeded + current.failed

    return {
      runType,
      executions: current.executions,
      succeeded: current.succeeded,
      failed: current.failed,
      decided,
      successRatePct: current.successRatePct,
      previousSuccessRatePct: previous.successRatePct,
      successRateDeltaPoints: current.successRatePct === null || previous.successRatePct === null ? null : current.successRatePct - previous.successRatePct,
      sampleState: sampleStateFor(decided),
    }
  })

  return sortWorkflowReliability(workflows)
}

function measuredDurations(runs: AutomationMetricsRun[]): number[] {
  return runs
    .map((run) => run.durationMs)
    .filter((duration): duration is number => duration !== null && Number.isFinite(duration) && duration >= 0)
}

export function sortWorkflowPerformance(
  workflows: AutomationWorkflowPerformance[],
  sort: AutomationMetricsPerformanceSort,
): AutomationWorkflowPerformance[] {
  return [...workflows].sort((left, right) => {
    const compareLabel = () => workflowLabelForRunType(left.runType).localeCompare(workflowLabelForRunType(right.runType), "fr")
    if (sort === "measuredVolume") {
      return right.measuredDurations - left.measuredDurations
        || (right.p95DurationMs ?? -Infinity) - (left.p95DurationMs ?? -Infinity)
        || compareLabel()
    }
    const leftMeasured = left.p95DurationMs !== null
    const rightMeasured = right.p95DurationMs !== null
    if (leftMeasured !== rightMeasured) return leftMeasured ? -1 : 1
    return (right.p95DurationMs ?? -Infinity) - (left.p95DurationMs ?? -Infinity)
      || (right.p50DurationMs ?? -Infinity) - (left.p50DurationMs ?? -Infinity)
      || compareLabel()
  })
}

export function buildWorkflowPerformance(currentRuns: AutomationMetricsRun[], previousRuns: AutomationMetricsRun[]): AutomationWorkflowPerformance[] {
  const currentByWorkflow = runsByWorkflow(currentRuns)
  const previousByWorkflow = runsByWorkflow(previousRuns)
  const workflows = workflowRunTypes(currentRuns, previousRuns).map((runType) => {
    const current = currentByWorkflow.get(runType) ?? []
    const previous = previousByWorkflow.get(runType) ?? []
    const currentDurations = measuredDurations(current)
    const previousP95DurationMs = percentileNearestRank(measuredDurations(previous), 0.95)
    const p95DurationMs = percentileNearestRank(currentDurations, 0.95)

    return {
      runType,
      executions: current.length,
      measuredDurations: currentDurations.length,
      durationCoveragePct: current.length === 0 ? null : (currentDurations.length / current.length) * 100,
      p50DurationMs: percentileNearestRank(currentDurations, 0.5),
      p95DurationMs,
      previousP95DurationMs,
      p95DeltaPct: percentageComparison(p95DurationMs, previousP95DurationMs),
    }
  })

  return sortWorkflowPerformance(workflows, "p95")
}

function measuredCosts(runs: AutomationMetricsRun[]): number[] {
  return runs
    .map((run) => run.costEstimate)
    .filter((cost): cost is number => cost !== null && Number.isFinite(cost) && cost >= 0)
}

function costSummaryFor(runs: AutomationMetricsRun[]): Omit<AutomationMetricsCostSummary, "previousMeasuredCost" | "measuredCostDeltaPct" | "previousCostPerSuccess" | "costPerSuccessDeltaPct"> {
  const costs = measuredCosts(runs)
  const measuredCost = costs.length === 0 ? null : costs.reduce((sum, cost) => sum + cost, 0)
  const succeeded = runs.filter((run) => run.status === "succeeded").length

  return {
    executions: runs.length,
    succeeded,
    measuredRuns: costs.length,
    costCoveragePct: runs.length === 0 ? null : (costs.length / runs.length) * 100,
    measuredCost,
    averageCostPerMeasuredRun: measuredCost === null ? null : measuredCost / costs.length,
    costPerSuccess: measuredCost === null || succeeded === 0 ? null : measuredCost / succeeded,
  }
}

function compareCostSummaries(
  current: ReturnType<typeof costSummaryFor>,
  previous: ReturnType<typeof costSummaryFor>,
): AutomationMetricsCostSummary {
  return {
    ...current,
    previousMeasuredCost: previous.measuredCost,
    measuredCostDeltaPct: percentageComparison(current.measuredCost, previous.measuredCost),
    previousCostPerSuccess: previous.costPerSuccess,
    costPerSuccessDeltaPct: percentageComparison(current.costPerSuccess, previous.costPerSuccess),
  }
}

export function sortWorkflowCosts(
  workflows: AutomationWorkflowCostEfficiency[],
  sort: AutomationMetricsCostSort,
): AutomationWorkflowCostEfficiency[] {
  return [...workflows].sort((left, right) => {
    const compareLabel = () => workflowLabelForRunType(left.runType).localeCompare(workflowLabelForRunType(right.runType), "fr")
    if (sort === "measuredCost") {
      const leftMeasured = left.measuredCost !== null
      const rightMeasured = right.measuredCost !== null
      if (leftMeasured !== rightMeasured) return leftMeasured ? -1 : 1
      return (right.measuredCost ?? -Infinity) - (left.measuredCost ?? -Infinity)
        || right.measuredRuns - left.measuredRuns
        || compareLabel()
    }
    const leftMeasured = left.costPerSuccess !== null
    const rightMeasured = right.costPerSuccess !== null
    if (leftMeasured !== rightMeasured) return leftMeasured ? -1 : 1
    return (right.costPerSuccess ?? -Infinity) - (left.costPerSuccess ?? -Infinity)
      || (right.measuredCost ?? -Infinity) - (left.measuredCost ?? -Infinity)
      || compareLabel()
  })
}

export function buildWorkflowCosts(currentRuns: AutomationMetricsRun[], previousRuns: AutomationMetricsRun[]): AutomationWorkflowCostEfficiency[] {
  const currentByWorkflow = runsByWorkflow(currentRuns)
  const previousByWorkflow = runsByWorkflow(previousRuns)
  const workflows = workflowRunTypes(currentRuns, previousRuns).map((runType) => {
    const current = costSummaryFor(currentByWorkflow.get(runType) ?? [])
    const previous = costSummaryFor(previousByWorkflow.get(runType) ?? [])
    return {
      runType,
      executions: current.executions,
      succeeded: current.succeeded,
      failed: (currentByWorkflow.get(runType) ?? []).filter((run) => run.status === "failed").length,
      measuredRuns: current.measuredRuns,
      costCoveragePct: current.costCoveragePct,
      measuredCost: current.measuredCost,
      averageCostPerMeasuredRun: current.averageCostPerMeasuredRun,
      costPerSuccess: current.costPerSuccess,
      previousMeasuredCost: previous.measuredCost,
      measuredCostDeltaPct: percentageComparison(current.measuredCost, previous.measuredCost),
      previousCostPerSuccess: previous.costPerSuccess,
      costPerSuccessDeltaPct: percentageComparison(current.costPerSuccess, previous.costPerSuccess),
    }
  })

  return sortWorkflowCosts(workflows, "costPerSuccess")
}

const INCIDENT_CATEGORY_DETAILS: Record<AutomationIncidentCategoryId, Pick<AutomationIncidentCategory, "label" | "description">> = {
  stuck_callback: { label: "Blocage ou callback absent", description: "Run bloqué détecté par la surveillance" },
  webhook: { label: "Webhook ou connexion n8n", description: "Échec de callback ou de connexion n8n" },
  auth_configuration: { label: "Authentification ou configuration", description: "Accès, clé ou configuration indisponible" },
  database_rpc: { label: "Base de données ou RPC", description: "Erreur Supabase, Postgres ou fonction RPC" },
  runtime_node: { label: "Exécution ou nœud technique", description: "Erreur d’exécution d’un nœud technique" },
  output_validation: { label: "Format ou validation de sortie", description: "Réponse produite dans un format non exploitable" },
  provider_service: { label: "Service externe ou fournisseur", description: "Fournisseur indisponible ou limité" },
  other: { label: "Autres incidents", description: "Message absent ou non reconnu" },
}

function normalizeIncidentMessage(errorMessage: string | null): string {
  return (errorMessage ?? "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
}

function includesAny(message: string, values: string[]): boolean {
  return values.some((value) => message.includes(value))
}

export function classifyAutomationIncident(errorMessage: string | null): AutomationIncidentCategoryId {
  const message = normalizeIncidentMessage(errorMessage)
  if (!message) return "other"
  if (includesAny(message, ["aucun callback", "run assaini", "run repris automatiquement", "seuil de reprise", "statut running depassant", "statut queued depassant", "running depassant", "queued depassant"])) return "stuck_callback"
  if (includesAny(message, ["webhook", "not registered", "fetch failed", "production url"])) return "webhook"
  if (includesAny(message, ["service_role", "service role", "401", "unauthorized", "authentication", "authentifier", "api key", "cle manquante", "variable d'environnement"])) return "auth_configuration"
  if (includesAny(message, ["pgrst", "rpc", "could not choose", "function overloading", "candidate function", "postgres", "supabase"])) return "database_rpc"
  if (includesAny(message, ["code node", "helpers.", "not supported", "node execution", "cannot read properties", "is not a function"])) return "runtime_node"
  if (includesAny(message, ["json", "parse", "schema", "validation", "format", "doit etre un tableau", "invalid output", "malformed"])) return "output_validation"
  if (includesAny(message, ["service failed", "failed to process", "timeout", "timed out", "429", "rate limit", "502", "503", "504", "network error"])) return "provider_service"
  return "other"
}

export function isAutomaticAutomationIntervention(errorMessage: string | null): boolean {
  const message = normalizeIncidentMessage(errorMessage)
  return includesAny(message, ["run assaini", "run repris automatiquement", "seuil de reprise", "statut running depassant", "statut queued depassant"])
}

function incidentsInRange(runs: AutomationMetricsIncidentRun[], from: Date, to: Date): AutomationMetricsIncidentRun[] {
  return runs.filter((run) => {
    const createdAt = validDate(run.createdAt)
    return createdAt >= from && createdAt < to
  })
}

export function buildIncidentsSummary(currentRuns: AutomationMetricsIncidentRun[], previousRuns: AutomationMetricsIncidentRun[]): AutomationIncidentsSummary {
  const automaticInterventions = currentRuns.filter((run) => isAutomaticAutomationIntervention(run.errorMessage)).length
  const previousAutomaticInterventions = previousRuns.filter((run) => isAutomaticAutomationIntervention(run.errorMessage)).length
  return {
    failedRuns: currentRuns.length,
    previousFailedRuns: previousRuns.length,
    failedRunsDeltaPct: percentageComparison(currentRuns.length, previousRuns.length),
    automaticInterventions,
    previousAutomaticInterventions,
    automaticInterventionsDeltaPct: percentageComparison(automaticInterventions, previousAutomaticInterventions),
    automaticInterventionSharePct: currentRuns.length === 0 ? null : (automaticInterventions / currentRuns.length) * 100,
  }
}

export function buildIncidentCategories(currentRuns: AutomationMetricsIncidentRun[], previousRuns: AutomationMetricsIncidentRun[]): AutomationIncidentCategory[] {
  const currentCounts = new Map<AutomationIncidentCategoryId, number>()
  const previousCounts = new Map<AutomationIncidentCategoryId, number>()
  for (const run of currentRuns) {
    const category = classifyAutomationIncident(run.errorMessage)
    currentCounts.set(category, (currentCounts.get(category) ?? 0) + 1)
  }
  for (const run of previousRuns) {
    const category = classifyAutomationIncident(run.errorMessage)
    previousCounts.set(category, (previousCounts.get(category) ?? 0) + 1)
  }
  const total = currentRuns.length
  const ordered = Array.from(currentCounts.entries())
    .filter(([, incidents]) => incidents > 0)
    .sort(([leftId, leftCount], [rightId, rightCount]) => rightCount - leftCount || INCIDENT_CATEGORY_DETAILS[leftId].label.localeCompare(INCIDENT_CATEGORY_DETAILS[rightId].label, "fr"))

  let cumulative = 0
  return ordered.map(([id, incidents], index) => {
    cumulative += incidents
    return {
      id,
      ...INCIDENT_CATEGORY_DETAILS[id],
      incidents,
      sharePct: total === 0 ? 0 : (incidents / total) * 100,
      cumulativeSharePct: index === ordered.length - 1 ? 100 : (cumulative / total) * 100,
      previousIncidents: previousCounts.get(id) ?? 0,
      incidentsDelta: incidents - (previousCounts.get(id) ?? 0),
    }
  })
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

export function buildAutomationMetricsSnapshot(
  runs: AutomationMetricsRun[],
  incidentRuns: AutomationMetricsIncidentRun[],
  filters: AutomationMetricsFilters,
): AutomationMetricsSnapshot {
  const from = validDate(filters.from)
  const to = validDate(filters.to)
  if (to <= from) throw new Error("La date de fin doit être postérieure à la date de début")

  const duration = to.getTime() - from.getTime()
  const previousFrom = new Date(from.getTime() - duration)
  const workflowOptions = Array.from(new Set(runs.map((run) => run.runType))).sort((left, right) => left.localeCompare(right, "fr"))
  const matching = filters.workflow === "all" ? runs : runs.filter((run) => run.runType === filters.workflow)
  const matchingIncidents = filters.workflow === "all" ? incidentRuns : incidentRuns.filter((run) => run.runType === filters.workflow)
  const currentRuns = matching.filter((run) => isInRange(run, from, to))
  const previousRuns = matching.filter((run) => isInRange(run, previousFrom, from))
  const currentIncidents = incidentsInRange(matchingIncidents, from, to)
  const previousIncidents = incidentsInRange(matchingIncidents, previousFrom, from)
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
    workflowReliability: buildWorkflowReliability(currentRuns, previousRuns),
    workflowPerformance: buildWorkflowPerformance(currentRuns, previousRuns),
    costsSummary: compareCostSummaries(costSummaryFor(currentRuns), costSummaryFor(previousRuns)),
    workflowCosts: buildWorkflowCosts(currentRuns, previousRuns),
    incidentsSummary: buildIncidentsSummary(currentIncidents, previousIncidents),
    incidentCategories: buildIncidentCategories(currentIncidents, previousIncidents),
  }
}

import type { Json } from "@/types/database"

export const GLOBAL_WATCH_WORKFLOW_ID = process.env.NEXT_PUBLIC_GLOBAL_WATCH_WORKFLOW_ID ?? null
export const MONTHLY_WATCH_WORKFLOW_ID = "intel-021-monthly-watch-analysis" as const

export type VeilleSection = "news" | "watched-accounts" | "strategic-analysis" | "history"

export type GlobalWatchCadence = "weekly"

export type GlobalWatchSettings = {
  enabled: boolean
  cadence: GlobalWatchCadence
  maxArticles: number
  depth: "standard" | "balanced" | "deep"
  sourceFamilyOverrides: Record<string, boolean>
  interestTopics: string[]
  intention?: string
  exclusions?: string
}

export const DEFAULT_GLOBAL_WATCH_SETTINGS: GlobalWatchSettings = {
  enabled: true,
  cadence: "weekly",
  maxArticles: 40,
  depth: "balanced",
  sourceFamilyOverrides: {},
  interestTopics: [],
  intention: "",
  exclusions: "",
}

export type GlobalWatchWorkflowHealth = {
  state: "succeeded" | "failed" | "running" | "queued" | "unconfigured"
  label: "OK" | "Erreur" | "En cours" | "À contrôler"
  runId: string | null
  lastRunAt: string | null
  lastSucceededAt: string | null
  errorMessage: string | null
  workflowId: string | null
  isConfigured: boolean
}

export type MonthlyWatchAnalysisInput = {
  schemaVersion: 1
  periodStart: string
  periodEnd: string
  digestIds: string[]
  articleIds: string[]
  requestedAt: string
  triggerMode: "manual" | "scheduled"
}

export type MonthlyWatchAnalysisOutput = {
  schemaVersion: 1
  period: { start: string; end: string; label: string }
  executiveSummary: string
  majorTrends: Array<{
    title: string
    synthesis: string
    articleIds: string[]
    sectors: string[]
    confidence: number
  }>
  weakSignals: Array<{ title: string; synthesis: string; articleIds: string[] }>
  regulatoryDevelopments: Array<{ title: string; impact: string; articleIds: string[] }>
  commercialOpportunities: Array<{
    title: string
    rationale: string
    recommendedAction: string
    practices: string[]
    articleIds: string[]
  }>
  risksAndWatchpoints: Array<{ title: string; explanation: string; articleIds: string[] }>
  priorityActions: Array<{
    title: string
    action: string
    horizon: "immediate" | "30_days" | "quarter"
  }>
  coverage: { digestsCount: number; articlesCount: number; sourcesCount: number }
}

export type StrategicWatchAnalysis = {
  id: string
  title: string
  status: "draft" | "ready" | "used" | "archived"
  periodStart: string | null
  periodEnd: string | null
  createdAt: string
  updatedAt: string
  versionNumber: number
  content: MonthlyWatchAnalysisOutput | null
}

export type MonthlyWatchGenerationContext = {
  input: MonthlyWatchAnalysisInput
  isAlreadyCovered: boolean
  activeRun: { id: string; status: "queued" | "running"; createdAt: string } | null
  latestRun: {
    id: string
    status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
    createdAt: string
    errorMessage: string | null
  } | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function parseGlobalWatchSettings(settings: Json | null | undefined): GlobalWatchSettings {
  if (!isRecord(settings) || !isRecord(settings.veille)) return DEFAULT_GLOBAL_WATCH_SETTINGS
  const veille = settings.veille
  const maxArticles = typeof veille.maxArticles === "number"
    ? Math.min(100, Math.max(5, Math.round(veille.maxArticles)))
    : DEFAULT_GLOBAL_WATCH_SETTINGS.maxArticles

  const depth = (veille.depth === "standard" || veille.depth === "deep") ? veille.depth : "balanced"
  const intention = typeof veille.intention === "string" ? veille.intention : ""
  const exclusions = typeof veille.exclusions === "string" ? veille.exclusions : ""

  const sourceFamilyOverrides = isRecord(veille.sourceFamilyOverrides) 
    ? Object.fromEntries(Object.entries(veille.sourceFamilyOverrides).filter(([_, v]) => typeof v === "boolean")) as Record<string, boolean>
    : DEFAULT_GLOBAL_WATCH_SETTINGS.sourceFamilyOverrides

  const interestTopics = Array.isArray(veille.interestTopics)
    ? veille.interestTopics.filter((t) => typeof t === "string")
    : DEFAULT_GLOBAL_WATCH_SETTINGS.interestTopics

  return {
    enabled: typeof veille.enabled === "boolean" ? veille.enabled : DEFAULT_GLOBAL_WATCH_SETTINGS.enabled,
    cadence: "weekly",
    maxArticles,
    depth,
    sourceFamilyOverrides,
    interestTopics,
    intention,
    exclusions,
  }
}

export function validateGlobalWatchSettings(value: unknown):
  | { success: true; data: GlobalWatchSettings }
  | { success: false; error: string } {
  if (!isRecord(value)) return { success: false, error: "Configuration invalide." }
  if (typeof value.enabled !== "boolean") return { success: false, error: "État de la veille invalide." }
  if (value.cadence !== "weekly") return { success: false, error: "Cadence non prise en charge." }
  if (typeof value.maxArticles !== "number" || !Number.isInteger(value.maxArticles) || value.maxArticles < 5 || value.maxArticles > 100) {
    return { success: false, error: "Le volume doit être compris entre 5 et 100 articles." }
  }

  const depth = (value.depth === "standard" || value.depth === "deep") ? value.depth : "balanced"
  const intention = typeof value.intention === "string" ? value.intention : ""
  const exclusions = typeof value.exclusions === "string" ? value.exclusions : ""

  const sourceFamilyOverrides = isRecord(value.sourceFamilyOverrides) 
    ? Object.fromEntries(Object.entries(value.sourceFamilyOverrides).filter(([_, v]) => typeof v === "boolean")) as Record<string, boolean>
    : {}

  const interestTopics = Array.isArray(value.interestTopics)
    ? value.interestTopics.filter((t) => typeof t === "string")
    : []

  return {
    success: true,
    data: {
      enabled: value.enabled,
      cadence: "weekly",
      maxArticles: value.maxArticles,
      depth,
      sourceFamilyOverrides,
      interestTopics,
      intention,
      exclusions,
    },
  }
}

export function previousCalendarMonth(reference = new Date()) {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 0))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(start),
  }
}

export function parseMonthlyWatchAnalysisOutput(value: Json): MonthlyWatchAnalysisOutput | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.period)) return null
  if (typeof value.executiveSummary !== "string" || !isRecord(value.coverage)) return null
  const period = value.period
  if (typeof period.start !== "string" || typeof period.end !== "string" || typeof period.label !== "string") return null
  const coverage = value.coverage
  if (
    typeof coverage.digestsCount !== "number" ||
    typeof coverage.articlesCount !== "number" ||
    typeof coverage.sourcesCount !== "number"
  ) return null

  return value as unknown as MonthlyWatchAnalysisOutput
}

export function healthFromRun(input: {
  workflowId: string | null
  run: {
    id: string
    status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
    created_at: string
    completed_at: string | null
    error_message: string | null
  } | null
}): GlobalWatchWorkflowHealth {
  if (!input.workflowId) {
    return {
      state: "unconfigured",
      label: "À contrôler",
      runId: null,
      lastRunAt: null,
      lastSucceededAt: null,
      errorMessage: "Identifiant stable du workflow global non configuré.",
      workflowId: null,
      isConfigured: false,
    }
  }
  const run = input.run
  if (!run) {
    return {
      state: "unconfigured",
      label: "À contrôler",
      runId: null,
      lastRunAt: null,
      lastSucceededAt: null,
      errorMessage: "Aucun run fiable pour ce workflow.",
      workflowId: input.workflowId,
      isConfigured: true,
    }
  }
  if (run.status === "queued" || run.status === "running") {
    return {
      state: run.status,
      label: "En cours",
      runId: run.id,
      lastRunAt: run.created_at,
      lastSucceededAt: null,
      errorMessage: null,
      workflowId: input.workflowId,
      isConfigured: true,
    }
  }
  if (run.status === "succeeded") {
    return {
      state: "succeeded",
      label: "OK",
      runId: run.id,
      lastRunAt: run.created_at,
      lastSucceededAt: run.completed_at ?? run.created_at,
      errorMessage: null,
      workflowId: input.workflowId,
      isConfigured: true,
    }
  }
  return {
    state: "failed",
    label: "Erreur",
    runId: run.id,
    lastRunAt: run.created_at,
    lastSucceededAt: null,
    errorMessage: run.error_message,
    workflowId: input.workflowId,
    isConfigured: true,
  }
}

export function getSecondaryItems<T extends { id: string }>(items: T[], selectedId: string, limit = 3) {
  return items.filter((item) => item.id !== selectedId).slice(0, limit)
}

import type { Database } from "@/types/database"

export const ACCOUNT_WATCH_LEVELS = ["standard", "priority", "hot"] as const
export type AccountWatchLevel = (typeof ACCOUNT_WATCH_LEVELS)[number]

export const ACCOUNT_WATCH_CADENCES = ["weekly", "twice_weekly", "daily"] as const
export type AccountWatchCadence = (typeof ACCOUNT_WATCH_CADENCES)[number]

export const ACCOUNT_WATCH_LAST_STATUSES = ["queued", "running", "succeeded", "failed"] as const
export type AccountWatchLastStatus = (typeof ACCOUNT_WATCH_LAST_STATUSES)[number]

export const ACCOUNT_WATCH_LEVEL_LABELS: Record<AccountWatchLevel, string> = {
  standard: "Standard",
  priority: "Priority",
  hot: "Hot",
}

export const ACCOUNT_WATCH_CADENCE_LABELS: Record<AccountWatchCadence, string> = {
  weekly: "Hebdomadaire",
  twice_weekly: "2 fois par semaine",
  daily: "Quotidienne",
}

export const ACCOUNT_WATCH_LEVEL_TO_CADENCE: Record<AccountWatchLevel, AccountWatchCadence> = {
  standard: "weekly",
  priority: "twice_weekly",
  hot: "daily",
}

export type AccountWatchSettingsRow = Pick<
  Database["public"]["Tables"]["account_watch_settings"]["Row"],
  "is_enabled" | "watch_level" | "cadence" | "last_run_at" | "next_run_at" | "last_status" | "last_error" | "updated_at"
>

export type AccountWatchSettingsWorkflowRow = Pick<
  Database["public"]["Tables"]["account_watch_settings"]["Row"],
  | "is_enabled"
  | "watch_level"
  | "cadence"
  | "include_official_site"
  | "include_news"
  | "include_public_records"
  | "include_tenders"
  | "include_social_manual"
  | "include_jobs"
  | "query_aliases"
  | "metadata"
>

export type AccountWatchSettingsState = {
  exists: boolean
  isEnabled: boolean
  watchLevel: AccountWatchLevel
  cadence: AccountWatchCadence
  lastRunAt: string | null
  nextRunAt: string | null
  lastStatus: AccountWatchLastStatus | null
  lastError: string | null
  updatedAt: string | null
}

export type AccountWatchWorkflowSettings = {
  isEnabled: boolean
  watchLevel: AccountWatchLevel
  cadence: AccountWatchCadence
  includeOfficialSite: boolean
  includeNews: boolean
  includePublicRecords: boolean
  includeTenders: boolean
  includeSocialManual: boolean
  includeJobs: boolean
  queryAliases: string[]
  metadata: Record<string, unknown>
}

export const DEFAULT_ACCOUNT_WATCH_SETTINGS: AccountWatchSettingsState = {
  exists: false,
  isEnabled: false,
  watchLevel: "standard",
  cadence: "weekly",
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: null,
  lastError: null,
  updatedAt: null,
}

export const DEFAULT_ACCOUNT_WATCH_WORKFLOW_SETTINGS: AccountWatchWorkflowSettings = {
  isEnabled: false,
  watchLevel: "standard",
  cadence: "weekly",
  includeOfficialSite: true,
  includeNews: true,
  includePublicRecords: false,
  includeTenders: false,
  includeSocialManual: true,
  includeJobs: false,
  queryAliases: [],
  metadata: {},
}

export function cadenceForWatchLevel(level: AccountWatchLevel): AccountWatchCadence {
  return ACCOUNT_WATCH_LEVEL_TO_CADENCE[level]
}

export function isAccountWatchLevel(value: string): value is AccountWatchLevel {
  return ACCOUNT_WATCH_LEVELS.includes(value as AccountWatchLevel)
}

export function normalizeAccountWatchSettings(
  row: AccountWatchSettingsRow | null | undefined,
): AccountWatchSettingsState {
  if (!row) return DEFAULT_ACCOUNT_WATCH_SETTINGS

  return {
    exists: true,
    isEnabled: row.is_enabled,
    watchLevel: isAccountWatchLevel(row.watch_level) ? row.watch_level : DEFAULT_ACCOUNT_WATCH_SETTINGS.watchLevel,
    cadence:
      row.cadence === "weekly" || row.cadence === "twice_weekly" || row.cadence === "daily"
        ? row.cadence
        : DEFAULT_ACCOUNT_WATCH_SETTINGS.cadence,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    lastStatus:
      row.last_status === "queued" ||
      row.last_status === "running" ||
      row.last_status === "succeeded" ||
      row.last_status === "failed"
        ? row.last_status
        : null,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  }
}

export function toAccountWatchWorkflowSettings(
  row: AccountWatchSettingsWorkflowRow | null | undefined,
): AccountWatchWorkflowSettings {
  if (!row) return DEFAULT_ACCOUNT_WATCH_WORKFLOW_SETTINGS

  return {
    isEnabled: row.is_enabled,
    watchLevel: isAccountWatchLevel(row.watch_level) ? row.watch_level : DEFAULT_ACCOUNT_WATCH_WORKFLOW_SETTINGS.watchLevel,
    cadence:
      row.cadence === "weekly" || row.cadence === "twice_weekly" || row.cadence === "daily"
        ? row.cadence
        : DEFAULT_ACCOUNT_WATCH_WORKFLOW_SETTINGS.cadence,
    includeOfficialSite: row.include_official_site,
    includeNews: row.include_news,
    includePublicRecords: row.include_public_records,
    includeTenders: row.include_tenders,
    includeSocialManual: row.include_social_manual,
    includeJobs: row.include_jobs,
    queryAliases: Array.isArray(row.query_aliases) ? row.query_aliases.filter((value): value is string => typeof value === "string") : [],
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
  }
}

export const ACCOUNT_WATCH_CATEGORIES = [
  { value: "contrats", label: "Contrats remportés" },
  { value: "reglementation", label: "Réglementation" },
  { value: "recrutement", label: "Recrutement" },
  { value: "communication_officielle", label: "Communication officielle" },
  { value: "strategie", label: "Stratégie & gouvernance" },
  { value: "offres", label: "Offres & innovation" },
  { value: "finance", label: "Finance & investissements" },
  { value: "organisation", label: "Organisation & recrutements" },
  { value: "partenariats", label: "Partenariats & écosystème" },
  { value: "risques", label: "Risques & réputation" },
] as const

export type AccountWatchCategory = (typeof ACCOUNT_WATCH_CATEGORIES)[number]["value"]

export const ACCOUNT_WATCH_DEPTHS = ["standard", "balanced", "deep"] as const
export type AccountWatchDepth = (typeof ACCOUNT_WATCH_DEPTHS)[number]

export const ACCOUNT_WATCH_DEPTH_LABELS: Record<AccountWatchDepth, string> = {
  standard: "Standard",
  balanced: "Équilibrée",
  deep: "Approfondie",
}

export const ACCOUNT_WATCH_DEPTH_DESCRIPTIONS: Record<AccountWatchDepth, string> = {
  standard: "Sources essentielles · coût contenu",
  balanced: "Couverture élargie · modèle intermédiaire",
  deep: "Recherche étendue · modèle avancé",
}

export type AccountWatchDetailedSettings = AccountWatchSettingsState & {
  includeOfficialSite: boolean
  includeNews: boolean
  includePublicRecords: boolean
  includeTenders: boolean
  includeSocialManual: boolean
  includeJobs: boolean
  queryAliases: string[]
  monitoredCategories: AccountWatchCategory[]
  depth: AccountWatchDepth
  manualSourceUrls: string[]
  notes: string
}

export const DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS: AccountWatchDetailedSettings = {
  ...DEFAULT_ACCOUNT_WATCH_SETTINGS,
  includeOfficialSite: true,
  includeNews: true,
  includePublicRecords: false,
  includeTenders: false,
  includeSocialManual: true,
  includeJobs: false,
  queryAliases: [],
  monitoredCategories: ACCOUNT_WATCH_CATEGORIES.map((category) => category.value),
  depth: "balanced",
  manualSourceUrls: [],
  notes: "",
}

export type AccountWatchDetailedRow = AccountWatchSettingsRow & AccountWatchSettingsWorkflowRow

export function normalizeAccountWatchDetailedSettings(
  row: AccountWatchDetailedRow | null | undefined,
): AccountWatchDetailedSettings {
  if (!row) return DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS

  const basic = normalizeAccountWatchSettings(row)
  const workflow = toAccountWatchWorkflowSettings(row)
  const rawCategories = Array.isArray(workflow.metadata.monitored_categories)
    ? workflow.metadata.monitored_categories
    : []
  const allowedCategories = new Set<AccountWatchCategory>(
    ACCOUNT_WATCH_CATEGORIES.map((category) => category.value),
  )
  const monitoredCategories = rawCategories.filter(
    (category): category is AccountWatchCategory =>
      typeof category === "string" && allowedCategories.has(category as AccountWatchCategory),
  )
  const rawDepth = workflow.metadata.depth
  const depth = ACCOUNT_WATCH_DEPTHS.includes(rawDepth as AccountWatchDepth)
    ? rawDepth as AccountWatchDepth
    : DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS.depth
  const manualSourceUrls = Array.isArray(workflow.metadata.manual_source_urls)
    ? workflow.metadata.manual_source_urls.filter((url): url is string => {
        if (typeof url !== "string") return false
        try {
          const parsed = new URL(url)
          return parsed.protocol === "http:" || parsed.protocol === "https:"
        } catch {
          return false
        }
      })
    : []

  return {
    ...basic,
    includeOfficialSite: workflow.includeOfficialSite,
    includeNews: workflow.includeNews,
    includePublicRecords: workflow.includePublicRecords,
    includeTenders: workflow.includeTenders,
    includeSocialManual: workflow.includeSocialManual,
    includeJobs: workflow.includeJobs,
    queryAliases: workflow.queryAliases,
    monitoredCategories:
      monitoredCategories.length > 0
        ? monitoredCategories
        : DEFAULT_ACCOUNT_WATCH_DETAILED_SETTINGS.monitoredCategories,
    depth,
    manualSourceUrls,
    notes: typeof workflow.metadata.notes === "string" ? workflow.metadata.notes : "",
  }
}

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { formatDateTime } from "@/lib/formatters"
import { getOpportunityStageLabel, isTerminalOpportunityStage } from "@/lib/opportunities/stages"

export type DashboardLabPeriod = "30d" | "90d" | "180d"
export type DataOrigin = "REAL_NATIVE" | "REAL_LEGACY" | "PROXY" | "FUTURE_DEMO"
export type WindowState = "active" | "future" | "close" | "expired"

export type DataTrustMeta = {
  id: string
  label: string
  primaryOrigin: DataOrigin
  origins: DataOrigin[]
  formula: string
  freshness: {
    latestAt: string | null
    label: string
  }
  completeness: {
    value: number
    label: string
  }
  limitations: string[]
}

export type DashboardLabAccount = {
  id: string
  name: string
  sector: string
  sectorId: string | null
  lifecycle: string
  priority: string
  aiScore: number | null
  knowledgeState: string
  health: string | null
  contactCount: number
  committeeRoleCount: number
  committeeRoles: string[]
  decisionPowerCount: number
  opportunityCount: number
  openOpportunityCount: number
  weightedPipeline: number
  latestCommercialActivityAt: string | null
  latestPlannedEngagementAt: string | null
  latestIntelligenceAt: string | null
  latestDataUpdateAt: string | null
  activity30d: number
  activity90d: number
  activity180d: number
  interactions30d: number
  interactions90d: number
  interactions180d: number
  calendar30d: number
  calendar90d: number
  calendar180d: number
  plannedCommercialEngagement30d: number
  plannedCommercialEngagement90d: number
  plannedCommercialEngagement180d: number
  potentialScore: number
  potentialOrigin: {
    primaryOrigin: DataOrigin
    origins: DataOrigin[]
  }
  reachScore: number
  reachGapScore: number
  momentumScore30d: number
  momentumScore90d: number
  momentumScore180d: number
  monthlyEquivalentPoints30d: number
  monthlyEquivalentPoints90d: number
  monthlyEquivalentPoints180d: number
  inactivityRiskScore30d: number
  inactivityRiskScore90d: number
  inactivityRiskScore180d: number
  actionPriorityScore30d: number
  actionPriorityScore90d: number
  actionPriorityScore180d: number
  nextDecision: string
  legacyCoverage: {
    hasClientAnalysis: boolean
    hasSectorAnalysis: boolean
    hasPitches: boolean
  }
  nativeCoverage: {
    hasClientAnalysis: boolean
    hasSectorAnalysis: boolean
    hasProcessDiagnostic: boolean
    hasRoadmap: boolean
    latestRunAt: string | null
    latestRunStatus: string | null
    countRuns: number
    countResults: number
  }
}

export type DashboardLabSectorWindow = {
  id: string
  sectorId: string
  sectorSlug: string
  sectorName: string
  sourceType: "event" | "news" | "regulation"
  title: string
  subtitle: string
  eventAt: string | null
  windowState: WindowState
  stateLabel: string
  isCountedAsActive: boolean
  urgencyScore: number
  urgencyLabel: string
  recommendedPractice: "Data & AI" | "Cloud Eng" | "Product" | "Cyber"
  exposedCompanyIds: string[]
  exposedCompanyNames: string[]
  avgReachScore: number | null
  avgPotentialScore: number | null
  suggestedAction: string
  meta: DataTrustMeta
}

export type DashboardLabSectorSummary = {
  id: string
  slug: string
  name: string
  status: string
  attractivenessScore: number | null
  digitalMaturity: string | null
  topPractice: "Data & AI" | "Cloud Eng" | "Product" | "Cyber"
  practiceScores: Record<"Data & AI" | "Cloud Eng" | "Product" | "Cyber", number>
  linkedAccounts: number
  windowsCount: number
  avgReachScore: number | null
  avgPotentialScore: number | null
}

export type DashboardLabData = {
  generatedAt: string
  periods: DashboardLabPeriod[]
  accounts: DashboardLabAccount[]
  sectors: DashboardLabSectorSummary[]
  sectorWindows: DashboardLabSectorWindow[]
  metrics: {
    totalAccounts: number
    scoredAccounts: number
    accountsWithCommitteeRole: number
    accountsLinkedToSectorIntelligence: number
    realNativeWindowCount: number
    nativeIntelligenceAccounts: number
    legacyIntelligenceAccounts: number
  }
  filterOptions: {
    sectors: string[]
    lifecycles: string[]
    priorities: string[]
  }
  trust: {
    accountPotential: DataTrustMeta
    accountReach: DataTrustMeta
    accountMomentum30d: DataTrustMeta
    commandCenterPriority: DataTrustMeta
    sectorWindowLedger: DataTrustMeta
  }
}

type LooseQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>
type LooseSelectable<T> = LooseQuery<T> & {
  order(column: string, options?: { ascending?: boolean }): LooseQuery<T>
}
type LooseTable = {
  select<T>(columns: string): LooseSelectable<T>
}
type LooseClient = {
  from(table: string): LooseTable
}

type CompanyRow = {
  id: string
  name: string
  sector: string | null
  sector_id: string | null
  lifecycle_status: string
  priority: string
  ai_score: number | string | null
  knowledge_state: string
  health: string | null
  updated_at: string
}

type ContactRow = {
  company_id: string | null
  relationship_role: string | null
  decision_power: string | null
}

type InteractionRow = {
  company_id: string | null
  type: string
  occurred_at: string
}

type CalendarEventRow = {
  company_id: string | null
  event_type: string
  starts_at: string
  status: string
}

type OpportunityRow = {
  company_id: string | null
  stage: string | null
  weighted_gain: number | string | null
}

type IntelligenceSummaryRow = {
  company_id: string | null
  has_client_analysis: boolean | null
  has_sector_analysis: boolean | null
  has_process_diagnostic: boolean | null
  has_roadmap: boolean | null
  has_legacy_analysis: boolean | null
  has_legacy_sector: boolean | null
  has_legacy_pitches: boolean | null
  latest_run_at: string | null
  latest_run_status: string | null
  count_runs: number | null
  count_results: number | null
}

type SectorRow = {
  id: string
  slug: string
  name: string
  status: string
  attractiveness_score: number | string | null
  digital_maturity: string | null
  practices_fit: unknown
}

type SectorEventRow = {
  id: string
  sector_id: string
  title: string
  event_type: string
  event_date: string | null
  commercial_opportunity: string | null
  status: string
}

type SectorNewsRow = {
  id: string
  sector_id: string
  title: string
  published_at: string | null
  summary: string | null
  is_trigger_event: boolean
  relevance_score: number | string | null
}

type SectorRegulatoryRow = {
  id: string
  sector_id: string
  name: string
  urgency: string
  deadline_date: string | null
  commercial_angle: string | null
  is_commercial_window: boolean
  kredo_practice: string | null
}

const PERIODS: readonly DashboardLabPeriod[] = ["30d", "90d", "180d"]
const PERIOD_DAY_COUNT: Record<DashboardLabPeriod, number> = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
}
const DAY_MS = 24 * 60 * 60 * 1000
const EMPTY_DATE_LABEL = "Aucune donnée récente"
const PRACTICE_LABELS = ["Data & AI", "Cloud Eng", "Product", "Cyber"] as const
const MOMENTUM_MONTHLY_SATURATION_POINTS = 24

const COMMERCIAL_CALENDAR_WEIGHTS: Partial<Record<string, number>> = {
  rdv_prospection: 7,
  appel_prospection: 5,
  mailing_prospection: 2,
  rdv_client_suivi: 4,
  soutenance: 8,
  atelier_client: 6,
  appel_qualification: 5,
}

const COMMERCIAL_INTERACTION_WEIGHTS: Partial<Record<string, number>> = {
  proposition: 5,
  relance: 3,
  signature: 6,
  entretien_client: 4,
}

const COMMITTEE_ROLE_WEIGHTS: Record<string, number> = {
  decideur: 25,
  sponsor: 20,
  prescripteur: 15,
  acheteur: 15,
  dsi: 10,
  direction_metier: 8,
  manager_technique: 8,
  operationnel: 5,
  utilisateur_final: 4,
  rh: 4,
}

function asNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function percentage(part: number, total: number) {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function latestDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => getTimestamp(value))
    .filter((value): value is number => value !== null)

  if (timestamps.length === 0) return null
  return new Date(Math.max(...timestamps)).toISOString()
}

function latestDateFromTimestamps(values: Array<number | null | undefined>) {
  const timestamps = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  if (timestamps.length === 0) return null
  return new Date(Math.max(...timestamps)).toISOString()
}

function freshnessLabel(value: string | null) {
  return value ? formatDateTime(value) : EMPTY_DATE_LABEL
}

function lifecycleBonus(lifecycle: string) {
  if (lifecycle === "prospect") return 10
  if (lifecycle === "ancien_client") return 6
  if (lifecycle === "client_actif") return 4
  return 0
}

function priorityBonus(priority: string) {
  if (priority === "haute") return 20
  if (priority === "normale") return 10
  return 0
}

function classifyRelativeTimestamp(value: string, periodDays: number, now: number) {
  const timestamp = getTimestamp(value)
  if (timestamp === null) return "out"

  const age = now - timestamp
  const periodMs = periodDays * DAY_MS

  if (age >= 0 && age <= periodMs) return "past"
  if (age < 0 && Math.abs(age) <= periodMs) return "future"
  return "out"
}

function monthlyEquivalentPoints(rawPoints: number, periodDays: number) {
  if (periodDays <= 0) return 0
  return rawPoints * 30 / periodDays
}

function momentumFromMonthlyEquivalent(points: number) {
  return clamp(Math.round((points / MOMENTUM_MONTHLY_SATURATION_POINTS) * 100))
}

function normalizeStatus(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function isCancelledStatus(value: string | null | undefined) {
  const normalized = normalizeStatus(value)
  return normalized === "cancelled" || normalized === "canceled" || normalized === "annule" || normalized === "annulé"
}

function isCompletedStatus(value: string | null | undefined) {
  return normalizeStatus(value) === "completed"
}

function evaluatePotentialOrigin(params: {
  aiScore: number | null
  knowledgeState: string
  hasNative: boolean
  hasLegacy: boolean
}): DashboardLabAccount["potentialOrigin"] {
  const { aiScore, knowledgeState, hasNative, hasLegacy } = params
  if (aiScore === null) {
    return {
      primaryOrigin: "PROXY",
      origins: ["PROXY"],
    }
  }

  const normalizedKnowledgeState = knowledgeState.trim().toLowerCase()
  const indicatesLegacy = normalizedKnowledgeState.includes("legacy") || normalizedKnowledgeState.includes("folio")
  const indicatesNative = normalizedKnowledgeState.includes("native") || normalizedKnowledgeState.includes("workspace")

  if (hasLegacy || (!hasNative && indicatesLegacy)) {
    return {
      primaryOrigin: "REAL_LEGACY",
      origins: hasNative || indicatesNative
        ? ["REAL_LEGACY", "REAL_NATIVE", "PROXY"]
        : ["REAL_LEGACY", "PROXY"],
    }
  }

  if (hasNative || indicatesNative) {
    return {
      primaryOrigin: "REAL_NATIVE",
      origins: ["REAL_NATIVE", "PROXY"],
    }
  }

  return {
    primaryOrigin: "REAL_LEGACY",
    origins: ["REAL_LEGACY", "PROXY"],
  }
}

function actionDecision(params: {
  potentialScore: number
  reachScore: number
  momentumScore: number
  openOpportunityCount: number
  plannedCommercialEngagement: number
}) {
  const {
    potentialScore,
    reachScore,
    momentumScore,
    openOpportunityCount,
    plannedCommercialEngagement,
  } = params

  if (potentialScore >= 75 && reachScore < 35 && plannedCommercialEngagement === 0) {
    return "Identifier un décideur et sécuriser un premier échange qualifié."
  }
  if (potentialScore >= 75 && reachScore < 50 && momentumScore >= 25) {
    return "Consolider la couverture du comité avant de multiplier les touches."
  }
  if (openOpportunityCount > 0 && momentumScore >= 35) {
    return "Transformer les échanges actifs en qualification formelle."
  }
  if (momentumScore < 20 && plannedCommercialEngagement > 0) {
    return "Préparer le prochain engagement planifié pour recréer une conversation utile."
  }
  if (momentumScore < 20) {
    return "Relancer le compte avant refroidissement du signal commercial."
  }
  return "Consolider la relation active et préparer le prochain angle d'approche."
}

function topPractice(practicesFit: Record<string, number>): "Data & AI" | "Cloud Eng" | "Product" | "Cyber" {
  const entries = PRACTICE_LABELS.map((label) => [label, practicesFit[label] ?? 0] as const)
  return entries.sort((left, right) => right[1] - left[1])[0]?.[0] ?? "Data & AI"
}

function toPracticeMap(value: unknown): Record<"Data & AI" | "Cloud Eng" | "Product" | "Cyber", number> {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

  return {
    "Data & AI": asNumber(record.data_ai as number | string | null) ?? 0,
    "Cloud Eng": asNumber(record.cloud_eng as number | string | null) ?? 0,
    Product: asNumber(record.product as number | string | null) ?? 0,
    Cyber: asNumber(record.cyber as number | string | null) ?? 0,
  }
}

function unwrapQueryResult<T>(source: string, result: Awaited<LooseQuery<T>>) {
  if (result.error) {
    throw new Error(`Dashboard lab query failed for "${source}": ${result.error.message}`)
  }
  return result.data ?? []
}

function getRegulationUrgencyBaseScore(urgency: string) {
  if (urgency === "critical") return 95
  if (urgency === "high") return 80
  if (urgency === "medium") return 60
  return 35
}

function computeUpcomingState(dateValue: string | null, now: number): { state: WindowState; label: string } {
  const timestamp = getTimestamp(dateValue)
  if (timestamp === null) {
    return { state: "active", label: "À activer" }
  }

  const deltaDays = Math.ceil((timestamp - now) / DAY_MS)
  if (deltaDays < 0) {
    return { state: "expired", label: "Expirée" }
  }
  if (deltaDays <= 14) {
    return { state: "close", label: "Proche" }
  }
  if (deltaDays <= 45) {
    return { state: "active", label: "Active" }
  }
  return { state: "future", label: "Future" }
}

function computeNewsState(dateValue: string | null, now: number): { state: WindowState; label: string } {
  const timestamp = getTimestamp(dateValue)
  if (timestamp === null) {
    return { state: "active", label: "Signal actif" }
  }

  const ageDays = Math.floor((now - timestamp) / DAY_MS)
  if (ageDays < 0) {
    return { state: "future", label: "Publication à venir" }
  }
  if (ageDays <= 7) {
    return { state: "close", label: "Signal très récent" }
  }
  if (ageDays <= 30) {
    return { state: "active", label: "Signal actif" }
  }
  return { state: "expired", label: "Signal refroidi" }
}

function getAdjustedWindowUrgencyScore(baseScore: number, state: WindowState) {
  if (state === "expired") return 5
  if (state === "future") return Math.max(20, baseScore - 10)
  if (state === "close") return Math.min(100, baseScore + 5)
  return baseScore
}

function getUrgencyToneLabel(state: WindowState, sourceType: DashboardLabSectorWindow["sourceType"], baseLabel: string) {
  if (state === "expired") return sourceType === "regulation" ? "Deadline expirée" : "Fenêtre expirée"
  if (state === "close") return "Fenêtre proche"
  if (state === "future") return sourceType === "regulation" ? "Deadline future" : "Fenêtre future"
  return baseLabel
}

export const getDashboardLabData = cache(async (): Promise<DashboardLabData> => {
  const supabase = (await createClient()) as unknown as LooseClient

  const [
    companiesResult,
    contactsResult,
    interactionsResult,
    calendarResult,
    opportunitiesResult,
    intelligenceResult,
    sectorsResult,
    sectorEventsResult,
    sectorNewsResult,
    sectorRegulatoryResult,
  ] = await Promise.all([
    supabase.from("companies").select<CompanyRow>("id,name,sector,sector_id,lifecycle_status,priority,ai_score,knowledge_state,health,updated_at").order("name"),
    supabase.from("contacts").select<ContactRow>("company_id,relationship_role,decision_power"),
    supabase.from("interactions").select<InteractionRow>("company_id,type,occurred_at"),
    supabase.from("calendar_events").select<CalendarEventRow>("company_id,event_type,starts_at,status"),
    supabase.from("opportunities").select<OpportunityRow>("company_id,stage,weighted_gain"),
    supabase.from("v_ai_intelligence_summary").select<IntelligenceSummaryRow>("company_id,has_client_analysis,has_sector_analysis,has_process_diagnostic,has_roadmap,has_legacy_analysis,has_legacy_sector,has_legacy_pitches,latest_run_at,latest_run_status,count_runs,count_results"),
    supabase.from("sector_intelligence").select<SectorRow>("id,slug,name,status,attractiveness_score,digital_maturity,practices_fit"),
    supabase.from("sector_events").select<SectorEventRow>("id,sector_id,title,event_type,event_date,commercial_opportunity,status"),
    supabase.from("sector_news").select<SectorNewsRow>("id,sector_id,title,published_at,summary,is_trigger_event,relevance_score"),
    supabase.from("sector_regulatory_items").select<SectorRegulatoryRow>("id,sector_id,name,urgency,deadline_date,commercial_angle,is_commercial_window,kredo_practice"),
  ])

  const companies = unwrapQueryResult("companies", companiesResult)
  const contacts = unwrapQueryResult("contacts", contactsResult)
  const interactions = unwrapQueryResult("interactions", interactionsResult)
  const calendarEvents = unwrapQueryResult("calendar_events", calendarResult)
  const opportunities = unwrapQueryResult("opportunities", opportunitiesResult)
  const intelligenceRows = unwrapQueryResult("v_ai_intelligence_summary", intelligenceResult)
  const sectors = unwrapQueryResult("sector_intelligence", sectorsResult)
  const sectorEvents = unwrapQueryResult("sector_events", sectorEventsResult)
  const sectorNews = unwrapQueryResult("sector_news", sectorNewsResult)
  const sectorRegulatoryItems = unwrapQueryResult("sector_regulatory_items", sectorRegulatoryResult)

  const now = Date.now()
  const contactsByCompany = new Map<string, ContactRow[]>()
  const interactionsByCompany = new Map<string, InteractionRow[]>()
  const calendarByCompany = new Map<string, CalendarEventRow[]>()
  const opportunitiesByCompany = new Map<string, OpportunityRow[]>()
  const intelligenceByCompany = new Map<string, IntelligenceSummaryRow>()

  for (const contact of contacts) {
    if (!contact.company_id) continue
    const current = contactsByCompany.get(contact.company_id) ?? []
    current.push(contact)
    contactsByCompany.set(contact.company_id, current)
  }

  for (const interaction of interactions) {
    if (!interaction.company_id) continue
    const current = interactionsByCompany.get(interaction.company_id) ?? []
    current.push(interaction)
    interactionsByCompany.set(interaction.company_id, current)
  }

  for (const event of calendarEvents) {
    if (!event.company_id) continue
    const current = calendarByCompany.get(event.company_id) ?? []
    current.push(event)
    calendarByCompany.set(event.company_id, current)
  }

  for (const opportunity of opportunities) {
    if (!opportunity.company_id) continue
    const current = opportunitiesByCompany.get(opportunity.company_id) ?? []
    current.push(opportunity)
    opportunitiesByCompany.set(opportunity.company_id, current)
  }

  for (const row of intelligenceRows) {
    if (row.company_id) {
      intelligenceByCompany.set(row.company_id, row)
    }
  }

  const accounts = companies.map<DashboardLabAccount>((company) => {
    const accountContacts = contactsByCompany.get(company.id) ?? []
    const accountInteractions = interactionsByCompany.get(company.id) ?? []
    const accountCalendar = calendarByCompany.get(company.id) ?? []
    const accountOpportunities = opportunitiesByCompany.get(company.id) ?? []
    const intelligence = intelligenceByCompany.get(company.id)

    const committeeRoles = Array.from(
      new Set(accountContacts.map((contact) => contact.relationship_role).filter((value): value is string => Boolean(value))),
    )
    const committeeRoleCount = committeeRoles.filter((role) => ["decideur", "sponsor", "prescripteur", "acheteur"].includes(role)).length
    const decisionPowerCount = accountContacts.filter((contact) => Boolean(contact.decision_power)).length

    let interactionPoints30 = 0
    let interactionPoints90 = 0
    let interactionPoints180 = 0
    let rawInteractions30d = 0
    let rawInteractions90d = 0
    let rawInteractions180d = 0
    const interactionActivityTimestamps: number[] = []

    for (const interaction of accountInteractions) {
      const weight = COMMERCIAL_INTERACTION_WEIGHTS[interaction.type]
      if (!weight) continue
      const timestamp = getTimestamp(interaction.occurred_at)
      if (timestamp === null || timestamp > now) continue
      interactionActivityTimestamps.push(timestamp)

      if (classifyRelativeTimestamp(interaction.occurred_at, PERIOD_DAY_COUNT["180d"], now) === "past") {
        interactionPoints180 += weight
        rawInteractions180d += 1
      }
      if (classifyRelativeTimestamp(interaction.occurred_at, PERIOD_DAY_COUNT["90d"], now) === "past") {
        interactionPoints90 += weight
        rawInteractions90d += 1
      }
      if (classifyRelativeTimestamp(interaction.occurred_at, PERIOD_DAY_COUNT["30d"], now) === "past") {
        interactionPoints30 += weight
        rawInteractions30d += 1
      }
    }

    let calendarPoints30 = 0
    let calendarPoints90 = 0
    let calendarPoints180 = 0
    let rawCalendar30d = 0
    let rawCalendar90d = 0
    let rawCalendar180d = 0
    let plannedCommercialEngagement30d = 0
    let plannedCommercialEngagement90d = 0
    let plannedCommercialEngagement180d = 0
    const commercialActivityTimestamps: number[] = [...interactionActivityTimestamps]
    const plannedEngagementTimestamps: number[] = []

    for (const event of accountCalendar) {
      const weight = COMMERCIAL_CALENDAR_WEIGHTS[event.event_type]
      if (!weight || isCancelledStatus(event.status)) continue

      const classification30d = classifyRelativeTimestamp(event.starts_at, PERIOD_DAY_COUNT["30d"], now)
      const classification90d = classifyRelativeTimestamp(event.starts_at, PERIOD_DAY_COUNT["90d"], now)
      const classification180d = classifyRelativeTimestamp(event.starts_at, PERIOD_DAY_COUNT["180d"], now)
      const timestamp = getTimestamp(event.starts_at)

      if (isCompletedStatus(event.status)) {
        if (timestamp !== null && timestamp <= now) {
          commercialActivityTimestamps.push(timestamp)
        }

        if (classification180d === "past") {
          calendarPoints180 += weight
          rawCalendar180d += 1
        }
        if (classification90d === "past") {
          calendarPoints90 += weight
          rawCalendar90d += 1
        }
        if (classification30d === "past") {
          calendarPoints30 += weight
          rawCalendar30d += 1
        }
        continue
      }

      if (timestamp !== null && timestamp > now) {
        plannedEngagementTimestamps.push(timestamp)
      }

      if (classification180d === "future") {
        plannedCommercialEngagement180d += 1
      }
      if (classification90d === "future") {
        plannedCommercialEngagement90d += 1
      }
      if (classification30d === "future") {
        plannedCommercialEngagement30d += 1
      }
    }

    const potentialScore = clamp(
      Math.round(((company.ai_score ? Number(company.ai_score) : 0) / 5) * 70)
        + priorityBonus(company.priority)
        + lifecycleBonus(company.lifecycle_status),
    )

    const rolePresenceScore = committeeRoles.reduce((sum, role) => sum + (COMMITTEE_ROLE_WEIGHTS[role] ?? 0), 0)
    const contactDensityScore = Math.min(15, accountContacts.length * 2)
    const engagementRecencyScore = Math.min(
      25,
      (rawCalendar30d > 0 ? 15 : rawCalendar90d > 0 ? 8 : 0)
        + (rawInteractions30d > 0 ? 10 : rawInteractions90d > 0 ? 5 : 0),
    )
    const reachScore = clamp(rolePresenceScore + contactDensityScore + engagementRecencyScore)
    const reachGapScore = 100 - reachScore

    const monthlyPoints30d = monthlyEquivalentPoints(calendarPoints30 + interactionPoints30, PERIOD_DAY_COUNT["30d"])
    const monthlyPoints90d = monthlyEquivalentPoints(calendarPoints90 + interactionPoints90, PERIOD_DAY_COUNT["90d"])
    const monthlyPoints180d = monthlyEquivalentPoints(calendarPoints180 + interactionPoints180, PERIOD_DAY_COUNT["180d"])

    const momentumScore30d = momentumFromMonthlyEquivalent(monthlyPoints30d)
    const momentumScore90d = momentumFromMonthlyEquivalent(monthlyPoints90d)
    const momentumScore180d = momentumFromMonthlyEquivalent(monthlyPoints180d)

    const inactivityRiskScore30d = clamp(
      Math.round(
        potentialScore * 0.45
          + reachGapScore * 0.2
          + (100 - momentumScore30d) * 0.35,
      ),
    )
    const inactivityRiskScore90d = clamp(
      Math.round(
        potentialScore * 0.45
          + reachGapScore * 0.2
          + (100 - momentumScore90d) * 0.35,
      ),
    )
    const inactivityRiskScore180d = clamp(
      Math.round(
        potentialScore * 0.45
          + reachGapScore * 0.2
          + (100 - momentumScore180d) * 0.35,
      ),
    )

    const openOpportunities = accountOpportunities.filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage))
    const weightedPipeline = openOpportunities.reduce((sum, opportunity) => sum + (asNumber(opportunity.weighted_gain) ?? 0), 0)

    const actionPriorityScore30d = clamp(
      Math.round(
        potentialScore * 0.4
          + momentumScore30d * 0.25
          + reachGapScore * 0.2
          + inactivityRiskScore30d * 0.15,
      ),
    )
    const actionPriorityScore90d = clamp(
      Math.round(
        potentialScore * 0.4
          + momentumScore90d * 0.25
          + reachGapScore * 0.2
          + inactivityRiskScore90d * 0.15,
      ),
    )
    const actionPriorityScore180d = clamp(
      Math.round(
        potentialScore * 0.4
          + momentumScore180d * 0.25
          + reachGapScore * 0.2
          + inactivityRiskScore180d * 0.15,
      ),
    )

    const legacyCoverage = {
      hasClientAnalysis: Boolean(intelligence?.has_legacy_analysis),
      hasSectorAnalysis: Boolean(intelligence?.has_legacy_sector),
      hasPitches: Boolean(intelligence?.has_legacy_pitches),
    }
    const nativeCoverage = {
      hasClientAnalysis: Boolean(intelligence?.has_client_analysis),
      hasSectorAnalysis: Boolean(intelligence?.has_sector_analysis),
      hasProcessDiagnostic: Boolean(intelligence?.has_process_diagnostic),
      hasRoadmap: Boolean(intelligence?.has_roadmap),
      latestRunAt: intelligence?.latest_run_at ?? null,
      latestRunStatus: intelligence?.latest_run_status ?? null,
      countRuns: intelligence?.count_runs ?? 0,
      countResults: intelligence?.count_results ?? 0,
    }
    const potentialOrigin = evaluatePotentialOrigin({
      aiScore: asNumber(company.ai_score),
      knowledgeState: company.knowledge_state,
      hasNative: nativeCoverage.hasClientAnalysis || nativeCoverage.hasSectorAnalysis || nativeCoverage.hasProcessDiagnostic || nativeCoverage.hasRoadmap || nativeCoverage.countResults > 0,
      hasLegacy: legacyCoverage.hasClientAnalysis || legacyCoverage.hasSectorAnalysis || legacyCoverage.hasPitches,
    })

    return {
      id: company.id,
      name: company.name,
      sector: company.sector?.trim() || "Secteur non renseigné",
      sectorId: company.sector_id,
      lifecycle: company.lifecycle_status,
      priority: company.priority,
      aiScore: asNumber(company.ai_score),
      knowledgeState: company.knowledge_state,
      health: company.health,
      contactCount: accountContacts.length,
      committeeRoleCount,
      committeeRoles,
      decisionPowerCount,
      opportunityCount: accountOpportunities.length,
      openOpportunityCount: openOpportunities.length,
      weightedPipeline,
      latestCommercialActivityAt: latestDateFromTimestamps(commercialActivityTimestamps),
      latestPlannedEngagementAt: latestDateFromTimestamps(plannedEngagementTimestamps),
      latestIntelligenceAt: intelligence?.latest_run_at ?? null,
      latestDataUpdateAt: company.updated_at,
      activity30d: rawCalendar30d + rawInteractions30d,
      activity90d: rawCalendar90d + rawInteractions90d,
      activity180d: rawCalendar180d + rawInteractions180d,
      interactions30d: rawInteractions30d,
      interactions90d: rawInteractions90d,
      interactions180d: rawInteractions180d,
      calendar30d: rawCalendar30d,
      calendar90d: rawCalendar90d,
      calendar180d: rawCalendar180d,
      plannedCommercialEngagement30d,
      plannedCommercialEngagement90d,
      plannedCommercialEngagement180d,
      potentialScore,
      potentialOrigin,
      reachScore,
      reachGapScore,
      momentumScore30d,
      momentumScore90d,
      momentumScore180d,
      monthlyEquivalentPoints30d: Math.round(monthlyPoints30d * 10) / 10,
      monthlyEquivalentPoints90d: Math.round(monthlyPoints90d * 10) / 10,
      monthlyEquivalentPoints180d: Math.round(monthlyPoints180d * 10) / 10,
      inactivityRiskScore30d,
      inactivityRiskScore90d,
      inactivityRiskScore180d,
      actionPriorityScore30d,
      actionPriorityScore90d,
      actionPriorityScore180d,
      nextDecision: actionDecision({
        potentialScore,
        reachScore,
        momentumScore: momentumScore30d,
        openOpportunityCount: openOpportunities.length,
        plannedCommercialEngagement: plannedCommercialEngagement30d,
      }),
      legacyCoverage,
      nativeCoverage,
    }
  }).sort((left, right) => right.potentialScore - left.potentialScore || left.name.localeCompare(right.name))

  const accountsBySectorId = new Map<string, DashboardLabAccount[]>()
  for (const account of accounts) {
    if (!account.sectorId) continue
    const current = accountsBySectorId.get(account.sectorId) ?? []
    current.push(account)
    accountsBySectorId.set(account.sectorId, current)
  }

  const sectorSummaries = sectors.map<DashboardLabSectorSummary>((sector) => {
    const practiceScores = toPracticeMap(sector.practices_fit)
    const linkedAccounts = accountsBySectorId.get(sector.id) ?? []
    const linkedReachScores = linkedAccounts.map((account) => account.reachScore)
    const linkedPotentialScores = linkedAccounts.map((account) => account.potentialScore)
    const windowsCount =
      sectorEvents.filter((event) => event.sector_id === sector.id && event.status === "pending").length
      + sectorNews.filter((item) => item.sector_id === sector.id && item.is_trigger_event).length
      + sectorRegulatoryItems.filter((item) => item.sector_id === sector.id && item.is_commercial_window).length

    return {
      id: sector.id,
      slug: sector.slug,
      name: sector.name,
      status: sector.status,
      attractivenessScore: asNumber(sector.attractiveness_score),
      digitalMaturity: sector.digital_maturity,
      topPractice: topPractice(practiceScores),
      practiceScores,
      linkedAccounts: linkedAccounts.length,
      windowsCount,
      avgReachScore: linkedReachScores.length > 0
        ? Math.round(linkedReachScores.reduce((sum, value) => sum + value, 0) / linkedReachScores.length)
        : null,
      avgPotentialScore: linkedPotentialScores.length > 0
        ? Math.round(linkedPotentialScores.reduce((sum, value) => sum + value, 0) / linkedPotentialScores.length)
        : null,
    }
  })

  const sectorById = new Map(sectorSummaries.map((sector) => [sector.id, sector]))
  const sectorWindows: DashboardLabSectorWindow[] = []

  for (const event of sectorEvents.filter((item) => item.status === "pending")) {
    const sector = sectorById.get(event.sector_id)
    if (!sector) continue
    const exposedAccounts = accountsBySectorId.get(event.sector_id) ?? []
    const state = computeUpcomingState(event.event_date, now)
    const baseUrgency = state.state === "close" ? 80 : state.state === "future" ? 55 : 70
    const urgencyScore = getAdjustedWindowUrgencyScore(baseUrgency, state.state)

    sectorWindows.push({
      id: `event-${event.id}`,
      sectorId: event.sector_id,
      sectorSlug: sector.slug,
      sectorName: sector.name,
      sourceType: "event",
      title: event.title,
      subtitle: event.commercial_opportunity ?? getOpportunityStageLabel("qualification"),
      eventAt: event.event_date,
      windowState: state.state,
      stateLabel: state.label,
      isCountedAsActive: state.state !== "expired",
      urgencyScore,
      urgencyLabel: getUrgencyToneLabel(state.state, "event", "Fenêtre événementielle"),
      recommendedPractice: sector.topPractice,
      exposedCompanyIds: exposedAccounts.map((account) => account.id),
      exposedCompanyNames: exposedAccounts.map((account) => account.name),
      avgReachScore: sector.avgReachScore,
      avgPotentialScore: sector.avgPotentialScore,
      suggestedAction: "Activer un angle commercial court et cibler un compte prioritaire par secteur.",
      meta: {
        id: `window-event-${event.id}`,
        label: "Fenêtre sectorielle",
        primaryOrigin: "REAL_NATIVE",
        origins: ["REAL_NATIVE", "PROXY"],
        formula: "sector_events en statut pending + practice suggérée déduite du meilleur fit sectoriel.",
        freshness: {
          latestAt: event.event_date,
          label: freshnessLabel(event.event_date),
        },
        completeness: {
          value: percentage(exposedAccounts.length, accounts.length),
          label: `${exposedAccounts.length}/${accounts.length} comptes reliés au secteur`,
        },
        limitations: [
          "Seuls les événements pending sont considérés comme activables.",
          "La practice suggérée reste une inférence à partir de practices_fit.",
        ],
      },
    })
  }

  for (const item of sectorNews.filter((news) => news.is_trigger_event)) {
    const sector = sectorById.get(item.sector_id)
    if (!sector) continue
    const exposedAccounts = accountsBySectorId.get(item.sector_id) ?? []
    const state = computeNewsState(item.published_at, now)
    const baseUrgency = clamp(Math.round((asNumber(item.relevance_score) ?? 0.5) * 100))
    const urgencyScore = getAdjustedWindowUrgencyScore(baseUrgency, state.state)

    sectorWindows.push({
      id: `news-${item.id}`,
      sectorId: item.sector_id,
      sectorSlug: sector.slug,
      sectorName: sector.name,
      sourceType: "news",
      title: item.title,
      subtitle: item.summary ?? "Signal de marché rattaché au secteur.",
      eventAt: item.published_at,
      windowState: state.state,
      stateLabel: state.label,
      isCountedAsActive: state.state !== "expired",
      urgencyScore,
      urgencyLabel: getUrgencyToneLabel(state.state, "news", baseUrgency >= 70 ? "Signal chaud" : "Signal à surveiller"),
      recommendedPractice: sector.topPractice,
      exposedCompanyIds: exposedAccounts.map((account) => account.id),
      exposedCompanyNames: exposedAccounts.map((account) => account.name),
      avgReachScore: sector.avgReachScore,
      avgPotentialScore: sector.avgPotentialScore,
      suggestedAction: "Valider si le signal ouvre une fenêtre d'introduction ou de relance rapide.",
      meta: {
        id: `window-news-${item.id}`,
        label: "Signal sectoriel",
        primaryOrigin: "REAL_NATIVE",
        origins: ["REAL_NATIVE", "PROXY"],
        formula: "News sectorielle marquée trigger event + score de pertinence converti en urgence.",
        freshness: {
          latestAt: item.published_at,
          label: freshnessLabel(item.published_at),
        },
        completeness: {
          value: percentage(exposedAccounts.length, accounts.length),
          label: `${exposedAccounts.length}/${accounts.length} comptes exposés`,
        },
        limitations: [
          "Le lien au compte reste indirect tant que account_signals n'est pas alimenté.",
          "Un signal de news vieillit vite et peut être expiré sans disparaître du ledger.",
        ],
      },
    })
  }

  for (const item of sectorRegulatoryItems.filter((regulation) => regulation.is_commercial_window)) {
    const sector = sectorById.get(item.sector_id)
    if (!sector) continue
    const exposedAccounts = accountsBySectorId.get(item.sector_id) ?? []
    const state = computeUpcomingState(item.deadline_date, now)
    const baseUrgency = getRegulationUrgencyBaseScore(item.urgency)
    const urgencyScore = getAdjustedWindowUrgencyScore(baseUrgency, state.state)

    sectorWindows.push({
      id: `reg-${item.id}`,
      sectorId: item.sector_id,
      sectorSlug: sector.slug,
      sectorName: sector.name,
      sourceType: "regulation",
      title: item.name,
      subtitle: item.commercial_angle ?? "Fenêtre réglementaire à convertir en angle commercial.",
      eventAt: item.deadline_date,
      windowState: state.state,
      stateLabel: state.label,
      isCountedAsActive: state.state !== "expired",
      urgencyScore,
      urgencyLabel: getUrgencyToneLabel(state.state, "regulation", state.state === "close" ? "Deadline proche" : "Fenêtre encadrée"),
      recommendedPractice: item.kredo_practice === "cyber"
        ? "Cyber"
        : item.kredo_practice === "product"
          ? "Product"
          : item.kredo_practice === "cloud_eng"
            ? "Cloud Eng"
            : "Data & AI",
      exposedCompanyIds: exposedAccounts.map((account) => account.id),
      exposedCompanyNames: exposedAccounts.map((account) => account.name),
      avgReachScore: sector.avgReachScore,
      avgPotentialScore: sector.avgPotentialScore,
      suggestedAction: "Préempter le sujet avant arbitrage, avec un playbook court orienté conformité et delivery.",
      meta: {
        id: `window-reg-${item.id}`,
        label: "Fenêtre réglementaire",
        primaryOrigin: "REAL_NATIVE",
        origins: ["REAL_NATIVE"],
        formula: "Item réglementaire réel avec urgence mappée critical/high/medium/low et état temporel de la deadline.",
        freshness: {
          latestAt: item.deadline_date,
          label: freshnessLabel(item.deadline_date),
        },
        completeness: {
          value: percentage(exposedAccounts.length, accounts.length),
          label: `${exposedAccounts.length}/${accounts.length} comptes reliés au secteur`,
        },
        limitations: [
          "Les deadlines expirées restent consultables mais sont exclues du KPI des fenêtres actives.",
          "Aucune recommandation compte-native n'est encore reliée à ce déclencheur.",
        ],
      },
    })
  }

  sectorWindows.sort((left, right) => {
    const urgencyDelta = right.urgencyScore - left.urgencyScore
    if (urgencyDelta !== 0) return urgencyDelta
    return new Date(right.eventAt ?? 0).getTime() - new Date(left.eventAt ?? 0).getTime()
  })

  const scoredAccounts = accounts.filter((account) => account.aiScore !== null).length
  const accountsWithCommitteeRole = accounts.filter((account) => account.committeeRoleCount > 0).length
  const accountsLinkedToSectorIntelligence = accounts.filter((account) => account.sectorId !== null).length
  const nativeIntelligenceAccounts = accounts.filter((account) =>
    account.nativeCoverage.hasProcessDiagnostic
    || account.nativeCoverage.hasClientAnalysis
    || account.nativeCoverage.hasSectorAnalysis
    || account.nativeCoverage.hasRoadmap,
  ).length
  const legacyIntelligenceAccounts = accounts.filter((account) =>
    account.legacyCoverage.hasClientAnalysis
    || account.legacyCoverage.hasSectorAnalysis
    || account.legacyCoverage.hasPitches,
  ).length
  const nativePotentialAccounts = accounts.filter((account) => account.potentialOrigin.primaryOrigin === "REAL_NATIVE").length
  const legacyPotentialAccounts = accounts.filter((account) => account.potentialOrigin.primaryOrigin === "REAL_LEGACY").length
  const proxyPotentialAccounts = accounts.filter((account) => account.potentialOrigin.primaryOrigin === "PROXY").length

  const latestCommercialActivity = latestDate(accounts.map((account) => account.latestCommercialActivityAt))
  const latestCommercialOrPlanned = latestDate(
    accounts.flatMap((account) => [account.latestCommercialActivityAt, account.latestPlannedEngagementAt]),
  )
  const latestPotentialEvidence = latestDate(
    accounts.flatMap((account) => [account.latestIntelligenceAt, account.latestDataUpdateAt]),
  )

  return {
    generatedAt: new Date().toISOString(),
    periods: [...PERIODS],
    accounts,
    sectors: sectorSummaries.sort((left, right) => (right.attractivenessScore ?? 0) - (left.attractivenessScore ?? 0)),
    sectorWindows,
    metrics: {
      totalAccounts: accounts.length,
      scoredAccounts,
      accountsWithCommitteeRole,
      accountsLinkedToSectorIntelligence,
      realNativeWindowCount: sectorWindows.filter((window) => window.isCountedAsActive).length,
      nativeIntelligenceAccounts,
      legacyIntelligenceAccounts,
    },
    filterOptions: {
      sectors: Array.from(new Set(accounts.map((account) => account.sector))).sort((left, right) => left.localeCompare(right)),
      lifecycles: Array.from(new Set(accounts.map((account) => account.lifecycle))).sort((left, right) => left.localeCompare(right)),
      priorities: Array.from(new Set(accounts.map((account) => account.priority))).sort((left, right) => left.localeCompare(right)),
    },
    trust: {
      accountPotential: {
        id: "account-potential",
        label: "Potentiel compte",
        primaryOrigin: "REAL_LEGACY",
        origins: ["REAL_LEGACY", "REAL_NATIVE", "PROXY"],
        formula: "ai_score réel, classé conservativement natif ou legacy selon knowledge_state et couverture d'intelligence, puis bonus priorité + bonus lifecycle.",
        freshness: {
          latestAt: latestPotentialEvidence,
          label: freshnessLabel(latestPotentialEvidence),
        },
        completeness: {
          value: percentage(scoredAccounts, accounts.length),
          label: `${scoredAccounts}/${accounts.length} comptes scorés · ${legacyPotentialAccounts} legacy / ${nativePotentialAccounts} natifs / ${proxyPotentialAccounts} proxy`,
        },
        limitations: [
          "La provenance exacte du champ ai_score n'est pas historisée ligne à ligne.",
          "La classification natif vs legacy reste prudente et bascule en legacy dès qu'un patrimoine historique est détecté.",
        ],
      },
      accountReach: {
        id: "account-reach",
        label: "Reach commercial",
        primaryOrigin: "PROXY",
        origins: ["REAL_NATIVE", "PROXY"],
        formula: "Présence des rôles de comité + densité contacts + récence d'activité commerciale réalisée.",
        freshness: {
          latestAt: latestCommercialOrPlanned,
          label: freshnessLabel(latestCommercialOrPlanned),
        },
        completeness: {
          value: percentage(accountsWithCommitteeRole, accounts.length),
          label: `${accountsWithCommitteeRole}/${accounts.length} comptes avec au moins un rôle comité`,
        },
        limitations: [
          "Mesure de présence et de récence, pas de force politique réelle.",
          "decision_power est vide et company_relationships n'est pas alimenté.",
        ],
      },
      accountMomentum30d: {
        id: "account-momentum-30d",
        label: "Momentum 30 jours",
        primaryOrigin: "PROXY",
        origins: ["REAL_NATIVE", "PROXY"],
        formula: "calendar_events commerce en status completed + interactions commerciales autorisées. Normalisation : rawPoints × 30 / jours de période, puis saturation à 24 points mensuels = 100.",
        freshness: {
          latestAt: latestCommercialActivity,
          label: freshnessLabel(latestCommercialActivity),
        },
        completeness: {
          value: percentage(accounts.filter((account) => account.activity30d > 0).length, accounts.length),
          label: `${accounts.filter((account) => account.activity30d > 0).length}/${accounts.length} comptes avec activité commerciale 30j`,
        },
        limitations: [
          "Les événements planifiés n'entrent jamais dans le momentum réalisé.",
          "Les interactions de workflow, notes libres et types inconnus sont exclus.",
        ],
      },
      commandCenterPriority: {
        id: "command-priority",
        label: "Priorité d'action",
        primaryOrigin: "PROXY",
        origins: ["REAL_NATIVE", "REAL_LEGACY", "PROXY"],
        formula: "Potentiel 40% + momentum normalisé de la période 25% + gap de reach 20% + risque d'inactivité de la même période 15%.",
        freshness: {
          latestAt: latestDate(accounts.flatMap((account) => [account.latestCommercialActivityAt, account.latestIntelligenceAt])),
          label: freshnessLabel(latestDate(accounts.flatMap((account) => [account.latestCommercialActivityAt, account.latestIntelligenceAt]))),
        },
        completeness: {
          value: percentage(
            accounts.filter((account) => account.aiScore !== null && (account.legacyCoverage.hasClientAnalysis || account.nativeCoverage.countResults > 0)).length,
            accounts.length,
          ),
          label: `${accounts.filter((account) => account.aiScore !== null && (account.legacyCoverage.hasClientAnalysis || account.nativeCoverage.countResults > 0)).length}/${accounts.length} comptes avec score et contexte`,
        },
        limitations: [
          "La recommandation reste partiellement alimentée par du contexte legacy.",
          "Les signaux compte-natifs futurs restent absents hors mode démonstration.",
        ],
      },
      sectorWindowLedger: {
        id: "sector-window-ledger",
        label: "Fenêtres sectorielles",
        primaryOrigin: "REAL_NATIVE",
        origins: ["REAL_NATIVE", "PROXY"],
        formula: "sector_events pending, sector_news trigger et regulatory_items commerciaux réels, chacun enrichi d'un état temporel et d'un playbook suggéré.",
        freshness: {
          latestAt: latestDate(sectorWindows.map((window) => window.eventAt)),
          label: freshnessLabel(latestDate(sectorWindows.map((window) => window.eventAt))),
        },
        completeness: {
          value: percentage(accountsLinkedToSectorIntelligence, accounts.length),
          label: `${accountsLinkedToSectorIntelligence}/${accounts.length} comptes reliés aux secteurs intelligencés`,
        },
        limitations: [
          "La couverture réelle porte encore sur une fraction du portefeuille via sector_id.",
          "Les fenêtres expirées restent visibles mais sont exclues du KPI actif.",
        ],
      },
    },
  }
})

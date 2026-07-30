import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { formatDateTime } from "@/lib/formatters"
import { getOpportunityStageLabel } from "@/lib/opportunities/stages"
import {
  buildProspectionPortfolioAccounts,
  PROSPECTION_PERIODS,
  type DataOrigin,
  type DataTrustMeta,
  type PortfolioCalendarEventRow as CalendarEventRow,
  type PortfolioCompanyRow as CompanyRow,
  type PortfolioContactRow as ContactRow,
  type PortfolioIntelligenceSummaryRow as IntelligenceSummaryRow,
  type PortfolioInteractionRow as InteractionRow,
  type PortfolioOpportunityRow as OpportunityRow,
  type ProspectionPeriod as DashboardLabPeriod,
  type ProspectionPortfolioAccount as DashboardLabAccount,
} from "@/lib/prospection/portfolio-account-metrics"

export type { DataOrigin, DataTrustMeta, DashboardLabAccount, DashboardLabPeriod }

export type WindowState = "active" | "future" | "close" | "expired"

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

const DAY_MS = 24 * 60 * 60 * 1000
const PRACTICE_LABELS = ["Data & AI", "Cloud Eng", "Product", "Cyber"] as const

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

function freshnessLabel(value: string | null) {
  return value ? formatDateTime(value) : "Aucune donnée récente"
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
    supabase.from("companies").select<CompanyRow>("id,name,sector,sector_id,lifecycle_status,priority,legacy_folio_score,knowledge_state,health,updated_at").order("name"),
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
  const portfolio = buildProspectionPortfolioAccounts({
    companies,
    contacts,
    interactions,
    calendarEvents,
    opportunities,
    intelligenceRows,
    now,
  })
  const { accounts, filterOptions, metrics, trust } = portfolio

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

  return {
    generatedAt: new Date().toISOString(),
    periods: [...PROSPECTION_PERIODS],
    accounts,
    sectors: sectorSummaries.sort((left, right) => (right.attractivenessScore ?? 0) - (left.attractivenessScore ?? 0)),
    sectorWindows,
    metrics: {
      totalAccounts: metrics.totalAccounts,
      scoredAccounts: metrics.scoredAccounts,
      accountsWithCommitteeRole: metrics.accountsWithCommitteeRole,
      accountsLinkedToSectorIntelligence: metrics.accountsLinkedToSectorIntelligence,
      realNativeWindowCount: sectorWindows.filter((window) => window.isCountedAsActive).length,
      nativeIntelligenceAccounts: metrics.nativeIntelligenceAccounts,
      legacyIntelligenceAccounts: metrics.legacyIntelligenceAccounts,
    },
    filterOptions,
    trust: {
      accountPotential: trust.accountPotential,
      accountReach: trust.accountReach,
      accountMomentum30d: trust.accountMomentum30d,
      commandCenterPriority: trust.commandCenterPriority,
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
          value: percentage(metrics.accountsLinkedToSectorIntelligence, accounts.length),
          label: `${metrics.accountsLinkedToSectorIntelligence}/${accounts.length} comptes reliés aux secteurs intelligencés`,
        },
        limitations: [
          "La couverture réelle porte encore sur une fraction du portefeuille via sector_id.",
          "Les fenêtres expirées restent visibles mais sont exclues du KPI actif.",
        ],
      },
    },
  }
})

import type { PracticeKey, SectorStatus } from "@/types/sector"
import type { SectorKnowledgeReadModel, SectorKnowledgePainPointItem } from "@/features/master-study/data/get-sector-knowledge-read-model"
import type { ProspectionPortfolioAccount } from "@/lib/prospection/portfolio-account-metrics"
import {
  SECTOR_ACTIVATION_PRACTICE_LABELS,
  type SectorActivationFilterOptions,
  type SectorActivationFreshnessBand,
  type SectorActivationPriorityBand,
  type SectorActivationSector,
  type SectorActivationSourceType,
  type SectorActivationState,
  type SectorActivationTemporalStatus,
  type SectorActivationWindow,
} from "@/lib/prospection/sector-activation-types"

const DAY_MS = 24 * 60 * 60 * 1000
const NEWS_RELEVANCE_THRESHOLD = 0.4
const PRIORITY_ORDER: Record<SectorActivationTemporalStatus, number> = {
  close: 0,
  active: 1,
  future: 2,
  undated: 3,
  expired: 4,
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  regulatory: "Événement réglementaire",
  market: "Signal de marché",
  competitor: "Signal concurrentiel",
  appointment: "Rendez-vous",
  tender: "Appel d'offres",
  report: "Publication sectorielle",
  other: "Signal sectoriel",
}

const REGULATORY_URGENCY_SCORES: Record<string, number> = {
  critical: 95,
  high: 80,
  medium: 60,
  low: 35,
}

function asNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function parsePracticesFit(value: unknown): Record<PracticeKey, number> {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

  return {
    data_ai: asNumber(record.data_ai as number | string | null) ?? 0,
    cloud_eng: asNumber(record.cloud_eng as number | string | null) ?? 0,
    product: asNumber(record.product as number | string | null) ?? 0,
    cyber: asNumber(record.cyber as number | string | null) ?? 0,
  }
}

function sortPracticeEntries(practicesFit: Record<PracticeKey, number>) {
  return (Object.entries(practicesFit) as Array<[PracticeKey, number]>).toSorted(
    (left, right) => right[1] - left[1],
  )
}

function getTopPracticeKey(practicesFit: Record<PracticeKey, number>): PracticeKey {
  return sortPracticeEntries(practicesFit)[0]?.[0] ?? "data_ai"
}

function hasText(value: string | null | undefined): value is string {
  return Boolean(value && value.trim().length > 0)
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return null
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(dateOnlyMatch ? `${value}T00:00:00Z` : value)
  const timestamp = date.getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function getUtcDayIndex(timestamp: number) {
  const date = new Date(timestamp)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS
}

function getAgeDays(value: string | null, now: number) {
  const timestamp = getTimestamp(value)
  if (timestamp === null) return null
  return getUtcDayIndex(now) - getUtcDayIndex(timestamp)
}

function computeTemporalStatus(value: string | null, now: number): SectorActivationTemporalStatus {
  const timestamp = getTimestamp(value)
  if (timestamp === null) return "undated"
  const deltaDays = getUtcDayIndex(timestamp) - getUtcDayIndex(now)
  if (deltaDays < 0) return "expired"
  if (deltaDays <= 14) return "close"
  if (deltaDays <= 45) return "active"
  return "future"
}

function computeNewsTemporalStatus(value: string | null, now: number): SectorActivationTemporalStatus {
  const ageDays = getAgeDays(value, now)
  if (ageDays === null) return "undated"
  if (ageDays < 0) return "future"
  if (ageDays <= 30) return "active"
  return "expired"
}

function computeFreshnessBand(
  value: string | null,
  now: number,
): SectorActivationFreshnessBand {
  const ageDays = getAgeDays(value, now)
  if (ageDays === null) return "undated"
  if (ageDays < 0) return "future"
  if (ageDays <= 7) return "hot"
  if (ageDays <= 30) return "fresh"
  return "stale"
}

function getPriorityBand(urgencyScore: number): SectorActivationPriorityBand {
  if (urgencyScore >= 85) return "critical"
  if (urgencyScore >= 70) return "high"
  if (urgencyScore >= 50) return "medium"
  return "low"
}

function getWindowUrgencyScore(params: {
  sourceType: SectorActivationSourceType
  temporalStatus: SectorActivationTemporalStatus
  relevanceScore?: number | null
  urgency?: string | null
}) {
  const { sourceType, temporalStatus, relevanceScore, urgency } = params
  let baseScore = 55
  if (sourceType === "regulation") {
    baseScore = REGULATORY_URGENCY_SCORES[urgency ?? ""] ?? 35
  } else if (sourceType === "news") {
    baseScore = clamp(Math.round((relevanceScore ?? 0) * 100))
  } else if (temporalStatus === "close") {
    baseScore = 82
  } else if (temporalStatus === "active") {
    baseScore = 72
  } else if (temporalStatus === "future") {
    baseScore = 52
  } else if (temporalStatus === "undated") {
    baseScore = 40
  }

  if (temporalStatus === "expired") return 5
  if (temporalStatus === "close") return clamp(baseScore + 8)
  if (temporalStatus === "future") return clamp(baseScore - 8)
  return clamp(baseScore)
}

function getSourceLabel(
  sourceType: SectorActivationSourceType,
  row: { source?: string | null; authority?: string | null; event_type?: string | null },
): string {
  if (sourceType === "news") {
    const source = row.source
    return hasText(source) ? source : "Source non identifiée"
  }
  if (sourceType === "regulation") {
    const authority = row.authority
    return hasText(authority) ? authority : "Réglementation sectorielle"
  }
  return EVENT_TYPE_LABELS[row.event_type ?? ""] ?? "Signal sectoriel"
}

function pickPracticeKey(preferred: PracticeKey | "multi" | null, fallback: PracticeKey): PracticeKey {
  if (preferred === "data_ai" || preferred === "cloud_eng" || preferred === "product" || preferred === "cyber") {
    return preferred
  }
  return fallback
}

function getAccountsAverage(
  accounts: Array<{ [key: string]: unknown }>,
  field: string,
): number | null {
  if (accounts.length === 0) return null
  const total = accounts.reduce((sum, account) => sum + (Number(account[field]) || 0), 0)
  return Math.round(total / accounts.length)
}

function getPainPointSummary(
  painPoints: SectorKnowledgePainPointItem[],
  practiceKey: PracticeKey,
) {
  const matching = painPoints
    .filter((painPoint) => painPoint.kredoPractice === practiceKey || painPoint.kredoPractice === "multi")
    .toSorted((left, right) => right.frequencyCount - left.frequencyCount)

  return matching[0] ?? painPoints.toSorted((left, right) => right.frequencyCount - left.frequencyCount)[0] ?? null
}

function createSuggestedAction(params: {
  sourceType: SectorActivationSourceType
  practiceKey: PracticeKey
  practiceLabel: string
  temporalStatus: SectorActivationTemporalStatus
  title: string
  deadlineAt: string | null
  painPointTitle: string | null
}) {
  const { sourceType, practiceLabel, temporalStatus, deadlineAt, painPointTitle } = params
  const deadlineContext = hasText(deadlineAt) ? ` avant ${deadlineAt}` : ""

  if (sourceType === "regulation") {
    return `Cadrer une réponse ${practiceLabel}${deadlineContext} et qualifier un compte exposé.`
  }
  if (sourceType === "news") {
    return `Vérifier la matérialité du signal puis ouvrir une prise de contact ${practiceLabel.toLowerCase()} sur les comptes exposés.`
  }
  if (painPointTitle) {
    return `Qualifier le signal, relier ${painPointTitle.toLowerCase()} et proposer un atelier ${practiceLabel.toLowerCase()}.`
  }
  if (temporalStatus === "close") {
    return `Activer un playbook court ${practiceLabel.toLowerCase()} avant refroidissement de la fenêtre.`
  }
  return `Transformer le signal en hypothèse de besoin ${practiceLabel.toLowerCase()} sur un compte prioritaire.`
}

function createPlaybookSummary(params: {
  sourceType: SectorActivationSourceType
  practiceLabel: string
  painPointTitle: string | null
  commercialText: string | null
}) {
  const { sourceType, practiceLabel, painPointTitle, commercialText } = params
  if (hasText(commercialText)) return commercialText
  if (painPointTitle) {
    return `Angle ${practiceLabel} sur ${painPointTitle.toLowerCase()}.`
  }
  if (sourceType === "regulation") {
    return `Playbook de conformité et delivery ${practiceLabel.toLowerCase()}.`
  }
  if (sourceType === "news") {
    return `Playbook de qualification rapide ${practiceLabel.toLowerCase()}.`
  }
  return `Playbook d'activation ${practiceLabel.toLowerCase()} sur un compte exposé.`
}

function getSectorActivationState(params: {
  openWindowCount: number
  linkedAccountCount: number
  averageReachScore: number | null
  futureWindowCount: number
  undatedWindowCount: number
  expiredWindowCount: number
}): SectorActivationState {
  const {
    openWindowCount,
    linkedAccountCount,
    averageReachScore,
    futureWindowCount,
    undatedWindowCount,
    expiredWindowCount,
  } = params

  if (openWindowCount > 0 && (linkedAccountCount === 0 || averageReachScore === null || averageReachScore < 45)) {
    return "to_cover"
  }
  if (openWindowCount > 0) {
    return "to_activate"
  }
  if (futureWindowCount > 0 || undatedWindowCount > 0 || expiredWindowCount > 0) {
    return "to_monitor"
  }
  return "data_insufficient"
}

function compareWindows(left: SectorActivationWindow, right: SectorActivationWindow) {
  const statusDelta = PRIORITY_ORDER[left.temporalStatus] - PRIORITY_ORDER[right.temporalStatus]
  if (statusDelta !== 0) return statusDelta

  const urgencyDelta = right.urgencyScore - left.urgencyScore
  if (urgencyDelta !== 0) return urgencyDelta

  const leftDate = getTimestamp(left.deadlineAt ?? left.detectedAt)
  const rightDate = getTimestamp(right.deadlineAt ?? right.detectedAt)
  if (leftDate !== null && rightDate !== null && leftDate !== rightDate) {
    return leftDate - rightDate
  }
  if (leftDate === null && rightDate !== null) return 1
  if (leftDate !== null && rightDate === null) return -1

  if (left.exposedAccountCount !== right.exposedAccountCount) {
    return right.exposedAccountCount - left.exposedAccountCount
  }

  return (right.sectorAttractivenessScore ?? 0) - (left.sectorAttractivenessScore ?? 0)
}

type RawSourcesInput = {
  sectorRows?: Array<Record<string, unknown>>
  painPointRows?: Array<Record<string, unknown>>
  eventRows?: Array<Record<string, unknown>>
  newsRows?: Array<Record<string, unknown>>
  regulatoryRows?: Array<Record<string, unknown>>
}

function convertRawSourcesToReadModels(rawSources: RawSourcesInput): SectorKnowledgeReadModel[] {
  const { sectorRows = [], painPointRows = [], eventRows = [], newsRows = [], regulatoryRows = [] } = rawSources

  const painPointsBySectorId = new Map<string, Array<Record<string, unknown>>>()
  for (const pp of painPointRows) {
    const sid = String(pp.sector_id ?? "")
    const list = painPointsBySectorId.get(sid) ?? []
    list.push(pp)
    painPointsBySectorId.set(sid, list)
  }

  const eventsBySectorId = new Map<string, Array<Record<string, unknown>>>()
  for (const ev of eventRows) {
    const sid = String(ev.sector_id ?? "")
    const list = eventsBySectorId.get(sid) ?? []
    list.push(ev)
    eventsBySectorId.set(sid, list)
  }

  const newsBySectorId = new Map<string, Array<Record<string, unknown>>>()
  for (const nw of newsRows) {
    const sid = String(nw.sector_id ?? "")
    const list = newsBySectorId.get(sid) ?? []
    list.push(nw)
    newsBySectorId.set(sid, list)
  }

  const regulatoryBySectorId = new Map<string, Array<Record<string, unknown>>>()
  for (const rg of regulatoryRows) {
    const sid = String(rg.sector_id ?? "")
    const list = regulatoryBySectorId.get(sid) ?? []
    list.push(rg)
    regulatoryBySectorId.set(sid, list)
  }

  return sectorRows.map((sector) => {
    const sectorId = String(sector.id ?? "")
    const pps = (painPointsBySectorId.get(sectorId) ?? []).map((pp) => ({
      id: String(pp.id ?? ""),
      title: String(pp.title ?? ""),
      description: typeof pp.description === "string" ? pp.description : null,
      frequencyCount: Number(pp.frequency_count ?? 0),
      kredoPractice: typeof pp.kredo_practice === "string" ? pp.kredo_practice : null,
      verbatim: typeof pp.verbatim === "string" ? pp.verbatim : null,
      sourceCompanyIds: Array.isArray(pp.source_company_ids) ? (pp.source_company_ids as string[]) : [],
      resolvedLevel: (pp.resolved_level === "macro" ? "macro" : "segment") as "segment" | "macro",
    }))

    const evs = (eventsBySectorId.get(sectorId) ?? []).map((ev) => ({
      id: String(ev.id ?? ""),
      title: String(ev.title ?? ""),
      description: typeof ev.description === "string" ? ev.description : null,
      eventType: typeof ev.event_type === "string" ? ev.event_type : "autre",
      eventDate: typeof ev.event_date === "string" ? ev.event_date : null,
      eventStatus: typeof ev.status === "string" ? ev.status : "pending",
      sourceUrl: typeof ev.source_url === "string" ? ev.source_url : null,
      commercialOpportunity: typeof ev.commercial_opportunity === "string" ? ev.commercial_opportunity : null,
      resolvedLevel: (ev.resolved_level === "macro" ? "macro" : "segment") as "segment" | "macro",
      createdAt: typeof ev.created_at === "string" ? ev.created_at : null,
      updatedAt: typeof ev.updated_at === "string" ? ev.updated_at : null,
    }))

    const nws = (newsBySectorId.get(sectorId) ?? []).map((nw) => ({
      id: String(nw.id ?? ""),
      title: String(nw.title ?? ""),
      source: typeof nw.source === "string" ? nw.source : null,
      url: typeof nw.url === "string" ? nw.url : null,
      summary: typeof nw.summary === "string" ? nw.summary : null,
      publishedAt: typeof nw.published_at === "string" ? nw.published_at : null,
      relevanceScore: asNumber(nw.relevance_score as number | string | null),
      isTriggerEvent: Boolean(nw.is_trigger_event),
      resolvedLevel: (nw.resolved_level === "macro" ? "macro" : "segment") as "segment" | "macro",
    }))

    const rgs = (regulatoryBySectorId.get(sectorId) ?? []).map((rg) => ({
      id: String(rg.id ?? ""),
      name: String(rg.name ?? rg.title ?? ""),
      authority: typeof rg.authority === "string" ? rg.authority : null,
      description: typeof rg.description === "string" ? rg.description : null,
      deadlineDate: typeof rg.deadline_date === "string" ? rg.deadline_date : null,
      urgency: typeof rg.urgency === "string" ? rg.urgency : "normal",
      kredoPractice: typeof rg.kredo_practice === "string" ? rg.kredo_practice : null,
      commercialAngle: typeof rg.commercial_angle === "string" ? rg.commercial_angle : null,
      isCommercialWindow: Boolean(rg.is_commercial_window),
      sourceUrl: typeof rg.source_url === "string" ? rg.source_url : null,
      resolvedLevel: (rg.resolved_level === "macro" ? "macro" : "segment") as "segment" | "macro",
      createdAt: typeof rg.created_at === "string" ? rg.created_at : null,
      updatedAt: typeof rg.updated_at === "string" ? rg.updated_at : null,
    }))

    const rawStatus = typeof sector.status === "string" ? sector.status : "development"
    const validStatus: SectorStatus = rawStatus === "active" ? "active" : rawStatus === "watch" ? "watch" : "development"

    return {
      segmentId: sectorId,
      segmentName: String(sector.name ?? ""),
      segmentSlug: String(sector.slug ?? ""),
      segmentStatus: validStatus,
      macroId: typeof sector.macro_id === "string" ? sector.macro_id : null,
      macroName: typeof sector.macro_name === "string" ? sector.macro_name : null,
      macroSlug: typeof sector.macro_slug === "string" ? sector.macro_slug : null,
      macroStatus: typeof sector.macro_status === "string" ? sector.macro_status : null,
      description: typeof sector.description === "string" ? sector.description : null,
      descriptionLevel: (sector.description_level === "macro" ? "macro" : "segment") as "segment" | "macro" | "locked",
      attractivenessScore: asNumber(sector.attractiveness_score as number | string | null),
      attractivenessScoreLevel: "segment",
      marketSizeEurBn: asNumber(sector.market_size_eur_bn as number | string | null),
      marketSizeEurBnLevel: "segment",
      marketGrowthPct: asNumber(sector.market_growth_pct as number | string | null),
      marketGrowthPctLevel: "segment",
      playbook: (sector.playbook && typeof sector.playbook === "object" ? (sector.playbook as Record<string, unknown>) : null),
      playbookLevel: "segment",
      practicesFit: (sector.practices_fit && typeof sector.practices_fit === "object" ? (sector.practices_fit as Record<string, unknown>) : null),
      practicesFitLevel: "segment",
      keyPlayersPaca: sector.key_players_paca ?? [],
      keyPlayersNational: sector.key_players_national ?? [],
      hasSegmentKnowledge: Boolean(sector.has_segment_knowledge ?? true),
      digitalMaturity: typeof sector.digital_maturity === "string" ? sector.digital_maturity : null,
      avgTjmMin: asNumber(sector.avg_tjm_min as number | string | null),
      avgTjmMax: asNumber(sector.avg_tjm_max as number | string | null),
      caveats: sector.caveats ?? null,
      sourceRunId: typeof sector.source_run_id === "string" ? sector.source_run_id : null,
      studySnapshotDate: typeof sector.study_snapshot_date === "string" ? sector.study_snapshot_date : null,
      effectiveStatus: validStatus,

      items: {
        painPoints: pps,
        events: evs,
        news: nws,
        regulatory: rgs,
      },
      painPoints: pps,
      events: evs,
      news: nws,
      regulatory: rgs,
    }
  })
}

export function buildSectorActivationModel(
  snapshot: {
    accounts?: Array<Partial<ProspectionPortfolioAccount>>
    sectorKnowledgeModels?: SectorKnowledgeReadModel[]
    _rawSources?: RawSourcesInput
  },
  options: { now: number },
): { sectors: SectorActivationSector[]; windows: SectorActivationWindow[]; filterOptions: SectorActivationFilterOptions } {
  const { now } = options
  const accounts = snapshot.accounts ?? []

  let sectorKnowledgeModels = snapshot.sectorKnowledgeModels
  if (!sectorKnowledgeModels && snapshot._rawSources) {
    sectorKnowledgeModels = convertRawSourcesToReadModels(snapshot._rawSources)
  }

  if (!sectorKnowledgeModels || sectorKnowledgeModels.length === 0) {
    return {
      sectors: [],
      windows: [],
      filterOptions: {
        sectors: [],
        practices: [],
        sourceTypes: [],
        priorityBands: [],
        temporalStatuses: [],
        statusFilters: [],
      },
    }
  }

  // LOT 4 : Groupement sur `account.segmentId` (le niveau réel de classification),
  // JAMAIS sur `account.sectorId` (la projection macro).
  const accountsBySegmentId = new Map<string, Array<Partial<ProspectionPortfolioAccount>>>()
  for (const account of accounts) {
    const segmentKey = account.segmentId ?? account.sectorId
    if (!segmentKey) continue
    const current = accountsBySegmentId.get(segmentKey) ?? []
    current.push(account)
    accountsBySegmentId.set(segmentKey, current)
  }

  const sectorMetrics: SectorActivationSector[] = sectorKnowledgeModels.map((model) => {
    const practiceScores = parsePracticesFit(model.practicesFit)
    const linkedAccounts = accountsBySegmentId.get(model.segmentId) ?? []
    const topPracticeKey = getTopPracticeKey(practiceScores)
    const coveredAccountCount = linkedAccounts.filter((account) => account.legacyFolioScore !== null && account.legacyFolioScore !== undefined).length
    const averagePotentialScore = getAccountsAverage(linkedAccounts as Array<{ [key: string]: unknown }>, "potentialScore")
    const averageReachScore = getAccountsAverage(linkedAccounts as Array<{ [key: string]: unknown }>, "reachScore")

    const linkedAccountIds = linkedAccounts
      .map((account) => account.id)
      .filter((id): id is string => typeof id === "string")

    const sectorStatus: SectorStatus = model.effectiveStatus === "active" ? "active" : model.effectiveStatus === "watch" ? "watch" : "development"

    return {
      id: model.segmentId,
      slug: model.segmentSlug,
      name: model.segmentName,
      status: sectorStatus,
      attractivenessScore: asNumber(model.attractivenessScore),
      digitalMaturity: (model.digitalMaturity === "low" || model.digitalMaturity === "medium" || model.digitalMaturity === "high" ? (model.digitalMaturity as "low" | "medium" | "high") : null),
      topPracticeKey,
      topPracticeLabel: SECTOR_ACTIVATION_PRACTICE_LABELS[topPracticeKey],
      practiceScores,
      linkedAccountIds,
      linkedAccountCount: linkedAccounts.length,
      coveredAccountCount,
      averagePotentialScore,
      averageReachScore,
      coverageGap: averageReachScore === null ? null : 100 - averageReachScore,
      dataCoverageRatio: linkedAccounts.length > 0 ? coveredAccountCount / linkedAccounts.length : 0,
      openWindowCount: 0,
      futureWindowCount: 0,
      undatedWindowCount: 0,
      expiredWindowCount: 0,
      activationState: "data_insufficient" as const,
      painPoints: model.painPoints.map((pp) => ({
        id: pp.id,
        title: pp.title,
        description: pp.description,
        frequencyCount: pp.frequencyCount,
        kredoPractice: pp.kredoPractice,
        verbatim: pp.verbatim,
      })),
      description: model.description,

      marketSizeEurBn: asNumber(model.marketSizeEurBn),
      marketGrowthPct: asNumber(model.marketGrowthPct),
      keyPlayersPaca: Array.isArray(model.keyPlayersPaca) ? (model.keyPlayersPaca as Array<{ name: string; note: string; size: string }>) : [],
      keyPlayersNational: Array.isArray(model.keyPlayersNational) ? (model.keyPlayersNational as Array<{ name: string; note: string; size: string }>) : [],
      avgTjmMin: asNumber(model.avgTjmMin),
      avgTjmMax: asNumber(model.avgTjmMax),
      caveats: model.caveats,
      playbook: model.playbook,
      updatedAt: model.studySnapshotDate,
    }
  }).toSorted((left, right) => {
    return (right.attractivenessScore ?? 0) - (left.attractivenessScore ?? 0)
  })

  // `sectorById` indexé par `segmentId`, pas par `macroId`.
  const sectorById = new Map<string, SectorActivationSector>(sectorMetrics.map((sector) => [sector.id, sector]))
  const windows: SectorActivationWindow[] = []

  for (const model of sectorKnowledgeModels) {
    const sector = sectorById.get(model.segmentId)
    if (!sector) continue
    const exposedAccounts = accountsBySegmentId.get(model.segmentId) ?? []
    const exposedAccountIds = exposedAccounts
      .map((account) => account.id)
      .filter((id): id is string => typeof id === "string")

    // 1. Événements
    for (const event of model.events) {
      if (event.eventStatus && event.eventStatus !== "pending") continue

      const practiceKey = sector.topPracticeKey
      const practiceLabel = SECTOR_ACTIVATION_PRACTICE_LABELS[practiceKey]
      const painPoint = getPainPointSummary(model.painPoints, practiceKey)
      const detectedAt = event.updatedAt ?? event.createdAt
      const temporalStatus = computeTemporalStatus(event.eventDate, now)
      const urgencyScore = getWindowUrgencyScore({
        sourceType: "event",
        temporalStatus,
      })

      windows.push({
        id: `event-${event.id}`,
        sourceType: "event",
        sourceId: event.id,
        sourceLabel: getSourceLabel("event", { event_type: event.eventType }),
        sourceUrl: event.sourceUrl,
        dataOrigin: "REAL_NATIVE",
        sectorId: sector.id,
        sectorSlug: sector.slug,
        sectorName: sector.name,
        title: event.title,
        subtitle: event.description ?? event.commercialOpportunity ?? `Signal ${practiceLabel.toLowerCase()} à qualifier.`,
        practiceKey,
        practiceLabel,
        detectedAt,
        deadlineAt: event.eventDate,
        temporalStatus,
        freshnessBand: computeFreshnessBand(detectedAt, now),
        urgencyScore,
        priorityBand: getPriorityBand(urgencyScore),
        isOpenNow: temporalStatus === "close" || temporalStatus === "active",
        exposedAccountIds,
        exposedAccountCount: exposedAccounts.length,
        averagePotentialScore: sector.averagePotentialScore,
        averageReachScore: sector.averageReachScore,
        coverageGap: sector.coverageGap,
        suggestedAction: createSuggestedAction({
          sourceType: "event",
          practiceKey,
          practiceLabel,
          temporalStatus,
          title: event.title,
          deadlineAt: event.eventDate,
          painPointTitle: painPoint?.title ?? null,
        }),
        playbookSummary: createPlaybookSummary({
          sourceType: "event",
          practiceLabel,
          painPointTitle: painPoint?.title ?? null,
          commercialText: event.commercialOpportunity,
        }),
        sectorAttractivenessScore: sector.attractivenessScore,
      })
    }

    // 2. Actualités
    for (const newsItem of model.news) {
      const relevanceScore = asNumber(newsItem.relevanceScore)
      if (!newsItem.isTriggerEvent) continue
      if (relevanceScore === null || relevanceScore < NEWS_RELEVANCE_THRESHOLD) continue
      if (!hasText(newsItem.source) || !hasText(newsItem.summary)) continue
      const temporalStatus = computeNewsTemporalStatus(newsItem.publishedAt, now)
      if (temporalStatus === "undated") continue

      const practiceKey = sector.topPracticeKey
      const practiceLabel = SECTOR_ACTIVATION_PRACTICE_LABELS[practiceKey]
      const painPoint = getPainPointSummary(model.painPoints, practiceKey)
      const urgencyScore = getWindowUrgencyScore({
        sourceType: "news",
        temporalStatus,
        relevanceScore,
      })

      windows.push({
        id: `news-${newsItem.id}`,
        sourceType: "news",
        sourceId: newsItem.id,
        sourceLabel: getSourceLabel("news", { source: newsItem.source }),
        sourceUrl: newsItem.url,
        dataOrigin: "REAL_NATIVE",
        sectorId: sector.id,
        sectorSlug: sector.slug,
        sectorName: sector.name,
        title: newsItem.title,
        subtitle: newsItem.summary,
        practiceKey,
        practiceLabel,
        detectedAt: newsItem.publishedAt,
        deadlineAt: null,
        temporalStatus,
        freshnessBand: computeFreshnessBand(newsItem.publishedAt, now),
        urgencyScore,
        priorityBand: getPriorityBand(urgencyScore),
        isOpenNow: temporalStatus === "close" || temporalStatus === "active",
        exposedAccountIds,
        exposedAccountCount: exposedAccounts.length,
        averagePotentialScore: sector.averagePotentialScore,
        averageReachScore: sector.averageReachScore,
        coverageGap: sector.coverageGap,
        suggestedAction: createSuggestedAction({
          sourceType: "news",
          practiceKey,
          practiceLabel,
          temporalStatus,
          title: newsItem.title,
          deadlineAt: null,
          painPointTitle: painPoint?.title ?? null,
        }),
        playbookSummary: createPlaybookSummary({
          sourceType: "news",
          practiceLabel,
          painPointTitle: painPoint?.title ?? null,
          commercialText: newsItem.summary,
        }),
        sectorAttractivenessScore: sector.attractivenessScore,
      })
    }

    // 3. Réglementations
    for (const reg of model.regulatory) {
      if (!reg.isCommercialWindow) continue

      const practiceKey = pickPracticeKey(reg.kredoPractice as PracticeKey | null, sector.topPracticeKey)
      const practiceLabel = SECTOR_ACTIVATION_PRACTICE_LABELS[practiceKey]
      const painPoint = getPainPointSummary(model.painPoints, practiceKey)
      const detectedAt = reg.updatedAt ?? reg.createdAt
      const temporalStatus = computeTemporalStatus(reg.deadlineDate, now)
      const urgencyScore = getWindowUrgencyScore({
        sourceType: "regulation",
        temporalStatus,
        urgency: reg.urgency,
      })

      windows.push({
        id: `regulation-${reg.id}`,
        sourceType: "regulation",
        sourceId: reg.id,
        sourceLabel: getSourceLabel("regulation", { authority: reg.authority }),
        sourceUrl: reg.sourceUrl ?? null,
        dataOrigin: "REAL_NATIVE",
        sectorId: sector.id,
        sectorSlug: sector.slug,
        sectorName: sector.name,
        title: reg.name,
        subtitle: reg.description ?? reg.commercialAngle ?? `Fenêtre ${practiceLabel.toLowerCase()} à convertir en action commerciale.`,
        practiceKey,
        practiceLabel,
        detectedAt,
        deadlineAt: reg.deadlineDate,
        temporalStatus,
        freshnessBand: computeFreshnessBand(detectedAt, now),
        urgencyScore,
        priorityBand: getPriorityBand(urgencyScore),
        isOpenNow: temporalStatus === "close" || temporalStatus === "active",
        exposedAccountIds,
        exposedAccountCount: exposedAccounts.length,
        averagePotentialScore: sector.averagePotentialScore,
        averageReachScore: sector.averageReachScore,
        coverageGap: sector.coverageGap,
        suggestedAction: createSuggestedAction({
          sourceType: "regulation",
          practiceKey,
          practiceLabel,
          temporalStatus,
          title: reg.name,
          deadlineAt: reg.deadlineDate,
          painPointTitle: painPoint?.title ?? null,
        }),
        playbookSummary: createPlaybookSummary({
          sourceType: "regulation",
          practiceLabel,
          painPointTitle: painPoint?.title ?? null,
          commercialText: reg.commercialAngle,
        }),
        sectorAttractivenessScore: sector.attractivenessScore,
      })
    }
  }

  const sortedWindows = windows.toSorted(compareWindows)

  const windowsBySectorSlug = new Map<string, SectorActivationWindow[]>()
  const windowStatsBySectorId = new Map<
    string,
    { open: number; future: number; undated: number; expired: number }
  >()
  for (const window of sortedWindows) {
    const current = windowsBySectorSlug.get(window.sectorSlug) ?? []
    current.push(window)
    windowsBySectorSlug.set(window.sectorSlug, current)

    const stats = windowStatsBySectorId.get(window.sectorId) ?? {
      open: 0,
      future: 0,
      undated: 0,
      expired: 0,
    }

    if (window.temporalStatus === "close" || window.temporalStatus === "active") {
      stats.open += 1
    } else if (window.temporalStatus === "future") {
      stats.future += 1
    } else if (window.temporalStatus === "undated") {
      stats.undated += 1
    } else {
      stats.expired += 1
    }

    windowStatsBySectorId.set(window.sectorId, stats)
  }

  const sectors: SectorActivationSector[] = sectorMetrics.map((sector) => {
    const stats = windowStatsBySectorId.get(sector.id) ?? {
      open: 0,
      future: 0,
      undated: 0,
      expired: 0,
    }

    return {
      ...sector,
      openWindowCount: stats.open,
      futureWindowCount: stats.future,
      undatedWindowCount: stats.undated,
      expiredWindowCount: stats.expired,
      activationState: getSectorActivationState({
        openWindowCount: stats.open,
        linkedAccountCount: sector.linkedAccountCount,
        averageReachScore: sector.averageReachScore,
        futureWindowCount: stats.future,
        undatedWindowCount: stats.undated,
        expiredWindowCount: stats.expired,
      }),
      windows: windowsBySectorSlug.get(sector.slug) ?? [],
      playbookSummary: "À venir",
      playbookType: "custom",
      playbook: sector.playbook,
    }
  })

  const sectorOptions = sectors.map((sector) => ({
    value: sector.slug,
    label: sector.name,
  }))

  const availablePracticeKeys = Array.from(new Set(windows.map((window) => window.practiceKey)))
  const availableSourceTypes = Array.from(new Set(windows.map((window) => window.sourceType)))
  const availablePriorityBands = Array.from(new Set(windows.map((window) => window.priorityBand)))
  const availableTemporalStatuses = Array.from(new Set(windows.map((window) => window.temporalStatus)))

  const filterOptions: SectorActivationFilterOptions = {
    sectors: sectorOptions,
    practices: availablePracticeKeys.map((key) => ({
      value: key,
      label: SECTOR_ACTIVATION_PRACTICE_LABELS[key],
    })),
    sourceTypes: availableSourceTypes.map((value) => ({
      value,
      label: value === "event" ? "Événements" : value === "news" ? "Actualités" : "Réglementations",
    })),
    priorityBands: availablePriorityBands.map((value) => ({
      value,
      label: value === "critical"
        ? "Critique"
        : value === "high"
          ? "Haute"
          : value === "medium"
            ? "Moyenne"
            : "Basse",
    })),
    temporalStatuses: availableTemporalStatuses.map((value) => ({
      value,
      label: value === "close"
        ? "Proche"
        : value === "active"
          ? "Active"
          : value === "future"
            ? "Future"
            : value === "undated"
              ? "Non datée"
              : "Expirée",
    })),
    statusFilters: [
      { value: "open", label: "Ouvertes" },
      { value: "all", label: "Toutes" },
    ],
  }

  return {
    sectors,
    windows: sortedWindows,
    filterOptions,
  }
}

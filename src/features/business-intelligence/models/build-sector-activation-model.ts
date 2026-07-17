import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import type { PracticeKey } from "@/types/sector"
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
  regulatory: "Evenement reglementaire",
  market: "Signal de marche",
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
    ? value as Record<string, unknown>
    : {}

  return {
    data_ai: asNumber(record.data_ai as number | string | null) ?? 0,
    cloud_eng: asNumber(record.cloud_eng as number | string | null) ?? 0,
    product: asNumber(record.product as number | string | null) ?? 0,
    cyber: asNumber(record.cyber as number | string | null) ?? 0,
  }
}

function sortPracticeEntries(practicesFit: Record<PracticeKey, number>) {
  return (Object.entries(practicesFit) as Array<[PracticeKey, number]>)
    .toSorted((left, right) => right[1] - left[1])
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
  sourceType: SectorActivationSourceType,
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
  row: any,
): string {
  if (sourceType === "news") {
    const source = row.source
    return hasText(source) ? source : "Source non identifiee"
  }
  if (sourceType === "regulation") {
    const authority = row.authority
    return hasText(authority) ? authority : "Reglementation sectorielle"
  }
  return EVENT_TYPE_LABELS[row.event_type] ?? "Signal sectoriel"
}

function pickPracticeKey(preferred: PracticeKey | "multi" | null, fallback: PracticeKey): PracticeKey {
  if (preferred === "data_ai" || preferred === "cloud_eng" || preferred === "product" || preferred === "cyber") {
    return preferred
  }
  return fallback
}

function getAccountsAverage(accounts: any[], field: string) {
  if (accounts.length === 0) return null
  const total = accounts.reduce((sum, account) => sum + (account[field] ?? 0), 0)
  return Math.round(total / accounts.length)
}

function getPainPointSummary(
  painPoints: any[],
  practiceKey: PracticeKey,
) {
  const matching = painPoints
    .filter((painPoint) => painPoint.kredo_practice === practiceKey || painPoint.kredo_practice === "multi")
    .toSorted((left, right) => right.frequency_count - left.frequency_count)

  return matching[0] ?? painPoints.toSorted((left, right) => right.frequency_count - left.frequency_count)[0] ?? null
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
    return `Cadrer une reponse ${practiceLabel}${deadlineContext} et qualifier un compte expose.`
  }
  if (sourceType === "news") {
    return `Verifier la materialite du signal puis ouvrir une prise de contact ${practiceLabel.toLowerCase()} sur les comptes exposes.`
  }
  if (painPointTitle) {
    return `Qualifier le signal, relier ${painPointTitle.toLowerCase()} et proposer un atelier ${practiceLabel.toLowerCase()}.`
  }
  if (temporalStatus === "close") {
    return `Activer un playbook court ${practiceLabel.toLowerCase()} avant refroidissement de la fenetre.`
  }
  return `Transformer le signal en hypothese de besoin ${practiceLabel.toLowerCase()} sur un compte prioritaire.`
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
    return `Playbook de conformite et delivery ${practiceLabel.toLowerCase()}.`
  }
  if (sourceType === "news") {
    return `Playbook de qualification rapide ${practiceLabel.toLowerCase()}.`
  }
  return `Playbook d'activation ${practiceLabel.toLowerCase()} sur un compte expose.`
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

export function buildSectorActivationModel(
  snapshot: any,
  options: { now: number }
): { sectors: SectorActivationSector[]; windows: SectorActivationWindow[]; filterOptions: SectorActivationFilterOptions } {
  const { now } = options
  const { _rawSources, accounts } = snapshot
  if (!_rawSources) {
    return { sectors: [], windows: [], filterOptions: { sectors: [], lifecycles: [], priorities: [], practices: [], sourceTypes: [], priorityBands: [], temporalStatuses: [], statusFilters: [] } as any }
  }

  const { sectorRows, painPointRows, eventRows, newsRows, regulatoryRows } = _rawSources

  const accountsBySectorId = new Map<string, any[]>()
  for (const account of accounts) {
    if (!account.sectorId) continue
    const current = accountsBySectorId.get(account.sectorId) ?? []
    current.push(account)
    accountsBySectorId.set(account.sectorId, current)
  }

  const painPointsBySectorId = new Map<string, any[]>()
  for (const painPoint of painPointRows) {
    const current = painPointsBySectorId.get(painPoint.sector_id) ?? []
    current.push(painPoint)
    painPointsBySectorId.set(painPoint.sector_id, current)
  }

  const sectorMetrics = sectorRows.map((sector: any) => {
    const practiceScores = parsePracticesFit(sector.practices_fit)
    const linkedAccounts = accountsBySectorId.get(sector.id) ?? []
    const topPracticeKey = getTopPracticeKey(practiceScores)
    const coveredAccountCount = linkedAccounts.filter((account) => account.legacyFolioScore !== null).length
    const averagePotentialScore = getAccountsAverage(linkedAccounts, "potentialScore")
    const averageReachScore = getAccountsAverage(linkedAccounts, "reachScore")

    return {
      id: sector.id,
      slug: sector.slug,
      name: sector.name,
      status: sector.status,
      attractivenessScore: asNumber(sector.attractiveness_score),
      digitalMaturity: sector.digital_maturity,
      topPracticeKey,
      topPracticeLabel: SECTOR_ACTIVATION_PRACTICE_LABELS[topPracticeKey as PracticeKey],
      practiceScores,
      linkedAccountIds: linkedAccounts.map((account) => account.id),
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
      painPoints: (painPointsBySectorId.get(sector.id) ?? []).map((pp: any) => ({
        id: pp.id,
        title: pp.title,
        description: pp.description,
        frequencyCount: Number(pp.frequency_count),
        kredoPractice: pp.kredo_practice,
        verbatim: pp.verbatim,
      })),
      description: sector.description,

      marketSizeEurBn: asNumber(sector.market_size_eur_bn),
      marketGrowthPct: asNumber(sector.market_growth_pct),
      keyPlayersPaca: sector.key_players_paca,
      keyPlayersNational: sector.key_players_national,
      avgTjmMin: asNumber(sector.avg_tjm_min),
      avgTjmMax: asNumber(sector.avg_tjm_max),
      caveats: sector.caveats,
      playbook: sector.playbook,
      updatedAt: sector.updated_at,
    }


  }).toSorted((left: any, right: any) => {
    return (right.attractivenessScore ?? 0) - (left.attractivenessScore ?? 0)
  })

  const sectorById = new Map<string, any>(sectorMetrics.map((sector: any) => [sector.id, sector]))
  const windows: SectorActivationWindow[] = []

  for (const row of eventRows) {
    if (row.status !== "pending") continue
    const sector = sectorById.get(row.sector_id)
    if (!sector) continue

    const practiceKey = sector.topPracticeKey
    const practiceLabel = SECTOR_ACTIVATION_PRACTICE_LABELS[practiceKey as PracticeKey]
    const painPoint = getPainPointSummary(painPointsBySectorId.get(row.sector_id) ?? [], practiceKey)
    const detectedAt = row.updated_at ?? row.created_at
    const temporalStatus = computeTemporalStatus(row.event_date, now)
    const urgencyScore = getWindowUrgencyScore({
      sourceType: "event",
      temporalStatus,
    })
    const exposedAccounts = accountsBySectorId.get(row.sector_id) ?? []

    windows.push({
      id: `event-${row.id}`,
      sourceType: "event",
      sourceId: row.id,
      sourceLabel: getSourceLabel("event", row),
      sourceUrl: row.source_url,
      dataOrigin: "REAL_NATIVE",
      sectorId: sector.id,
      sectorSlug: sector.slug,
      sectorName: sector.name,
      title: row.title,
      subtitle: row.description ?? row.commercial_opportunity ?? `Signal ${practiceLabel.toLowerCase()} a qualifier.`,
      practiceKey,
      practiceLabel,
      detectedAt,
      deadlineAt: row.event_date,
      temporalStatus,
      freshnessBand: computeFreshnessBand(detectedAt, now, "event"),
      urgencyScore,
      priorityBand: getPriorityBand(urgencyScore),
      isOpenNow: temporalStatus === "close" || temporalStatus === "active",
      exposedAccountIds: exposedAccounts.map((account) => account.id),
      exposedAccountCount: exposedAccounts.length,
      averagePotentialScore: sector.averagePotentialScore,
      averageReachScore: sector.averageReachScore,
      coverageGap: sector.coverageGap,
      suggestedAction: createSuggestedAction({
        sourceType: "event",
        practiceKey,
        practiceLabel,
        temporalStatus,
        title: row.title,
        deadlineAt: row.event_date,
        painPointTitle: painPoint?.title ?? null,
      }),
      playbookSummary: createPlaybookSummary({
        sourceType: "event",
        practiceLabel,
        painPointTitle: painPoint?.title ?? null,
        commercialText: row.commercial_opportunity,
      }),
      sectorAttractivenessScore: sector.attractivenessScore,
    })
  }

  for (const row of newsRows) {
    const relevanceScore = asNumber(row.relevance_score)
    if (!row.is_trigger_event) continue
    if (relevanceScore === null || relevanceScore < NEWS_RELEVANCE_THRESHOLD) continue
    if (!hasText(row.source) || !hasText(row.summary)) continue
    const temporalStatus = computeNewsTemporalStatus(row.published_at, now)
    if (temporalStatus === "undated") continue

    const sector = sectorById.get(row.sector_id)
    if (!sector) continue

    const practiceKey = sector.topPracticeKey
    const practiceLabel = SECTOR_ACTIVATION_PRACTICE_LABELS[practiceKey as PracticeKey]
    const painPoint = getPainPointSummary(painPointsBySectorId.get(row.sector_id) ?? [], practiceKey)
    const urgencyScore = getWindowUrgencyScore({
      sourceType: "news",
      temporalStatus,
      relevanceScore,
    })
    const exposedAccounts = accountsBySectorId.get(row.sector_id) ?? []

    windows.push({
      id: `news-${row.id}`,
      sourceType: "news",
      sourceId: row.id,
      sourceLabel: getSourceLabel("news", row),
      sourceUrl: row.url,
      dataOrigin: "REAL_NATIVE",
      sectorId: sector.id,
      sectorSlug: sector.slug,
      sectorName: sector.name,
      title: row.title,
      subtitle: row.summary,
      practiceKey,
      practiceLabel,
      detectedAt: row.published_at,
      deadlineAt: null,
      temporalStatus,
      freshnessBand: computeFreshnessBand(row.published_at, now, "news"),
      urgencyScore,
      priorityBand: getPriorityBand(urgencyScore),
      isOpenNow: temporalStatus === "close" || temporalStatus === "active",
      exposedAccountIds: exposedAccounts.map((account) => account.id),
      exposedAccountCount: exposedAccounts.length,
      averagePotentialScore: sector.averagePotentialScore,
      averageReachScore: sector.averageReachScore,
      coverageGap: sector.coverageGap,
      suggestedAction: createSuggestedAction({
        sourceType: "news",
        practiceKey,
        practiceLabel,
        temporalStatus,
        title: row.title,
        deadlineAt: null,
        painPointTitle: painPoint?.title ?? null,
      }),
      playbookSummary: createPlaybookSummary({
        sourceType: "news",
        practiceLabel,
        painPointTitle: painPoint?.title ?? null,
        commercialText: row.summary,
      }),
      sectorAttractivenessScore: sector.attractivenessScore,
    })
  }

  for (const row of regulatoryRows) {
    if (!row.is_commercial_window) continue
    const sector = sectorById.get(row.sector_id)
    if (!sector) continue

    const practiceKey = pickPracticeKey(row.kredo_practice, sector.topPracticeKey)
    const practiceLabel = SECTOR_ACTIVATION_PRACTICE_LABELS[practiceKey as PracticeKey]
    const painPoint = getPainPointSummary(painPointsBySectorId.get(row.sector_id) ?? [], practiceKey)
    const detectedAt = row.updated_at ?? row.created_at
    const temporalStatus = computeTemporalStatus(row.deadline_date, now)
    const urgencyScore = getWindowUrgencyScore({
      sourceType: "regulation",
      temporalStatus,
      urgency: row.urgency,
    })
    const exposedAccounts = accountsBySectorId.get(row.sector_id) ?? []

    windows.push({
      id: `regulation-${row.id}`,
      sourceType: "regulation",
      sourceId: row.id,
      sourceLabel: getSourceLabel("regulation", row),
      sourceUrl: null,
      dataOrigin: "REAL_NATIVE",
      sectorId: sector.id,
      sectorSlug: sector.slug,
      sectorName: sector.name,
      title: row.name,
      subtitle: row.description ?? row.commercial_angle ?? `Fenetre ${practiceLabel.toLowerCase()} a convertir en action commerciale.`,
      practiceKey,
      practiceLabel,
      detectedAt,
      deadlineAt: row.deadline_date,
      temporalStatus,
      freshnessBand: computeFreshnessBand(detectedAt, now, "regulation"),
      urgencyScore,
      priorityBand: getPriorityBand(urgencyScore),
      isOpenNow: temporalStatus === "close" || temporalStatus === "active",
      exposedAccountIds: exposedAccounts.map((account) => account.id),
      exposedAccountCount: exposedAccounts.length,
      averagePotentialScore: sector.averagePotentialScore,
      averageReachScore: sector.averageReachScore,
      coverageGap: sector.coverageGap,
      suggestedAction: createSuggestedAction({
        sourceType: "regulation",
        practiceKey,
        practiceLabel,
        temporalStatus,
        title: row.name,
        deadlineAt: row.deadline_date,
        painPointTitle: painPoint?.title ?? null,
      }),
      playbookSummary: createPlaybookSummary({
        sourceType: "regulation",
        practiceLabel,
        painPointTitle: painPoint?.title ?? null,
        commercialText: row.commercial_angle,
      }),
      sectorAttractivenessScore: sector.attractivenessScore,
    })
  }

  const sortedWindows = windows.toSorted(compareWindows)

  const windowsBySectorSlug = new Map<string, any[]>()
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

  const sectors = sectorMetrics.map((sector: any) => {
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

  const sectorOptions = sectors.map((sector: any) => ({
    value: sector.slug,
    label: sector.name,
  }))

  const availablePracticeKeys = Array.from(new Set(windows.map((window) => window.practiceKey)))
  const availableSourceTypes = Array.from(new Set(windows.map((window) => window.sourceType)))
  const availablePriorityBands = Array.from(new Set(windows.map((window) => window.priorityBand)))
  const availableTemporalStatuses = Array.from(new Set(windows.map((window) => window.temporalStatus)))

  const filterOptions = {
    sectors: sectorOptions,
    practices: availablePracticeKeys.map((key) => ({
      value: key,
      label: SECTOR_ACTIVATION_PRACTICE_LABELS[key as PracticeKey],
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
      { value: "open" as const, label: "Ouvertes" },
      { value: "all" as const, label: "Toutes" },
    ],
  }

  return {
    sectors: sectors as any,
    windows: sortedWindows,
    filterOptions: filterOptions as any,
  }
}

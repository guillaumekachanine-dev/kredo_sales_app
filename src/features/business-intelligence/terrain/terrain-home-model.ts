import type { SectorCorpusMetadata } from "../data/get-sector-corpus-metadata"
import type {
  SectorKnowledgeEventItem,
  SectorKnowledgeRegulatoryItem,
} from "@/features/master-study/data/get-sector-knowledge-read-model"
import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

export type TerrainConfidenceStatus = "reliable" | "caveats" | "unverified" | "unavailable"

export type TerrainConfidenceModel = {
  status: TerrainConfidenceStatus
  label: string
  detail: string | null
  dotVariant: "success" | "warning" | "danger" | "neutral"
}

export type TerrainRegulatoryTiming =
  | {
      kind: "exact"
      date: string
      formattedDate: string
      countdown: string | null
      daysRemaining: number | null
    }
  | {
      kind: "window"
      label: string
    }
  | {
      kind: "unavailable"
    }

export type TerrainRegulatoryModel = {
  name: string
  timing: TerrainRegulatoryTiming
  urgency?: "high" | "medium" | "low" | null
  authority?: string | null
  commercialAngle?: string | null
}

export type TerrainMarketThesisItem = {
  id?: number
  title: string
  text: string
  commercialAngle?: string | null
  sourceIds: number[]
}

export type TerrainRiskOpportunityItem = {
  risk: string
  opportunity: string
  sourceIds: number[]
}

export type TerrainDailyAngleModel =
  | {
      kind: "market"
      title: string
      text: string
      copyText: string
      sourceIds: number[]
    }
  | {
      kind: "risk"
      title: "Risque × opportunité"
      text: string
      opportunityText: string
      copyText: string
      sourceIds: number[]
    }
  | {
      kind: "unavailable"
      title: "Angle indisponible"
      text: string
      copyText: ""
      sourceIds: []
    }

export type TerrainHomeViewModel = {
  segmentId: string
  segmentName: string
  macroName: string | null
  confidence: TerrainConfidenceModel
  regulatory: TerrainRegulatoryModel
  dailyAngle: TerrainDailyAngleModel
}

function getParisDateParts(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(date)
  const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0")
  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  }
}

export function getParisDayOfYear(date: Date): number {
  const { year, month, day } = getParisDateParts(date)
  const currentUtc = Date.UTC(year, month - 1, day)
  const startOfYearUtc = Date.UTC(year, 0, 0)
  return Math.floor((currentUtc - startOfYearUtc) / 86_400_000)
}

export function isSameParisDay(dateA: Date, dateB: Date): boolean {
  const partsA = getParisDateParts(dateA)
  const partsB = getParisDateParts(dateB)
  return (
    partsA.year === partsB.year &&
    partsA.month === partsB.month &&
    partsA.day === partsB.day
  )
}

function formatFrenchDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * Construit le modèle de badge de confiance à partir des métadonnées du corpus.
 */
export function buildTerrainConfidence(
  corpusMetadata: SectorCorpusMetadata | null,
  studySnapshotDate: string | null = null,
  now: Date = new Date(),
): TerrainConfidenceModel {
  if (!corpusMetadata) {
    return {
      status: "unavailable",
      label: "Corpus non qualifié",
      detail: studySnapshotDate ? `étude du ${formatFrenchDate(new Date(studySnapshotDate))}` : null,
      dotVariant: "neutral",
    }
  }

  const snapshotDate = corpusMetadata.snapshotDate ? new Date(corpusMetadata.snapshotDate) : null
  const isToday = snapshotDate && !Number.isNaN(snapshotDate.getTime()) && isSameParisDay(snapshotDate, now)

  const dateDetail = isToday
    ? "mis à jour aujourd’hui"
    : snapshotDate && !Number.isNaN(snapshotDate.getTime())
      ? `mis à jour le ${formatFrenchDate(snapshotDate)}`
      : studySnapshotDate
        ? `étude du ${formatFrenchDate(new Date(studySnapshotDate))}`
        : null

  if (corpusMetadata.qualityVerdict === "production_ready") {
    return {
      status: "reliable",
      label: "Corpus fiable",
      detail: dateDetail,
      dotVariant: "success",
    }
  }

  if (corpusMetadata.qualityVerdict === "usable_with_caveats") {
    const gapsCount = corpusMetadata.gaps.length
    const gapDetail = gapsCount > 0
      ? `${gapsCount} réserve${gapsCount > 1 ? "s" : ""} déclarée${gapsCount > 1 ? "s" : ""}`
      : dateDetail ?? "usage averti"
    return {
      status: "caveats",
      label: "Corpus sous réserves",
      detail: gapDetail,
      dotVariant: "warning",
    }
  }

  return {
    status: "unverified",
    label: "Corpus non certifié",
    detail: "données à consolider",
    dotVariant: "danger",
  }
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

type ValidDeadline =
  | { kind: "exact"; date: string; dateObj: Date }
  | { kind: "window"; label: string; approximateTime: number }

type ParsedDeadline = ValidDeadline | { kind: "invalid" }

function parseDeadlineString(raw: string | null | undefined): ParsedDeadline {
  if (!raw) return { kind: "invalid" }
  const trimmed = raw.trim()
  if (!trimmed) return { kind: "invalid" }

  const match = ISO_DATE_PATTERN.exec(trimmed)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const dateObj = new Date(year, month - 1, day)
    if (!Number.isNaN(dateObj.getTime())) {
      return { kind: "exact", date: trimmed, dateObj }
    }
  }

  const standardTime = new Date(trimmed).getTime()
  if (!Number.isNaN(standardTime) && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed)
    return {
      kind: "exact",
      date: trimmed.slice(0, 10),
      dateObj: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
    }
  }

  // Windows such as "2026-11", "fin novembre 2026", "Q4 2026", "2027"
  const yearMatch = /(\d{4})/.exec(trimmed)
  const approxYear = yearMatch ? Number(yearMatch[1]) : 2099
  const monthNames: Record<string, number> = {
    janvier: 1,
    fevrier: 2,
    février: 2,
    mars: 3,
    avril: 4,
    mai: 5,
    juin: 6,
    juillet: 7,
    aout: 8,
    août: 8,
    septembre: 9,
    octobre: 10,
    novembre: 11,
    decembre: 12,
    décembre: 12,
  }
  let approxMonth = 6
  const lower = trimmed.toLowerCase()
  for (const [name, num] of Object.entries(monthNames)) {
    if (lower.includes(name)) {
      approxMonth = num
      break
    }
  }
  if (lower.includes("q1") || lower.includes("t1")) approxMonth = 3
  if (lower.includes("q2") || lower.includes("t2")) approxMonth = 6
  if (lower.includes("q3") || lower.includes("t3")) approxMonth = 9
  if (lower.includes("q4") || lower.includes("t4")) approxMonth = 12

  const approxTime = Date.UTC(approxYear, approxMonth - 1, 28)

  return {
    kind: "window",
    label: trimmed,
    approximateTime: approxTime,
  }
}

function urgencyScore(urgency: string | null | undefined): number {
  if (!urgency) return 1
  const norm = urgency.toLowerCase()
  if (norm === "high" || norm === "haute" || norm === "critique" || norm === "critical" || norm === "urgent") return 3
  if (norm === "medium" || norm === "moyenne") return 2
  return 1
}

function mapUrgency(urgency: string | null | undefined): "high" | "medium" | "low" | null {
  if (!urgency) return null
  const score = urgencyScore(urgency)
  if (score === 3) return "high"
  if (score === 2) return "medium"
  return "low"
}

type CandidateDeadline = {
  name: string
  parsed: ValidDeadline
  urgency: "high" | "medium" | "low" | null
  urgencyScore: number
  authority?: string | null
  commercialAngle?: string | null
}

/**
 * Résout la prochaine échéance réglementaire future.
 */
export function buildTerrainRegulatoryDeadline(
  regulatoryItems: SectorKnowledgeRegulatoryItem[] = [],
  eventItems: SectorKnowledgeEventItem[] = [],
  now: Date = new Date(),
): TerrainRegulatoryModel {
  const parisParts = getParisDateParts(now)
  const todayMidnight = new Date(parisParts.year, parisParts.month - 1, parisParts.day)
  const todayTime = todayMidnight.getTime()

  const candidates: CandidateDeadline[] = []

  for (const item of regulatoryItems) {
    const parsed = parseDeadlineString(item.deadlineDate)
    if (parsed.kind === "invalid") continue
    candidates.push({
      name: item.name,
      parsed,
      urgency: mapUrgency(item.urgency),
      urgencyScore: urgencyScore(item.urgency),
      authority: item.authority,
      commercialAngle: item.commercialAngle,
    })
  }

  for (const evt of eventItems) {
    const parsed = parseDeadlineString(evt.eventDate)
    if (parsed.kind === "invalid") continue
    candidates.push({
      name: evt.title,
      parsed,
      urgency: null,
      urgencyScore: 1,
      commercialAngle: evt.commercialOpportunity,
    })
  }

  const futureCandidates = candidates.filter((candidate) => {
    if (candidate.parsed.kind === "exact") {
      return candidate.parsed.dateObj.getTime() >= todayTime
    }
    if (candidate.parsed.kind === "window") {
      return candidate.parsed.approximateTime >= todayTime
    }
    return false
  })

  if (futureCandidates.length === 0) {
    return {
      name: "Réglementation",
      timing: { kind: "unavailable" },
    }
  }

  futureCandidates.sort((a, b) => {
    const timeA = a.parsed.kind === "exact" ? a.parsed.dateObj.getTime() : a.parsed.approximateTime
    const timeB = b.parsed.kind === "exact" ? b.parsed.dateObj.getTime() : b.parsed.approximateTime

    if (timeA !== timeB) return timeA - timeB
    if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore
    return a.name.localeCompare(b.name, "fr")
  })

  const chosen = futureCandidates[0]

  if (chosen.parsed.kind === "exact") {
    const targetParts = getParisDateParts(chosen.parsed.dateObj)
    const targetUtc = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day)
    const todayUtc = Date.UTC(parisParts.year, parisParts.month - 1, parisParts.day)
    const diffMs = targetUtc - todayUtc
    const daysRemaining = Math.max(0, Math.round(diffMs / 86_400_000))
    const countdown = `J-${daysRemaining}`
    const formattedDate = formatFrenchDate(chosen.parsed.dateObj)

    return {
      name: chosen.name,
      timing: {
        kind: "exact",
        date: chosen.parsed.date,
        formattedDate,
        countdown,
        daysRemaining,
      },
      urgency: chosen.urgency,
      authority: chosen.authority,
      commercialAngle: chosen.commercialAngle,
    }
  }

  return {
    name: chosen.name,
    timing: {
      kind: "window",
      label: chosen.parsed.label,
    },
    urgency: chosen.urgency,
    authority: chosen.authority,
    commercialAngle: chosen.commercialAngle,
  }
}

export function parseMarketThesesFromPlaybook(playbook: Record<string, unknown> | null | undefined): TerrainMarketThesisItem[] {
  if (!playbook || typeof playbook !== "object") return []
  const rawList = playbook.market_thesis ?? playbook.theses
  if (!Array.isArray(rawList)) return []

  const results: TerrainMarketThesisItem[] = []
  for (let index = 0; index < rawList.length; index++) {
    const item = rawList[index]
    if (!item) continue
    if (typeof item === "string" && item.trim().length > 0) {
      results.push({
        id: index + 1,
        title: "Thèse",
        text: item.trim(),
        sourceIds: [],
      })
      continue
    }
    if (typeof item === "object") {
      const rec = item as Record<string, unknown>
      const text = typeof rec.these === "string"
        ? rec.these.trim()
        : typeof rec.text === "string"
          ? rec.text.trim()
          : typeof rec.description === "string"
            ? rec.description.trim()
            : ""
      if (!text) continue

      const title = typeof rec.title === "string" && rec.title.trim().length > 0
        ? rec.title.trim()
        : "Thèse"
      const commercialAngle = typeof rec.donc_commercialement === "string" && rec.donc_commercialement.trim().length > 0
        ? rec.donc_commercialement.trim()
        : typeof rec.commercialAngle === "string" && rec.commercialAngle.trim().length > 0
          ? rec.commercialAngle.trim()
          : null
      const rawSrcIds = Array.isArray(rec.src_ids) ? rec.src_ids : Array.isArray(rec.sourceIds) ? rec.sourceIds : []
      const sourceIds = rawSrcIds
        .map((s) => (typeof s === "number" ? s : typeof s === "string" ? parseInt(s, 10) : NaN))
        .filter((n): n is number => Number.isFinite(n) && n > 0)

      results.push({
        id: typeof rec.id === "number" ? rec.id : index + 1,
        title,
        text,
        commercialAngle,
        sourceIds,
      })
    }
  }

  return results
}

export function parseRiskOpportunitiesFromPlaybook(playbook: Record<string, unknown> | null | undefined): TerrainRiskOpportunityItem[] {
  if (!playbook || typeof playbook !== "object") return []
  const rawList = playbook.risks
  if (!Array.isArray(rawList)) return []

  const results: TerrainRiskOpportunityItem[] = []
  for (const item of rawList) {
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const risk = typeof rec.risque === "string"
      ? rec.risque.trim()
      : typeof rec.risk === "string"
        ? rec.risk.trim()
        : ""
    const opportunity = typeof rec.opportunite === "string"
      ? rec.opportunite.trim()
      : typeof rec.opportunity === "string"
        ? rec.opportunity.trim()
        : ""

    if (!risk && !opportunity) continue

    const rawSrcIds = Array.isArray(rec.src_ids) ? rec.src_ids : Array.isArray(rec.sourceIds) ? rec.sourceIds : []
    const sourceIds = rawSrcIds
      .map((s) => (typeof s === "number" ? s : typeof s === "string" ? parseInt(s, 10) : NaN))
      .filter((n): n is number => Number.isFinite(n) && n > 0)

    results.push({
      risk: risk || "Risque non précisé",
      opportunity: opportunity || "Opportunité non précisée",
      sourceIds,
    })
  }

  return results
}

/**
 * Construit l'angle du jour avec alternance déterministe Paris (pair = marché, impair = risque x opportunité).
 */
export function buildTerrainDailyAngle(
  playbook: Record<string, unknown> | null | undefined,
  now: Date = new Date(),
): TerrainDailyAngleModel {
  const marketTheses = parseMarketThesesFromPlaybook(playbook)
  const riskOpportunities = parseRiskOpportunitiesFromPlaybook(playbook)

  const dayOfYear = getParisDayOfYear(now)
  const wantsMarket = dayOfYear % 2 === 0

  if (wantsMarket) {
    if (marketTheses.length > 0) {
      const item = marketTheses[dayOfYear % marketTheses.length]
      return {
        kind: "market",
        title: item.title,
        text: item.text,
        copyText: item.text,
        sourceIds: item.sourceIds,
      }
    }
    if (riskOpportunities.length > 0) {
      const item = riskOpportunities[dayOfYear % riskOpportunities.length]
      const copyText = `RISQUE\n${item.risk}\n\nOPPORTUNITÉ\n${item.opportunity}`
      return {
        kind: "risk",
        title: "Risque × opportunité",
        text: item.risk,
        opportunityText: item.opportunity,
        copyText,
        sourceIds: item.sourceIds,
      }
    }
  } else {
    if (riskOpportunities.length > 0) {
      const item = riskOpportunities[dayOfYear % riskOpportunities.length]
      const copyText = `RISQUE\n${item.risk}\n\nOPPORTUNITÉ\n${item.opportunity}`
      return {
        kind: "risk",
        title: "Risque × opportunité",
        text: item.risk,
        opportunityText: item.opportunity,
        copyText,
        sourceIds: item.sourceIds,
      }
    }
    if (marketTheses.length > 0) {
      const item = marketTheses[dayOfYear % marketTheses.length]
      return {
        kind: "market",
        title: item.title,
        text: item.text,
        copyText: item.text,
        sourceIds: item.sourceIds,
      }
    }
  }

  return {
    kind: "unavailable",
    title: "Angle indisponible",
    text: "",
    copyText: "",
    sourceIds: [],
  }
}

/**
 * Assemble le modèle d'écran d'accueil Terrain complet.
 */
export function buildTerrainHomeModel(
  workspace: LoadedWorkspace,
  now: Date = new Date(),
): TerrainHomeViewModel {
  const confidence = buildTerrainConfidence(
    workspace.corpusMetadata,
    workspace.knowledge.studySnapshotDate,
    now,
  )

  const regulatory = buildTerrainRegulatoryDeadline(
    workspace.knowledge.regulatory,
    workspace.knowledge.events,
    now,
  )

  const dailyAngle = buildTerrainDailyAngle(
    workspace.knowledge.playbook,
    now,
  )

  return {
    segmentId: workspace.segment.id,
    segmentName: workspace.segment.name,
    macroName: workspace.segment.macro?.name ?? null,
    confidence,
    regulatory,
    dailyAngle,
  }
}

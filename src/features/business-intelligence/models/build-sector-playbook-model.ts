import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"

export interface SectorPlaybookPersona {
  role: string
  enjeu: string
  peur: string
}

export interface SectorPlaybookObjection {
  objection: string
  reponse: string
}

export interface SectorPlaybookActeurCle {
  name: string
  note: string
  size: string
}

export interface SectorPlaybookPainPoint {
  id: string
  title: string
  description: string | null
  frequencyCount: number
  kredoPractice: string | null
  verbatim: string | null
}

export interface SectorPlaybookDeadline {
  title: string
  date: string | null
  urgency: number
  authority?: string | null
  practiceKey?: string | null
  sourceUrl?: string | null
}

export interface SectorPlaybookCaveat {
  verbatims?: string
  frequences?: string
  corpus?: string
  marche?: string
}

export interface BusinessIntelligenceSectorProfile {
  sectorId: string
  name: string
  slug: string
  status: "active" | "watch"
  description: string | null
  marketSizeEurBn: number | null
  marketGrowthPct: number | null
  digitalMaturity: "low" | "medium" | "high" | null
  topPracticeLabel: string
  practiceScores: Record<string, number>
  playbook: {
    personas: SectorPlaybookPersona[]
    roiArguments: string[]
    objections: SectorPlaybookObjection[]
    entryPoints: string[]
  }
  painPoints: SectorPlaybookPainPoint[]
  deadlines: SectorPlaybookDeadline[]
  keyPlayers: {
    paca: SectorPlaybookActeurCle[]
    national: SectorPlaybookActeurCle[]
  }
  caveats: SectorPlaybookCaveat | null
  sources: string[]
  priorityAccounts: {
    id: string
    name: string
    reach: number
    momentum: number
    openOpportunityCount: number
    inactivityRisk: number
    signal: string | null
    action: string | null
  }[]
  updatedAt: string | null
  averageReach: number | null
  linkedAccountCount: number
  attractivenessScore: number | null
  summary: string
}

export function buildSectorPlaybookModel(
  snapshot: BusinessIntelligenceSnapshot,
  sectorId: string,
): BusinessIntelligenceSectorProfile | null {
  const { sectors, accounts, windows, signals } = snapshot

  const sector = sectors.find((s) => s.id === sectorId)
  if (!sector) return null

  // Playbook JSON parsing
  const rawPlaybook = (sector.playbook && typeof sector.playbook === "object" ? sector.playbook : {}) as Record<string, unknown>
  const status = (sector.status === "active" ? "active" : "watch") as "active" | "watch"

  // Deux formes coexistent selon la provenance du secteur : les segments
  // seedés avant ce chantier portent des chaînes brutes / clés role-enjeu-peur
  // (ex. nutraceutique-sante-naturelle) ; les segments ingérés par la Master
  // Study (ADR-0021, E4) portent des objets structurés sourcés
  // (ex. seg-parfumerie-compositions-b2b : `{src_ids, argument}`,
  // `{angle, signal, src_ids, interlocuteur}`, `{fonction, repond_de,
  // ce_qui_le_reveille}`). Un cast aveugle vers `string[]` plante au rendu
  // (React #31, objet passé comme enfant) — jamais détecté avant l'ingestion
  // réelle du premier segment E4, aucun autre secteur n'exerçait ce chemin.
  const textFromRecord = (value: unknown, keys: string[]): string | null => {
    if (typeof value === "string") {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>
      for (const key of keys) {
        const candidate = record[key]
        if (typeof candidate === "string" && candidate.trim().length > 0) return candidate.trim()
      }
    }
    return null
  }

  const rawPersonas = Array.isArray(rawPlaybook.personas)
    ? (rawPlaybook.personas as Array<Record<string, unknown>>)
    : []
  const personas: SectorPlaybookPersona[] = status === "active"
    ? rawPersonas.map((p) => ({
        role: textFromRecord(p.role, []) ?? textFromRecord(p.fonction, []) ?? "",
        enjeu: textFromRecord(p.enjeu, []) ?? textFromRecord(p.repond_de, []) ?? "",
        peur: textFromRecord(p.peur, []) ?? textFromRecord(p.ce_qui_le_reveille, []) ?? "",
      }))
    : []

  const rawRoiArguments = Array.isArray(rawPlaybook.roi_arguments)
    ? (rawPlaybook.roi_arguments as unknown[])
    : []
  const roiArguments: string[] = status === "active"
    ? rawRoiArguments
        .map((item) => textFromRecord(item, ["argument"]))
        .filter((value): value is string => value !== null)
    : []

  const rawObjections = Array.isArray(rawPlaybook.objections)
    ? (rawPlaybook.objections as Array<{ objection?: string; reponse?: string }>)
    : []
  const objections: SectorPlaybookObjection[] = status === "active"
    ? rawObjections.map((o) => ({
        objection: o.objection ?? "",
        reponse: o.reponse ?? "",
      }))
    : []

  const rawEntryPoints = Array.isArray(rawPlaybook.entry_points)
    ? (rawPlaybook.entry_points as unknown[])
    : []
  const entryPoints: string[] = status === "active"
    ? rawEntryPoints
        .map((item) => {
          if (typeof item === "string") return textFromRecord(item, [])
          const record = item && typeof item === "object" ? (item as Record<string, unknown>) : null
          const signal = record ? textFromRecord(record.signal, []) : null
          const angle = record ? textFromRecord(record.angle, []) : null
          if (!angle) return signal
          return signal ? `${signal} — ${angle}` : angle
        })
        .filter((value): value is string => value !== null)
    : []

  // Pain points
  const rawPainPoints = Array.isArray(sector.painPoints)
    ? (sector.painPoints as Array<{ id: string; title: string; description?: string | null; frequencyCount?: number; kredoPractice?: string | null; verbatim?: string | null }>)
    : []
  const painPoints: SectorPlaybookPainPoint[] = rawPainPoints.map((pp) => ({
    id: pp.id,
    title: pp.title,
    description: pp.description ?? null,
    frequencyCount: pp.frequencyCount ?? 0,
    kredoPractice: pp.kredoPractice ?? null,
    verbatim: pp.verbatim ?? null,
  }))

  // Deadlines from open and future windows (regulation only)
  const sectorWindows = windows.filter((w) => w.sectorId === sectorId && w.sourceType === "regulation")
  const deadlines: SectorPlaybookDeadline[] = sectorWindows.map((w) => ({
    title: w.title,
    date: w.deadlineAt,
    urgency: w.urgencyScore,
    authority: w.sourceLabel,
    practiceKey: w.practiceKey,
    sourceUrl: w.sourceUrl,
  }))

  // Key players
  const mapKeyPlayers = (players: Array<{ name?: string; note?: string; size?: string }>): SectorPlaybookActeurCle[] => {
    return players.map((p) => ({
      name: p.name ?? "",
      note: p.note ?? "",
      size: p.size ?? "",
    }))
  }

  const rawPaca = Array.isArray(sector.keyPlayersPaca)
    ? (sector.keyPlayersPaca as Array<{ name?: string; note?: string; size?: string }>)
    : []
  const rawNational = Array.isArray(sector.keyPlayersNational)
    ? (sector.keyPlayersNational as Array<{ name?: string; note?: string; size?: string }>)
    : []

  const keyPlayers = {
    paca: status === "active" ? mapKeyPlayers(rawPaca) : [],
    national: status === "active" ? mapKeyPlayers(rawNational) : [],
  }

  // Caveats and sources
  const caveatsRecord = sector.caveats && typeof sector.caveats === "object"
    ? (sector.caveats as Record<string, unknown>)
    : null

  const caveats: SectorPlaybookCaveat | null = status === "active" && caveatsRecord ? {
    verbatims: typeof caveatsRecord.verbatims === "string" ? caveatsRecord.verbatims : undefined,
    frequences: typeof caveatsRecord.frequences === "string" ? caveatsRecord.frequences : undefined,
    corpus: typeof caveatsRecord.corpus === "string" ? caveatsRecord.corpus : undefined,
    marche: typeof caveatsRecord.marche === "string" ? caveatsRecord.marche : undefined,
  } : null

  const sources: string[] = status === "active" && Array.isArray(caveatsRecord?.sources)
    ? (caveatsRecord.sources as string[])
    : []

  // Priority accounts linked to this sector
  const sectorAccounts = accounts
    .filter((a) => (a.segmentId ?? a.sectorId) === sectorId)
    .map((account) => ({
      account,
      topSignal: signals
        .filter((signal) => signal.companyId === account.id)
        .toSorted((left, right) => right.urgencyScore - left.urgencyScore || right.detectedAt.localeCompare(left.detectedAt))[0] ?? null,
    }))
    .toSorted((left, right) => {
      const signalUrgency = (right.topSignal?.urgencyScore ?? -1) - (left.topSignal?.urgencyScore ?? -1)
      if (signalUrgency !== 0) return signalUrgency
      const leftOpportunityWithoutPlan = left.account.openOpportunityCount > 0 && left.account.plannedCommercialEngagement30d === 0
      const rightOpportunityWithoutPlan = right.account.openOpportunityCount > 0 && right.account.plannedCommercialEngagement30d === 0
      if (leftOpportunityWithoutPlan !== rightOpportunityWithoutPlan) return rightOpportunityWithoutPlan ? 1 : -1
      if (left.account.inactivityRiskScore30d !== right.account.inactivityRiskScore30d) {
        return right.account.inactivityRiskScore30d - left.account.inactivityRiskScore30d
      }
      return left.account.name.localeCompare(right.account.name, "fr") || left.account.id.localeCompare(right.account.id)
    })

  const priorityAccounts = sectorAccounts.slice(0, 5).map(({ account, topSignal }) => {
    const action = topSignal?.recommendedAction ?? account.nextDecision ?? null

    return {
      id: account.id,
      name: account.name,
      reach: account.reachScore,
      momentum: account.momentumScore30d,
      openOpportunityCount: account.openOpportunityCount,
      inactivityRisk: account.inactivityRiskScore30d,
      signal: topSignal?.title ?? null,
      action,
    }
  })

  return {
    sectorId: sector.id,
    name: sector.name,
    slug: sector.slug,
    status,
    description: sector.description ?? null,
    marketSizeEurBn: sector.marketSizeEurBn ?? null,
    marketGrowthPct: sector.marketGrowthPct ?? null,
    digitalMaturity: sector.digitalMaturity ?? null,
    topPracticeLabel: sector.topPracticeLabel,
    practiceScores: sector.practiceScores ?? {},
    playbook: {
      personas,
      roiArguments,
      objections,
      entryPoints,
    },
    painPoints,
    deadlines,
    keyPlayers,
    caveats,
    sources,
    priorityAccounts,
    updatedAt: sector.updatedAt ?? null,
    averageReach: sector.averageReachScore ?? null,
    linkedAccountCount: sector.linkedAccountCount ?? 0,
    attractivenessScore: sector.attractivenessScore ?? null,
    summary: status === "active" ? "Secteur documenté et prêt à l'emploi" : "Étude sectorielle en préparation",
  }
}

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
    priority: number
    potential: number
    reach: number
    nativeScore: number | null
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
  sectorId: string
): BusinessIntelligenceSectorProfile | null {
  const { sectors, accounts, windows, scores, signals } = snapshot

  const sector = sectors.find(s => s.id === sectorId)
  if (!sector) return null

  // Playbook JSON parsing
  const rawPlaybook = sector.playbook ?? {}
  const status = (sector.status === "active" ? "active" : "watch") as "active" | "watch"

  const personas: SectorPlaybookPersona[] = status === "active"
    ? (rawPlaybook.personas ?? []).map((p: any) => ({
        role: p.role ?? "",
        enjeu: p.enjeu ?? "",
        peur: p.peur ?? "",
      }))
    : []

  const roiArguments: string[] = status === "active" && Array.isArray(rawPlaybook.roi_arguments)
    ? rawPlaybook.roi_arguments
    : []

  const objections: SectorPlaybookObjection[] = status === "active"
    ? (rawPlaybook.objections ?? []).map((o: any) => ({
        objection: o.objection ?? "",
        reponse: o.reponse ?? "",
      }))
    : []

  const entryPoints: string[] = status === "active" && Array.isArray(rawPlaybook.entry_points)
    ? rawPlaybook.entry_points
    : []

  // Pain points
  const painPoints: SectorPlaybookPainPoint[] = (sector.painPoints ?? []).map((pp: any) => ({
    id: pp.id,
    title: pp.title,
    description: pp.description,
    frequencyCount: pp.frequencyCount,
    kredoPractice: pp.kredoPractice,
    verbatim: pp.verbatim,
  }))

  // Deadlines from open and future windows (regulation only)
  const sectorWindows = windows.filter(w => w.sectorId === sectorId && w.sourceType === "regulation")
  const deadlines: SectorPlaybookDeadline[] = sectorWindows.map(w => ({
    title: w.title,
    date: w.deadlineAt,
    urgency: w.urgencyScore,
    authority: w.sourceLabel,
    practiceKey: w.practiceKey,
    sourceUrl: w.sourceUrl
  }))

  // Key players
  const mapKeyPlayers = (players: any[]): SectorPlaybookActeurCle[] => {
    return (players ?? []).map((p: any) => ({
      name: p.name ?? "",
      note: p.note ?? "",
      size: p.size ?? "",
    }))
  }

  const keyPlayers = {
    paca: status === "active" ? mapKeyPlayers(sector.keyPlayersPaca ?? []) : [],
    national: status === "active" ? mapKeyPlayers(sector.keyPlayersNational ?? []) : [],
  }

  // Caveats and sources
  const caveats: SectorPlaybookCaveat | null = status === "active" && sector.caveats ? {
    verbatims: sector.caveats.verbatims,
    frequences: sector.caveats.frequences,
    corpus: sector.caveats.corpus,
    marche: sector.caveats.marche,
  } : null

  const sources: string[] = status === "active" && sector.caveats?.sources
    ? sector.caveats.sources
    : []

  // Priority accounts linked to this sector
  const sectorAccounts = accounts
    .filter(a => a.sectorId === sectorId)
    .toSorted((a, b) => b.actionPriorityScore30d - a.actionPriorityScore30d)

  const priorityAccounts = sectorAccounts.slice(0, 5).map(a => {
    const nativeScore = scores[a.id]
    const aSignals = signals.filter(sig => sig.companyId === a.id)
      .toSorted((x, y) => y.urgencyScore - x.urgencyScore)
    const topSig = aSignals[0] ?? null
    const action = topSig?.recommendedAction ?? a.nextDecision ?? null

    return {
      id: a.id,
      name: a.name,
      priority: a.actionPriorityScore30d,
      potential: a.potentialScore,
      reach: a.reachScore,
      nativeScore: nativeScore ? nativeScore.scoreValue : null,
      signal: topSig ? topSig.title : null,
      action: action,
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


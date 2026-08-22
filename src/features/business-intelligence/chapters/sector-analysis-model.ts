import type { SectorKnowledgeReadModel, SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import { provenanceLabel } from "../home/home-model"

export type ParsedPlayer = {
  name: string
  note: string
  size: string
}

export type ParsedCaveats = {
  corpus?: string
  verbatims?: string
  frequences?: string
  marche?: string
  sources: string[]
}

export type SectorMarketKpi = {
  label: string
  value: string
  level: SectorResolvedLevel | null
  isLocked?: boolean
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)
}

export function formatAttractiveness(score: number | null): string | null {
  if (score === null || !Number.isFinite(score)) return null
  return `${formatNumber(score)} / 5`
}

export function formatDigitalMaturity(maturity: string | null | undefined): string | null {
  if (!maturity || typeof maturity !== "string") return null
  const normalized = maturity.trim().toLowerCase()
  if (normalized === "low") return "Faible"
  if (normalized === "medium") return "Intermédiaire"
  if (normalized === "high") return "Élevée"
  return maturity.trim()
}

export function formatMarketSize(
  size: number | null,
  level: SectorResolvedLevel | null | undefined,
): { value: string; isLocked?: boolean } | null {
  if (size !== null && Number.isFinite(size)) {
    return { value: `${formatNumber(size)} Md€` }
  }
  if (level === "locked") {
    return { value: "Non publiée", isLocked: true }
  }
  return null
}

export function formatMarketGrowth(
  growth: number | null,
  level: SectorResolvedLevel | null | undefined,
): { value: string; isLocked?: boolean } | null {
  if (growth !== null && Number.isFinite(growth)) {
    return { value: `${formatNumber(growth)} %` }
  }
  if (level === "locked") {
    return { value: "Non publiée", isLocked: true }
  }
  return null
}

export function formatTjmRange(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null && Number.isFinite(min) && Number.isFinite(max)) {
    return `${formatNumber(min)}–${formatNumber(max)} €`
  }
  return null
}

export function parseKeyPlayers(raw: unknown): ParsedPlayer[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === "string" && item.trim().length > 0) {
        return { name: item.trim(), note: "", size: "" }
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>
        const name = typeof record.name === "string" ? record.name.trim() : typeof record.nom === "string" ? record.nom.trim() : ""
        const note = typeof record.note === "string" ? record.note.trim() : typeof record.description === "string" ? record.description.trim() : ""
        const size = typeof record.size === "string" ? record.size.trim() : typeof record.taille === "string" ? record.taille.trim() : ""
        if (name.length > 0) return { name, note, size }
      }
      return null
    })
    .filter((p): p is ParsedPlayer => p !== null)
}

export function parseCaveats(raw: unknown): ParsedCaveats | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const sources = Array.isArray(record.sources)
    ? record.sources.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : []
  const corpus = typeof record.corpus === "string" && record.corpus.trim().length > 0 ? record.corpus.trim() : undefined
  const verbatims = typeof record.verbatims === "string" && record.verbatims.trim().length > 0 ? record.verbatims.trim() : undefined
  const frequences = typeof record.frequences === "string" && record.frequences.trim().length > 0 ? record.frequences.trim() : undefined
  const marche = typeof record.marche === "string" && record.marche.trim().length > 0 ? record.marche.trim() : undefined

  if (!corpus && !verbatims && !frequences && !marche && sources.length === 0) return null
  return { corpus, verbatims, frequences, marche, sources }
}

export function buildSectorMarketKpis(knowledge: SectorKnowledgeReadModel): SectorMarketKpi[] {
  const items: Array<SectorMarketKpi | null> = []

  // 1. Taille de marché
  const marketSize = formatMarketSize(knowledge.marketSizeEurBn, knowledge.marketSizeEurBnLevel)
  if (marketSize) {
    items.push({
      label: "Taille de marché",
      value: marketSize.value,
      level: marketSize.isLocked ? null : knowledge.marketSizeEurBnLevel,
      isLocked: marketSize.isLocked,
    })
  }

  // 2. Croissance
  const growth = formatMarketGrowth(knowledge.marketGrowthPct, knowledge.marketGrowthPctLevel)
  if (growth) {
    items.push({
      label: "Croissance annuelle",
      value: growth.value,
      level: growth.isLocked ? null : knowledge.marketGrowthPctLevel,
      isLocked: growth.isLocked,
    })
  }

  // 3. Attractivité
  const attractiveness = formatAttractiveness(knowledge.attractivenessScore)
  if (attractiveness) {
    items.push({
      label: "Score d’attractivité",
      value: attractiveness,
      level: knowledge.attractivenessScoreLevel,
    })
  }

  // 4. Maturité numérique
  const maturity = formatDigitalMaturity(knowledge.digitalMaturity)
  if (maturity) {
    items.push({
      label: "Maturité numérique",
      value: maturity,
      level: null,
    })
  }

  // 5. TJM de référence
  const tjm = formatTjmRange(knowledge.avgTjmMin, knowledge.avgTjmMax)
  if (tjm) {
    items.push({
      label: "TJM de référence",
      value: tjm,
      level: null,
    })
  }

  return items.filter((item): item is SectorMarketKpi => item !== null)
}

export { provenanceLabel }

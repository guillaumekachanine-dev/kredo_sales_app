import type { SectorKnowledgeReadModel, SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import { provenanceLabel } from "../home/home-model"

export type ParsedPlayer = {
  name: string
  note: string
  size: string
}


export type SectorClientBlock = {
  nom: string
  type: "bloc_client"
  quiFinance: string
  cycleBudgetaire: string
  srcIds: number[]
}

export type SectorEconomicModel = {
  nom: string
  type: "modele_economique"
  description: string
  quiSigne: string
  quandLeBudgetEstEngage: string
  implicationAchatPrestation: string
  doncCommercialement: string
  srcIds: number[]
}

export type SectorTechFront = {
  nom: string
  etat: string | null
  zoneDeTransition: boolean
  doncCommercialement: string | null
  srcIds: number[]
}

function parseSrcIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((val) => {
      if (typeof val === "number" && Number.isInteger(val) && val > 0) return val
      if (typeof val === "string") {
        const parsed = parseInt(val, 10)
        if (!isNaN(parsed) && parsed > 0) return parsed
      }
      return null
    })
    .filter((v): v is number => v !== null)
}

export function parseEconomicModels(playbook: Record<string, unknown> | null | undefined): {
  clientBlocks: SectorClientBlock[]
  economicModels: SectorEconomicModel[]
} {
  const rawList = playbook?.economic_models
  if (!Array.isArray(rawList)) {
    return { clientBlocks: [], economicModels: [] }
  }

  const clientBlocks: SectorClientBlock[] = []
  const economicModels: SectorEconomicModel[] = []

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const type = typeof rec.type === "string" ? rec.type.trim() : null

    if (type === "bloc_client") {
      const nom = typeof rec.nom === "string" ? rec.nom.trim() : typeof rec.name === "string" ? rec.name.trim() : ""
      if (!nom) continue
      const quiFinance =
        typeof rec.qui_finance === "string"
          ? rec.qui_finance.trim()
          : typeof rec.quiFinance === "string"
            ? rec.quiFinance.trim()
            : ""
      const cycleBudgetaire =
        typeof rec.cycle_budgetaire === "string"
          ? rec.cycle_budgetaire.trim()
          : typeof rec.cycleBudgetaire === "string"
            ? rec.cycleBudgetaire.trim()
            : ""
      const srcIds = parseSrcIds(rec.src_ids ?? rec.srcIds)

      clientBlocks.push({
        nom,
        type: "bloc_client",
        quiFinance,
        cycleBudgetaire,
        srcIds,
      })
    } else if (type === "modele_economique") {
      const nom = typeof rec.nom === "string" ? rec.nom.trim() : typeof rec.name === "string" ? rec.name.trim() : ""
      if (!nom) continue
      const description = typeof rec.description === "string" ? rec.description.trim() : ""
      const quiSigne =
        typeof rec.qui_signe === "string"
          ? rec.qui_signe.trim()
          : typeof rec.quiSigne === "string"
            ? rec.quiSigne.trim()
            : ""
      const quandLeBudgetEstEngage =
        typeof rec.quand_le_budget_est_engage === "string"
          ? rec.quand_le_budget_est_engage.trim()
          : typeof rec.quandLeBudgetEstEngage === "string"
            ? rec.quandLeBudgetEstEngage.trim()
            : ""
      const implicationAchatPrestation =
        typeof rec.implication_achat_prestation === "string"
          ? rec.implication_achat_prestation.trim()
          : typeof rec.implicationAchatPrestation === "string"
            ? rec.implicationAchatPrestation.trim()
            : ""
      const doncCommercialement =
        typeof rec.donc_commercialement === "string"
          ? rec.donc_commercialement.trim()
          : typeof rec.doncCommercialement === "string"
            ? rec.doncCommercialement.trim()
            : ""
      const srcIds = parseSrcIds(rec.src_ids ?? rec.srcIds)

      economicModels.push({
        nom,
        type: "modele_economique",
        description,
        quiSigne,
        quandLeBudgetEstEngage,
        implicationAchatPrestation,
        doncCommercialement,
        srcIds,
      })
    }
  }

  return { clientBlocks, economicModels }
}

export function parseTechFronts(playbook: Record<string, unknown> | null | undefined): SectorTechFront[] {
  const rawList = playbook?.tech_fronts
  if (!Array.isArray(rawList)) {
    return []
  }

  const techFronts: SectorTechFront[] = []

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const nom = typeof rec.nom === "string" ? rec.nom.trim() : typeof rec.name === "string" ? rec.name.trim() : ""
    if (!nom) continue

    const etat = typeof rec.etat === "string" && rec.etat.trim().length > 0 ? rec.etat.trim() : null
    const zoneDeTransition = Boolean(rec.zone_de_transition ?? rec.zoneDeTransition ?? false)
    const doncCommercialement =
      typeof rec.donc_commercialement === "string" && rec.donc_commercialement.trim().length > 0
        ? rec.donc_commercialement.trim()
        : typeof rec.doncCommercialement === "string" && rec.doncCommercialement.trim().length > 0
          ? rec.doncCommercialement.trim()
          : null
    const srcIds = parseSrcIds(rec.src_ids ?? rec.srcIds)

    techFronts.push({
      nom,
      etat,
      zoneDeTransition,
      doncCommercialement,
      srcIds,
    })
  }

  return techFronts
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

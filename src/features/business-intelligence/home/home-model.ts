import type { SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

export type SegmentHomeKpi = {
  label: string
  value: string
  level: SectorResolvedLevel | null
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)
}

export function buildSegmentHomeKpis(workspace: LoadedWorkspace): SegmentHomeKpi[] {
  const items: Array<SegmentHomeKpi | null> = [
    { label: "Comptes portefeuille", value: String(workspace.portfolio.accounts.length), level: null },
    workspace.knowledge.marketSizeEurBn !== null ? { label: "Marché", value: `${formatNumber(workspace.knowledge.marketSizeEurBn)} Md€`, level: workspace.knowledge.marketSizeEurBnLevel } : null,
    workspace.knowledge.marketGrowthPct !== null ? { label: "Croissance", value: `${formatNumber(workspace.knowledge.marketGrowthPct)} %`, level: workspace.knowledge.marketGrowthPctLevel } : null,
    workspace.knowledge.attractivenessScore !== null ? { label: "Attractivité", value: formatNumber(workspace.knowledge.attractivenessScore), level: workspace.knowledge.attractivenessScoreLevel } : null,
    workspace.knowledge.avgTjmMin !== null && workspace.knowledge.avgTjmMax !== null ? { label: "TJM observé", value: `${formatNumber(workspace.knowledge.avgTjmMin)}–${formatNumber(workspace.knowledge.avgTjmMax)} €`, level: null } : null,
    workspace.knowledge.digitalMaturity ? { label: "Maturité numérique", value: workspace.knowledge.digitalMaturity, level: null } : null,
  ]
  return items.filter((item): item is SegmentHomeKpi => item !== null).slice(0, 5)
}

export function provenanceLabel(level: SectorResolvedLevel | null): string | null {
  if (level === "segment") return "Segment"
  if (level === "macro") return "Macro"
  if (level === "locked") return "Verrouillé"
  if (level === "estimated") return "Estimé"
  return null
}

export function formatStudyDate(value: string | null): string {
  if (!value) return "Étude non datée"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Étude non datée"
  return `Étude du ${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`
}

export type ParsedCadre = {
  perimetre: string
  horsChamp: string[]
  regleComparabilite: string
}

export type ParsedThesis = {
  id: number
  these: string
  srcIds: number[]
  doncCommercialement: string
}

export type ParsedTrajectoire = {
  trajectoire: string
  familleBudget: string
  offreKredo: string
  srcIds: number[]
}

export function parseCadre(rawPlaybook: Record<string, unknown> | null): ParsedCadre | null {
  if (!rawPlaybook || typeof rawPlaybook !== 'object') return null
  const cadre = rawPlaybook.cadre
  if (!cadre || typeof cadre !== 'object') return null
  const record = cadre as Record<string, unknown>
  const perimetre = typeof record.perimetre === 'string' ? record.perimetre.trim() : ''
  const horsChamp = Array.isArray(record.hors_champ)
    ? record.hors_champ.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const regleComparabilite = typeof record.regle_comparabilite === 'string' ? record.regle_comparabilite.trim() : ''

  if (!perimetre && horsChamp.length === 0 && !regleComparabilite) return null
  return { perimetre, horsChamp, regleComparabilite }
}

export function parseMessageSectoriel(rawPlaybook: Record<string, unknown> | null): string | null {
  if (!rawPlaybook || typeof rawPlaybook !== 'object') return null
  const msg = rawPlaybook.message_sectoriel
  if (typeof msg === 'string' && msg.trim().length > 0) {
    return msg.trim()
  }
  return null
}

export function parseMarketThesis(rawPlaybook: Record<string, unknown> | null): ParsedThesis[] {
  if (!rawPlaybook || typeof rawPlaybook !== 'object') return []
  const theses = rawPlaybook.market_thesis ?? rawPlaybook.theses
  if (!Array.isArray(theses)) return []

  return theses
    .map((item, idx): ParsedThesis | null => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const id = typeof record.id === 'number' ? record.id : idx + 1
      const these = typeof record.these === 'string' ? record.these.trim() : ''
      const avecDonation = typeof record.donc_commercialement === 'string' ? record.donc_commercialement.trim() : ''
      const srcIds = Array.isArray(record.src_ids)
        ? record.src_ids.filter((s): s is number => typeof s === 'number' && Number.isFinite(s))
        : []

      if (!these) return null
      return { id, these, srcIds, doncCommercialement: avecDonation }
    })
    .filter((t): t is ParsedThesis => t !== null)
}

export function parseTrajectoires(rawPlaybook: Record<string, unknown> | null): ParsedTrajectoire[] {
  if (!rawPlaybook || typeof rawPlaybook !== 'object') return []
  const rawTraj = rawPlaybook.trajectoires ?? rawPlaybook.budgets_18_36_mois
  if (!Array.isArray(rawTraj)) return []

  return rawTraj
    .map((item): ParsedTrajectoire | null => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const trajectoire = typeof record.trajectoire === 'string' ? record.trajectoire.trim() : ''
      const familleBudget = typeof record.famille_budget === 'string' ? record.famille_budget.trim() : ''
      const offreKredo = typeof record.offre_kredo === 'string' ? record.offre_kredo.trim() : ''
      const srcIds = Array.isArray(record.src_ids)
        ? record.src_ids.filter((s): s is number => typeof s === 'number' && Number.isFinite(s))
        : []

      if (!trajectoire && !familleBudget && !offreKredo) return null
      return { trajectoire, familleBudget, offreKredo, srcIds }
    })
    .filter((t): t is ParsedTrajectoire => t !== null)
}

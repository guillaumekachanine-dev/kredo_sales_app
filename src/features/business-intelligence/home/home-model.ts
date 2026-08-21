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

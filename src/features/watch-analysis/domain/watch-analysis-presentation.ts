import type { StrategicWatchAnalysis, StrategicWatchAnalysisContent } from "@/components/veille/veille-desktop-contracts"
import type { WatchAnalysisEvidenceRef } from "@/lib/n8n/types"
import { formatDateFr } from "@/lib/formatters"

export function isManualCustomWatchAnalysis(
  analysis: Pick<StrategicWatchAnalysis, "analysisKind"> & { content?: { schemaVersion?: number } | null }
): boolean {
  return analysis.analysisKind === "manual_custom" || analysis.content?.schemaVersion === 2
}

export function getWatchAnalysisKindLabel(analysis: StrategicWatchAnalysis): string {
  if (isManualCustomWatchAnalysis(analysis)) {
    return "À la demande"
  }
  return "Mensuelle"
}

export function getWatchAnalysisBadgeStyle(
  analysis: Pick<StrategicWatchAnalysis, "analysisKind"> & { content?: { schemaVersion?: number } | null }
): {
  badgeClassName: string
  textClassName: string
  dotClassName: string
  borderClassName: string
  isManualCustom: boolean
} {
  const isManual = isManualCustomWatchAnalysis(analysis)
  if (isManual) {
    return {
      badgeClassName: "border border-[#2554B8]/30 bg-[#2554B8]/10 text-[#2554B8]",
      textClassName: "text-[#2554B8]",
      dotClassName: "bg-[#2554B8]",
      borderClassName: "border-[#2554B8]",
      isManualCustom: true,
    }
  }
  return {
    badgeClassName: "border border-brand-brass/30 bg-brand-brass/10 text-brand-brass",
    textClassName: "text-brand-brass",
    dotClassName: "bg-brand-brass",
    borderClassName: "border-brand-brass",
    isManualCustom: false,
  }
}

export function getWatchAnalysisDateLabel(analysis: StrategicWatchAnalysis): string {
  if (analysis.analysisKind === "manual_custom" || analysis.content?.schemaVersion === 2) {
    return `Généré le ${formatDateFr(analysis.createdAt)}`
  }
  if (analysis.periodStart && analysis.periodEnd) {
    return `${formatDateFr(analysis.periodStart)} — ${formatDateFr(analysis.periodEnd)}`
  }
  return `Généré le ${formatDateFr(analysis.createdAt)}`
}

export type NormalizedWatchAnalysisCoverage = {
  isV2: boolean
  sourceGroups: number | null
  resolvedRefs: number | null
  digestsCount: number | null
  articlesCount: number
  signalsCount: number | null
  documentsCount: number | null
  totalItems: number
}

export function getWatchAnalysisCoverage(
  content: StrategicWatchAnalysisContent | null
): NormalizedWatchAnalysisCoverage | null {
  if (!content) return null

  if (content.schemaVersion === 2) {
    const cov = content.coverage
    return {
      isV2: true,
      sourceGroups: cov.sourceGroups,
      resolvedRefs: cov.resolvedRefs,
      digestsCount: null,
      articlesCount: cov.articlesCount,
      signalsCount: cov.signalsCount,
      documentsCount: cov.documentsCount,
      totalItems: cov.totalItems,
    }
  }

  const cov = content.coverage
  return {
    isV2: false,
    sourceGroups: null,
    resolvedRefs: cov.sourcesCount,
    digestsCount: cov.digestsCount,
    articlesCount: cov.articlesCount,
    signalsCount: null,
    documentsCount: null,
    totalItems: cov.articlesCount,
  }
}

export function formatEvidenceRef(ref: WatchAnalysisEvidenceRef): { title: string; provenance: string } {
  return {
    title: ref.title || "Source non titrée",
    provenance: ref.provenance || "KREDO",
  }
}

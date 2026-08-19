import { describe, expect, it } from "vitest"
import type { StrategicWatchAnalysis } from "@/components/veille/veille-desktop-contracts"
import type { WatchAnalysisOutputV2 } from "@/lib/n8n/types"
import {
  formatEvidenceRef,
  getWatchAnalysisCoverage,
  getWatchAnalysisDateLabel,
  getWatchAnalysisKindLabel,
} from "../domain/watch-analysis-presentation"
import { buildAnalysisIndex, buildArchiveEntries } from "@/components/veille/mobile/veille-mobile-view-models"

describe("Adaptateur de présentation et view-models V1 + V2", () => {
  const analysisV1: StrategicWatchAnalysis = {
    id: "v1-doc-1",
    title: "Analyse stratégique de 2026-07",
    status: "ready",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    versionNumber: 1,
    analysisKind: "monthly",
    content: {
      schemaVersion: 1,
      period: { start: "2026-07-01", end: "2026-07-31", label: "juillet 2026" },
      executiveSummary: "Synthèse mensuelle",
      majorTrends: [],
      weakSignals: [],
      regulatoryDevelopments: [],
      commercialOpportunities: [],
      risksAndWatchpoints: [],
      priorityActions: [],
      coverage: { digestsCount: 4, articlesCount: 25, sourcesCount: 8 },
    },
  }

  const outputV2: WatchAnalysisOutputV2 = {
    schemaVersion: 2,
    analysisKind: "manual_custom",
    title: "Analyse sur demande Santé",
    executiveSummary: "Synthèse à la demande V2",
    majorTrends: [
      {
        title: "Poussée des réglementations",
        synthesis: "Synthese",
        sectors: ["Santé"],
        confidence: 0.9,
        evidenceRefs: [
          { kind: "intelligence_document", id: "doc-99", title: "Rapport HAS", provenance: "Bibliothèque" },
        ],
      },
    ],
    weakSignals: [],
    regulatoryDevelopments: [],
    commercialOpportunities: [],
    risksAndWatchpoints: [],
    priorityActions: [],
    coverage: {
      sourceGroups: 2,
      resolvedRefs: 4,
      articlesCount: 6,
      signalsCount: 3,
      documentsCount: 2,
      totalItems: 11,
    },
  }

  const analysisV2: StrategicWatchAnalysis = {
    id: "v2-doc-2",
    title: "Analyse sur demande Santé",
    status: "ready",
    periodStart: null,
    periodEnd: null,
    createdAt: "2026-08-19T14:00:00Z",
    updatedAt: "2026-08-19T14:00:00Z",
    versionNumber: 1,
    analysisKind: "manual_custom",
    content: outputV2,
  }

  it("getWatchAnalysisKindLabel distingue correctement V1 et V2", () => {
    expect(getWatchAnalysisKindLabel(analysisV1)).toBe("Mensuelle")
    expect(getWatchAnalysisKindLabel(analysisV2)).toBe("À la demande")
  })

  it("getWatchAnalysisDateLabel ne génère jamais 'Période non renseignée' pour V2", () => {
    expect(getWatchAnalysisDateLabel(analysisV1)).toContain("2026")
    expect(getWatchAnalysisDateLabel(analysisV2)).toBe("Généré le 19 août 2026")
  })

  it("getWatchAnalysisCoverage calcule la couverture appropriée", () => {
    const cov1 = getWatchAnalysisCoverage(analysisV1.content)
    expect(cov1?.isV2).toBe(false)
    expect(cov1?.digestsCount).toBe(4)
    expect(cov1?.articlesCount).toBe(25)

    const cov2 = getWatchAnalysisCoverage(analysisV2.content)
    expect(cov2?.isV2).toBe(true)
    expect(cov2?.digestsCount).toBeNull()
    expect(cov2?.articlesCount).toBe(6)
    expect(cov2?.signalsCount).toBe(3)
    expect(cov2?.documentsCount).toBe(2)
  })

  it("formatEvidenceRef extrait le titre et la provenance", () => {
    const ref = formatEvidenceRef({
      kind: "account_signal",
      id: "sig-1",
      title: "Signal d'embauche",
      provenance: "Compte Sanofi",
    })
    expect(ref.title).toBe("Signal d'embauche")
    expect(ref.provenance).toBe("Compte Sanofi")
  })

  it("buildAnalysisIndex (mobile) supporte V1 et V2", () => {
    const idx1 = buildAnalysisIndex(analysisV1)
    expect(idx1.periodLabel).toBe("juillet 2026")

    const idx2 = buildAnalysisIndex(analysisV2)
    expect(idx2.periodLabel).toBe("Analyse à la demande")
    expect(idx2.periodRange).toBeNull()
    expect(idx2.coverageLabel).toContain("6 articles")
    expect(idx2.sections[0]?.items[0]?.evidenceRefs?.length).toBe(1)
  })

  it("buildArchiveEntries (mobile) date et étiquette V2 correctement", () => {
    const entries = buildArchiveEntries({
      digests: [],
      analyses: [analysisV1, analysisV2],
      articleCountByDigest: new Map(),
    })

    expect(entries.length).toBe(2)
    const v2Entry = entries.find((e) => e.id === "v2-doc-2")
    expect(v2Entry?.kindLabel).toBe("Analyse à la demande")
    expect(v2Entry?.date).toBe("2026-08-19")
  })
})

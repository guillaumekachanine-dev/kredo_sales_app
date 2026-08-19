import { describe, expect, it } from "vitest"
import {
  parseMonthlyWatchAnalysisOutput,
  parseStrategicWatchAnalysisOutput,
  parseWatchAnalysisOutputV2,
} from "@/components/veille/veille-desktop-contracts"
import type { WatchAnalysisOutputV2 } from "@/lib/n8n/types"
import type { Json } from "@/types/database"

describe("Parsers d'analyses stratégiques (V1 + V2)", () => {
  const sampleV1: Json = {
    schemaVersion: 1,
    period: { start: "2026-07-01", end: "2026-07-31", label: "juillet 2026" },
    executiveSummary: "Synthèse V1",
    majorTrends: [
      {
        title: "Tendance 1",
        synthesis: "Synthese trend",
        articleIds: ["art-1"],
        sectors: ["Santé"],
        confidence: 0.9,
      },
    ],
    weakSignals: [],
    regulatoryDevelopments: [],
    commercialOpportunities: [],
    risksAndWatchpoints: [],
    priorityActions: [],
    coverage: { digestsCount: 2, articlesCount: 10, sourcesCount: 4 },
  }

  const sampleV2: WatchAnalysisOutputV2 = {
    schemaVersion: 2,
    analysisKind: "manual_custom",
    title: "Analyse sur mesure IA Santé",
    executiveSummary: "Synthèse V2",
    majorTrends: [
      {
        title: "Tendance V2",
        synthesis: "Synthese V2 trend",
        sectors: ["IA", "Santé"],
        confidence: 0.95,
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
      resolvedRefs: 3,
      articlesCount: 5,
      signalsCount: 2,
      documentsCount: 1,
      totalItems: 8,
    },
  }

  it("parseMonthlyWatchAnalysisOutput valide uniquement les schémas V1", () => {
    expect(parseMonthlyWatchAnalysisOutput(sampleV1)).toEqual(sampleV1)
    expect(parseMonthlyWatchAnalysisOutput(sampleV2 as unknown as Json)).toBeNull()
  })

  it("parseWatchAnalysisOutputV2 valide les schémas V2", () => {
    expect(parseWatchAnalysisOutputV2(sampleV2 as unknown as Json)).toEqual(sampleV2)
    expect(parseWatchAnalysisOutputV2(sampleV1)).toBeNull()
  })

  it("parseStrategicWatchAnalysisOutput dérive proprement entre V1 et V2", () => {
    const parsedV1 = parseStrategicWatchAnalysisOutput(sampleV1)
    expect(parsedV1).not.toBeNull()
    expect(parsedV1?.schemaVersion).toBe(1)

    const parsedV2 = parseStrategicWatchAnalysisOutput(sampleV2 as unknown as Json)
    expect(parsedV2).not.toBeNull()
    expect(parsedV2?.schemaVersion).toBe(2)
  })

  it("rejette un schéma version inconnue", () => {
    const sampleV3: Json = { schemaVersion: 3, title: "Future version" }
    expect(parseStrategicWatchAnalysisOutput(sampleV3)).toBeNull()
  })

  it("retourne null sans planter en cas d'objet V2 malformé", () => {
    const badV2: Json = {
      schemaVersion: 2,
      analysisKind: "manual_custom",
      title: "Analyse cassée",
      // executiveSummary manquant
      majorTrends: "pas un tableau",
    }
    expect(parseWatchAnalysisOutputV2(badV2)).toBeNull()
    expect(parseStrategicWatchAnalysisOutput(badV2)).toBeNull()
  })
})

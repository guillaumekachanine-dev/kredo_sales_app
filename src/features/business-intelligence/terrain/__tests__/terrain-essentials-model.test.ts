import { describe, expect, it } from "vitest"
import {
  buildTerrainEssentials,
  selectTerrainCriticalDependencies,
  selectTerrainValueChainEndpoints,
  type TerrainCriticalDependency,
  type TerrainValueChainEndpoint,
} from "../terrain-essentials-model"
import type { BusinessIntelligenceSegmentWorkspace } from "../../data/business-intelligence-workspace-types"

type LoadedWorkspace = Extract<
  BusinessIntelligenceSegmentWorkspace,
  { state: "ready" | "empty" }
>

function makeStep(id: string, label: string, order: number): TerrainValueChainEndpoint {
  return {
    id,
    order,
    stageLabel: `Stage ${order}`,
    activityLabel: label,
    description: `Description pour ${label}`,
  }
}

function makeDependency(
  nom: string,
  criticite: "haute" | "moyenne" | "faible" | null,
  overrides?: Partial<TerrainCriticalDependency>,
): TerrainCriticalDependency {
  return {
    nom,
    criticite,
    situation: overrides?.situation ?? "Situation test",
    risque: overrides?.risque ?? "Risque test",
    practiceKredo: overrides?.practiceKredo ?? "data-ai",
    prestationOuverte: overrides?.prestationOuverte ?? "Prestation test",
    doncCommercialement: overrides?.doncCommercialement ?? null,
    srcIds: overrides?.srcIds ?? [10, 11],
  }
}

describe("selectTerrainValueChainEndpoints", () => {
  it("returns [] for empty steps array", () => {
    expect(selectTerrainValueChainEndpoints([])).toEqual([])
  })

  it("returns the single step when 1 step is provided", () => {
    const step = makeStep("step-1", "Sourcing", 1)
    const result = selectTerrainValueChainEndpoints([step])
    expect(result).toEqual([step])
  })

  it("returns first and last steps when 2 steps are provided", () => {
    const s1 = makeStep("s1", "Sourcing", 1)
    const s2 = makeStep("s2", "Distribution", 2)
    const steps = [s1, s2]

    const result = selectTerrainValueChainEndpoints(steps)
    expect(result).toEqual([s1, s2])
    expect(steps).toEqual([s1, s2]) // Non-mutating
  })

  it("returns premier + dernier maillon for 6 steps while preserving source order", () => {
    const steps = [
      makeStep("s1", "Sourcing matières", 1),
      makeStep("s2", "Qualification labo", 2),
      makeStep("s3", "Formulation", 3),
      makeStep("s4", "Contrôle qualité", 4),
      makeStep("s5", "Conditionnement", 5),
      makeStep("s6", "Livraison client B2B", 6),
    ]

    const result = selectTerrainValueChainEndpoints(steps)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(steps[0])
    expect(result[1]).toEqual(steps[5])
    expect(steps[0].id).toBe("s1")
    expect(steps[5].id).toBe("s6")
  })

  it("does not mutate original steps array and invents no scores", () => {
    const original = [makeStep("s1", "A", 1), makeStep("s2", "B", 2), makeStep("s3", "C", 3)]
    const snapshot = JSON.stringify(original)

    const result = selectTerrainValueChainEndpoints(original)
    expect(JSON.stringify(original)).toBe(snapshot)
    expect(result).toHaveLength(2)
    // Verify no extraneous scoring fields added
    expect(Object.keys(result[0])).toEqual(["id", "order", "stageLabel", "activityLabel", "description"])
  })
})

describe("selectTerrainCriticalDependencies", () => {
  it("returns [] for empty dependencies array", () => {
    expect(selectTerrainCriticalDependencies([])).toEqual([])
  })

  it("returns 1 dependency when only 1 is provided", () => {
    const dep = makeDependency("Matières naturelles", "haute")
    expect(selectTerrainCriticalDependencies([dep])).toEqual([dep])
  })

  it("returns 2 dependencies when 2 are provided", () => {
    const d1 = makeDependency("Matières", "moyenne")
    const d2 = makeDependency("IFRA", "haute")
    const result = selectTerrainCriticalDependencies([d1, d2])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(d2) // Haute comes before Moyenne
    expect(result[1]).toEqual(d1)
  })

  it("selects top 2 most critical dependencies from 3+ items and preserves source order on ties", () => {
    const d1 = makeDependency("Dep 1 (haute)", "haute")
    const d2 = makeDependency("Dep 2 (haute)", "haute")
    const d3 = makeDependency("Dep 3 (haute)", "haute")
    const d4 = makeDependency("Dep 4 (moyenne)", "moyenne")
    const d5 = makeDependency("Dep 5 (faible)", "faible")

    const dependencies = [d1, d2, d3, d4, d5]
    const result = selectTerrainCriticalDependencies(dependencies)

    expect(result).toHaveLength(2)
    // Ties on "haute" must preserve source array order: d1 then d2
    expect(result[0]).toEqual(d1)
    expect(result[1]).toEqual(d2)
  })

  it("handles null criticality gracefully behind explicit ranks", () => {
    const dNull = makeDependency("Dep sans criticite", null)
    const dFaible = makeDependency("Dep faible", "faible")
    const dHaute = makeDependency("Dep haute", "haute")

    const result = selectTerrainCriticalDependencies([dNull, dFaible, dHaute])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(dHaute)
    expect(result[1]).toEqual(dFaible)
  })

  it("does not mutate source array", () => {
    const list = [
      makeDependency("A", "faible"),
      makeDependency("B", "haute"),
      makeDependency("C", "moyenne"),
    ]
    const snapshot = JSON.stringify(list)

    selectTerrainCriticalDependencies(list)
    expect(JSON.stringify(list)).toBe(snapshot)
  })
})

describe("buildTerrainEssentials", () => {
  it("returns null when both valueChain and dependencies are empty", () => {
    const emptyWorkspace = {
      state: "ready",
      sourceResolution: {},
      corpusMetadata: null,
      segment: { id: "seg-1", name: "Segment 1", slug: "seg-1", status: "published", macro: null },
      knowledge: {
        studySnapshotDate: "2026-08-22",
        marketSizeEurBn: 1.5,
        marketSizeEurBnLevel: "segment",
        marketGrowthPct: 4.2,
        marketGrowthPctLevel: "segment",
        attractivenessScore: 4,
        attractivenessScoreLevel: "segment",
        digitalMaturity: "high",
        avgTjmMin: 600,
        avgTjmMax: 900,
        playbook: {},
      },
      portfolio: {
        generatedAt: "2026-08-22",
        accounts: [],
        scores: {},
      },
      competitiveMap: null,
      valueChain: null,
      news: { items: [], updatedAt: null },
      coverage: {
        study: { available: true, level: "segment", updatedAt: "2026-08-22" },
        playbook: { available: true, level: "segment", updatedAt: "2026-08-22" },
        competitiveMap: { available: false, level: null, updatedAt: null },
        valueChain: { available: false, level: null, updatedAt: null },
        regulatory: { available: true, level: "segment", updatedAt: "2026-08-22" },
        news: { available: false, level: null, updatedAt: null },
      },
    } as unknown as LoadedWorkspace

    expect(buildTerrainEssentials(emptyWorkspace)).toBeNull()
  })

  it("returns partial model when only dependencies exist", () => {
    const partialWorkspace = {
      state: "ready",
      sourceResolution: {},
      corpusMetadata: null,
      segment: { id: "seg-1", name: "Segment 1", slug: "seg-1", status: "published", macro: null },
      knowledge: {
        studySnapshotDate: "2026-08-22",
        marketSizeEurBn: null,
        marketSizeEurBnLevel: null,
        marketGrowthPct: null,
        marketGrowthPctLevel: null,
        attractivenessScore: null,
        attractivenessScoreLevel: null,
        digitalMaturity: null,
        avgTjmMin: null,
        avgTjmMax: null,
        playbook: {
          dependances_critiques: [
            {
              nom: "Disponibilité matières",
              criticite: "haute",
              situation: "Situation",
              risque: "Risque de rupture",
              prestation_ouverte: "Workflow sourcing",
              src_ids: [1, 2],
            },
          ],
        },
      },
      portfolio: {
        generatedAt: "2026-08-22",
        accounts: [],
        scores: {},
      },
      competitiveMap: null,
      valueChain: null,
      news: { items: [], updatedAt: null },
      coverage: {
        study: { available: true, level: "segment", updatedAt: "2026-08-22" },
        playbook: { available: true, level: "segment", updatedAt: "2026-08-22" },
        competitiveMap: { available: false, level: null, updatedAt: null },
        valueChain: { available: false, level: null, updatedAt: null },
        regulatory: { available: true, level: "segment", updatedAt: "2026-08-22" },
        news: { available: false, level: null, updatedAt: null },
      },
    } as unknown as LoadedWorkspace

    const model = buildTerrainEssentials(partialWorkspace)
    expect(model).not.toBeNull()
    expect(model?.valueChainEndpoints).toEqual([])
    expect(model?.criticalDependencies).toHaveLength(1)
    expect(model?.criticalDependencies[0].nom).toBe("Disponibilité matières")
  })
})

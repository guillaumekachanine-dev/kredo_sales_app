import { describe, expect, it } from "vitest"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import {
  buildTerrainTopAccounts,
  resolveCommercialEligibility,
} from "../terrain-top-accounts-model"

function makeActor(overrides: Partial<CompetitiveMapActor>): CompetitiveMapActor {
  return {
    id: overrides.id ?? "actor-1",
    companyId: overrides.companyId ?? "company-1",
    name: overrides.name ?? "Test Company",
    category: overrides.category ?? "leader",
    categoryLabel: overrides.categoryLabel ?? "Leader",
    confidence: overrides.confidence ?? "haute",
    businessFootprintScore: overrides.businessFootprintScore ?? 80,
    digitalMaturityScore: overrides.digitalMaturityScore ?? 70,
    appetenceScore: overrides.appetenceScore ?? 25,
    accessibilityScore: overrides.accessibilityScore ?? 80,
    appetenceProvisoire: overrides.appetenceProvisoire ?? false,
    isPositioned: overrides.isPositioned ?? true,
    isBenchmarkAccount: overrides.isBenchmarkAccount ?? false,
    revenueEstimateMeur: overrides.revenueEstimateMeur ?? 100,
    revenueExercice: overrides.revenueExercice ?? 2025,
    revenuePerimetre: overrides.revenuePerimetre ?? "France",
    headcountFrance: overrides.headcountFrance ?? "250",
    positioning: overrides.positioning ?? "Positioning",
    forces: overrides.forces ?? "Forces",
    vulnerability: overrides.vulnerability ?? "Vulnerability",
    angleEntree: overrides.angleEntree ?? "Angle entrée",
    lifecycleStatus: overrides.lifecycleStatus ?? null,
    relationType: overrides.relationType ?? null,
    details: overrides.details ?? {
      propositionValeur: null,
      differenciateurs: [],
      dependances: [],
      chaineValeur: [],
      chantiersTechnologiques: [],
      triggers: [],
      lignesRouges: [],
      trous: [],
      metierChaineValeur: null,
      maillon: null,
      contratsMajeurs: [],
      grilles: [],
      coucheEsn: [],
      traductionCommerciale: [],
      iaAnnonceVsDeploye: null,
    },
  }
}

describe("resolveCommercialEligibility", () => {
  it("resolves prospect to eligible", () => {
    expect(resolveCommercialEligibility({ relationType: "prospect", lifecycleStatus: "prospect" })).toBe("eligible")
    expect(resolveCommercialEligibility({ relationType: "prospect" })).toBe("eligible")
    expect(resolveCommercialEligibility({ lifecycleStatus: "prospect" })).toBe("eligible")
    expect(resolveCommercialEligibility({ lifecycleStatus: "cible" })).toBe("eligible")
  })

  it("resolves client to non_prospectable", () => {
    expect(resolveCommercialEligibility({ relationType: "client", lifecycleStatus: "client" })).toBe("non_prospectable")
    expect(resolveCommercialEligibility({ relationType: "client" })).toBe("non_prospectable")
    expect(resolveCommercialEligibility({ lifecycleStatus: "client_actif" })).toBe("non_prospectable")
    expect(resolveCommercialEligibility({ lifecycleStatus: "client_dormant" })).toBe("non_prospectable")
  })

  it("resolves absent or ambiguous status to unknown", () => {
    expect(resolveCommercialEligibility({})).toBe("unknown")
    expect(resolveCommercialEligibility({ relationType: null, lifecycleStatus: null })).toBe("unknown")
    expect(resolveCommercialEligibility({ relationType: "ancien_client" })).toBe("unknown")
    expect(resolveCommercialEligibility({ relationType: "pair_partenaire" })).toBe("unknown")
  })

  it("resolves contradictory status to unknown", () => {
    expect(resolveCommercialEligibility({ relationType: "client", lifecycleStatus: "prospect" })).toBe("unknown")
    expect(resolveCommercialEligibility({ relationType: "prospect", lifecycleStatus: "client_actif" })).toBe("unknown")
  })
})

describe("buildTerrainTopAccounts", () => {
  it("ranks accounts by appetence score descending and preserves source order on tie", () => {
    const actors: CompetitiveMapActor[] = [
      makeActor({ id: "1", name: "MANE", appetenceScore: 27, relationType: "prospect" }),
      makeActor({ id: "2", name: "TechnicoFlor", appetenceScore: 27, relationType: "prospect" }),
      makeActor({ id: "3", name: "Payan Bertrand", appetenceScore: 27, relationType: "prospect" }),
      makeActor({ id: "4", name: "Aromatech", appetenceScore: 21, relationType: "prospect" }),
    ]

    const model = buildTerrainTopAccounts(actors)
    expect(model.mode).toBe("actionable")
    expect(model.ranked.map((acc) => acc.name)).toEqual(["MANE", "TechnicoFlor", "Payan Bertrand"])
  })

  it("excludes non_prospectable accounts from ranking and captures excluded benchmark", () => {
    const actors: CompetitiveMapActor[] = [
      makeActor({ id: "1", name: "Robertet", appetenceScore: 35, isBenchmarkAccount: true, relationType: "client" }),
      makeActor({ id: "2", name: "MANE", appetenceScore: 27, relationType: "prospect" }),
      makeActor({ id: "3", name: "TechnicoFlor", appetenceScore: 27, relationType: "prospect" }),
      makeActor({ id: "4", name: "Payan Bertrand", appetenceScore: 27, relationType: "prospect" }),
    ]

    const model = buildTerrainTopAccounts(actors)
    expect(model.mode).toBe("actionable")
    expect(model.ranked.map((acc) => acc.name)).toEqual(["MANE", "TechnicoFlor", "Payan Bertrand"])
    expect(model.excludedBenchmark?.name).toBe("Robertet")
  })

  it("ranks benchmark account if its status is eligible or unknown", () => {
    const actors: CompetitiveMapActor[] = [
      makeActor({ id: "1", name: "Benchmark Eligible", appetenceScore: 30, isBenchmarkAccount: true, relationType: "prospect" }),
      makeActor({ id: "2", name: "MANE", appetenceScore: 27, relationType: "prospect" }),
      makeActor({ id: "3", name: "TechnicoFlor", appetenceScore: 25, relationType: "prospect" }),
    ]

    const model = buildTerrainTopAccounts(actors)
    expect(model.mode).toBe("actionable")
    expect(model.ranked.map((acc) => acc.name)).toEqual(["Benchmark Eligible", "MANE", "TechnicoFlor"])
    expect(model.excludedBenchmark).toBeNull()
  })

  it("ranks unknown status accounts alongside eligible accounts", () => {
    const actors: CompetitiveMapActor[] = [
      makeActor({ id: "1", name: "MANE", appetenceScore: 27, relationType: "prospect" }),
      makeActor({ id: "2", name: "Unknown Account", appetenceScore: 26, relationType: null, lifecycleStatus: null }),
      makeActor({ id: "3", name: "TechnicoFlor", appetenceScore: 25, relationType: "prospect" }),
    ]

    const model = buildTerrainTopAccounts(actors)
    expect(model.mode).toBe("actionable")
    expect(model.ranked.map((acc) => acc.name)).toEqual(["MANE", "Unknown Account", "TechnicoFlor"])
  })

  it("applies strict fallback mode when no CRM projection is present in workspace", () => {
    const actors: CompetitiveMapActor[] = [
      makeActor({ id: "1", name: "Robertet", appetenceScore: 35, isBenchmarkAccount: true, relationType: null }),
      makeActor({ id: "2", name: "MANE", appetenceScore: 27, relationType: null }),
      makeActor({ id: "3", name: "TechnicoFlor", appetenceScore: 27, relationType: null }),
    ]

    const model = buildTerrainTopAccounts(actors)
    expect(model.mode).toBe("strict_fallback")
    expect(model.ranked.map((acc) => acc.name)).toEqual(["Robertet", "MANE", "TechnicoFlor"])
    expect(model.excludedBenchmark).toBeNull()
  })
})

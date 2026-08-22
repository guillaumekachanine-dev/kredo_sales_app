import { describe, expect, it } from "vitest"
import {
  getTerrainDailyAngle,
  rankTerrainAccounts,
  resolveRegulatoryTiming,
  selectTerrainDependencies,
  selectTerrainEndpoints,
} from "./terrain-model"
import {
  terrainDependencies,
  terrainMarketTheses,
  terrainRegulatoryExact,
  terrainRegulatoryUnavailable,
  terrainRegulatoryWindow,
  terrainRiskOpportunities,
  terrainTopAccounts,
  terrainValueChain,
} from "./terrain-fixtures"

describe("terrain mode lab models", () => {
  it("alters the daily angle family on even and odd Paris days", () => {
    expect(getTerrainDailyAngle(terrainMarketTheses, terrainRiskOpportunities, new Date("2026-08-22T12:00:00Z")).kind).toBe("market")
    expect(getTerrainDailyAngle(terrainMarketTheses, terrainRiskOpportunities, new Date("2026-08-23T12:00:00Z")).kind).toBe("risk")
  })

  it("keeps the risk and opportunity labels in the copied text", () => {
    const angle = getTerrainDailyAngle([], terrainRiskOpportunities, new Date("2026-08-22T12:00:00Z"))
    expect(angle.copyText).toContain("RISQUE")
    expect(angle.copyText).toContain("OPPORTUNITÉ")
  })

  it("resolves an exact regulatory date separately from the presentation", () => {
    expect(resolveRegulatoryTiming(terrainRegulatoryExact, new Date("2026-09-23T12:00:00Z"))).toMatchObject({ countdown: "J-100" })
    expect(resolveRegulatoryTiming(terrainRegulatoryWindow)).toEqual({ dateLabel: null, countdown: null, windowLabel: "fin novembre 2026" })
    expect(resolveRegulatoryTiming(terrainRegulatoryUnavailable)).toEqual({ dateLabel: null, countdown: null, windowLabel: null })
  })

  it("falls back to the other angle family and reports an unavailable angle only when both are empty", () => {
    expect(getTerrainDailyAngle([], terrainRiskOpportunities, new Date("2026-08-22T12:00:00Z")).kind).toBe("risk")
    expect(getTerrainDailyAngle([], [], new Date("2026-08-22T12:00:00Z")).kind).toBe("unavailable")
  })

  it("sorts Top 3 by appetence and only excludes non prospectable accounts", () => {
    const ranking = rankTerrainAccounts(terrainTopAccounts)
    expect(ranking.map((account) => account.name)).toEqual(["Robertet", "Mane", "Givaudan"])
    expect(ranking.some((account) => account.name === "Robertet")).toBe(true)
    expect(ranking.some((account) => account.name === "Symrise")).toBe(false)
  })

  it("does not exclude a benchmark by itself", () => {
    const ranking = rankTerrainAccounts([
      { ...terrainTopAccounts[0], commercialEligibility: "eligible", appetenceScore: 10, isBenchmarkAccount: true },
    ])
    expect(ranking).toHaveLength(1)
  })

  it("preserves source order when appetence scores are equal", () => {
    const first = { ...terrainTopAccounts[0], name: "Premier", appetenceScore: 20 }
    const second = { ...terrainTopAccounts[1], name: "Second", appetenceScore: 20 }
    expect(rankTerrainAccounts([first, second]).map((account) => account.name)).toEqual(["Premier", "Second"])
  })

  it("keeps only the first and last chain steps plus the two highest dependencies", () => {
    expect(selectTerrainEndpoints(terrainValueChain).map((step) => step.id)).toEqual(["sourcing", "distribution"])
    expect(selectTerrainDependencies(terrainDependencies).map((dependency) => dependency.name)).toEqual([
      "Données de conformité matières",
      "Disponibilité des alternatives",
    ])
  })
})

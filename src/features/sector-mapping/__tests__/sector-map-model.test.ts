import { describe, expect, it } from "vitest"
import {
  BANK_SECTOR_MAP,
  BTP_SECTOR_MAP,
  SECTOR_MAP_FIXTURES,
  TOURISM_SECTOR_MAP,
} from "../fixtures"
import type { SectorMap } from "../model"
import {
  SectorMapValidationError,
  buildActivityProjection,
  buildEcosystemProjection,
  buildValueProjection,
  deriveCoverage,
  normalizeSectorMap,
  validateSectorMap,
} from "../model"

function cloneFixture(model: SectorMap): SectorMap {
  return structuredClone(model)
}

describe("SectorMap — contrat canonique", () => {
  it.each(SECTOR_MAP_FIXTURES.map((fixture) => [fixture.sector.slug, fixture] as const))(
    "%s utilise le même validateur et les mêmes transformations",
    (_slug, fixture) => {
      expect(validateSectorMap(fixture)).toEqual([])
      expect(() => buildValueProjection(fixture)).not.toThrow()
      expect(() => buildEcosystemProjection(fixture, fixture.sector.defaultActivityId, "main")).not.toThrow()
      expect(() => buildEcosystemProjection(fixture, fixture.sector.defaultActivityId, "influences")).not.toThrow()
    },
  )

  it("normalise de façon déterministe sans muter l'entrée", () => {
    const fixture = cloneFixture(BTP_SECTOR_MAP)
    fixture.stages.reverse()
    fixture.entities.reverse()
    const before = cloneFixture(fixture)

    const first = normalizeSectorMap(fixture)
    const second = normalizeSectorMap(fixture)

    expect(first).toEqual(second)
    expect(fixture).toEqual(before)
    expect(first.stages.map((stage) => stage.order)).toEqual([1, 2, 3, 4, 5])
  })

  it("rejette les IDs dupliqués et les références orphelines", () => {
    const fixture = cloneFixture(BTP_SECTOR_MAP)
    fixture.entities.push({ ...fixture.entities[0] })
    fixture.activities[0].stageId = "stage-inconnu"

    const issues = validateSectorMap(fixture)
    expect(issues.some((issue) => issue.message.includes("dupliquée"))).toBe(true)
    expect(issues.some((issue) => issue.path === "activities[0].stageId")).toBe(true)
    expect(() => normalizeSectorMap(fixture)).toThrow(SectorMapValidationError)
  })
})

describe("SectorMap — cas limites des trois fixtures", () => {
  it("conserve un stage vide et un nombre de stages variable", () => {
    const bank = buildValueProjection(BANK_SECTOR_MAP)

    expect(BTP_SECTOR_MAP.stages).toHaveLength(5)
    expect(BANK_SECTOR_MAP.stages).toHaveLength(6)
    expect(TOURISM_SECTOR_MAP.stages).toHaveLength(6)
    expect(bank.stages.find((stage) => stage.label === "Compensation")?.activities).toEqual([])
  })

  it("garde une entity unique lorsqu'elle possède plusieurs placements", () => {
    const placements = BANK_SECTOR_MAP.placements.filter((placement) => placement.entityId === "bpm-bank")
    const entities = BANK_SECTOR_MAP.entities.filter((entity) => entity.id === "bpm-bank")

    expect(placements.map((placement) => placement.target.id)).toEqual([
      "bank-capital",
      "bank-products",
      "bank-distribution",
      "bank-funding",
    ])
    expect(entities).toHaveLength(1)
  })

  it("ne transforme jamais une captation inconnue en captation faible", () => {
    const risk = buildActivityProjection(normalizeSectorMap(BANK_SECTOR_MAP), "bank-risk")

    expect(risk.capture).toMatchObject({ value: null, confidence: "unknown" })
    expect(risk.capture.value).not.toBe(1)
  })

  it("déduplique les entities lors du calcul de couverture", () => {
    const fixture = cloneFixture(BTP_SECTOR_MAP)
    fixture.placements.push({
      ...fixture.placements.find((placement) => placement.id === "p-idec-construction")!,
      id: "p-idec-construction-duplicate",
      order: 99,
    })

    const coverage = deriveCoverage(fixture, { kind: "activity", id: "btp-construction" })

    expect(coverage.entityIds).toEqual(["idec", "renaudi", "trecobat"])
    expect(coverage.covered).toBe(3)
  })

  it("dérive un white space prioritaire avec une règle explicite", () => {
    const projection = buildActivityProjection(normalizeSectorMap(BTP_SECTOR_MAP), "btp-construction")

    expect(projection.coverage).toMatchObject({ covered: 3, total: 16, gap: 13 })
    expect(projection.whiteSpace).toEqual({
      status: "priority",
      priorityEntityIds: ["bouygues", "colas", "nge"],
      reasons: ["coverage_gap", "priority_opportunities"],
    })
  })

  it("n'invente pas de white space sans opportunité explicitement priorisée", () => {
    const projection = buildActivityProjection(normalizeSectorMap(TOURISM_SECTOR_MAP), "tourism-booking")

    expect(projection.coverage.gap).toBeGreaterThan(0)
    expect(projection.whiteSpace).toEqual({
      status: "none",
      priorityEntityIds: [],
      reasons: ["coverage_gap", "no_priority_opportunity"],
    })
  })

  it("signale un white space inconnu lorsque le dénominateur manque", () => {
    const fixture = cloneFixture(BANK_SECTOR_MAP)
    const metric = fixture.metrics.find((item) => (
      item.kind === "kredo_coverage" && item.subject.id === "bank-risk"
    ))
    if (metric?.kind === "kredo_coverage") metric.total = null

    const projection = buildActivityProjection(normalizeSectorMap(fixture), "bank-risk")
    expect(projection.whiteSpace).toMatchObject({
      status: "unknown",
      reasons: ["coverage_unknown"],
    })
  })

  it("préserve les relations non linéaires et les boucles", () => {
    expect(BTP_SECTOR_MAP.relationships).toContainEqual(expect.objectContaining({
      from: { kind: "activity", id: "btp-use" },
      to: { kind: "activity", id: "btp-extraction" },
    }))
    expect(TOURISM_SECTOR_MAP.relationships).toContainEqual(expect.objectContaining({
      from: { kind: "activity", id: "tourism-loyalty" },
      to: { kind: "activity", id: "tourism-packaging" },
    }))
  })

  it("sépare strictement flux principal et influences", () => {
    const main = buildEcosystemProjection(BTP_SECTOR_MAP, "btp-construction", "main")
    const influences = buildEcosystemProjection(BTP_SECTOR_MAP, "btp-construction", "influences")

    expect(main.relationships.every((relationship) => relationship.mode === "main")).toBe(true)
    expect(main.ecosystemLayers).toEqual([])
    expect(influences.relationships.every((relationship) => relationship.mode === "influence")).toBe(true)
    expect(influences.ecosystemLayers).toHaveLength(3)
    expect(influences.summary).toEqual({ incoming: 3, outgoing: 2, influences: 3 })
  })
})

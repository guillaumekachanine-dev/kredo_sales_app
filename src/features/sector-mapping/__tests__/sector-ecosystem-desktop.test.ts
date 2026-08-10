import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  BANK_SECTOR_MAP,
  BTP_SECTOR_MAP,
  SECTOR_MAP_FIXTURES,
  TOURISM_SECTOR_MAP,
} from "../fixtures"
import { buildEcosystemProjection, type SectorMap } from "../model"
import { layoutEcosystemGraph } from "../ecosystem-desktop/ecosystem-layout"
import { SectorValueDesktop } from "../value-desktop/SectorValueDesktop"

function cloneFixture(model: SectorMap): SectorMap {
  return structuredClone(model)
}

function escaped(value: string) {
  return value.replaceAll("&", "&amp;")
}

function rectanglesOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y
}

function renderEcosystem(
  model: SectorMap,
  mode: "main" | "influences" = "main",
) {
  return renderToStaticMarkup(createElement(SectorValueDesktop, {
    sectorMap: model,
    initialView: "ecosystem",
    initialEcosystemMode: mode,
  }))
}

describe("layoutEcosystemGraph", () => {
  it.each(SECTOR_MAP_FIXTURES.flatMap((fixture) => ([
    [fixture.sector.slug, fixture, "main" as const],
    [fixture.sector.slug, fixture, "influences" as const],
  ]))) (
    "%s / %s produit un layout stable, borné et sans collision de nœuds",
    (_slug, fixture, mode) => {
      const projection = buildEcosystemProjection(
        fixture,
        fixture.sector.defaultActivityId,
        mode,
      )
      const first = layoutEcosystemGraph(fixture, projection)
      const second = layoutEcosystemGraph(fixture, projection)

      expect(first).toEqual(second)
      expect(first.nodes.filter((node) => node.side === "focal")).toHaveLength(1)
      expect(first.edges.every((edge) => (
        first.nodes.some((node) => node.id === edge.sourceNodeId)
        && first.nodes.some((node) => node.id === edge.targetNodeId)
      ))).toBe(true)

      first.nodes.forEach((node, index) => {
        expect(node.x).toBeGreaterThanOrEqual(0)
        expect(node.y).toBeGreaterThanOrEqual(0)
        expect(node.x + node.width).toBeLessThanOrEqual(first.width)
        expect(node.y + node.height).toBeLessThanOrEqual(first.height)
        first.nodes.slice(index + 1).forEach((other) => {
          expect(rectanglesOverlap(node, other)).toBe(false)
        })
      })

      const focal = first.nodes.find((node) => node.side === "focal")
      const neighbors = first.nodes.filter((node) => node.side !== "focal")
      expect(focal?.width).toBeGreaterThan(Math.max(...neighbors.map((node) => node.width)))
      expect(focal?.height).toBeGreaterThan(Math.max(...neighbors.map((node) => node.height)))
    },
  )

  it("restitue les voisinages attendus des trois maillons par défaut", () => {
    const btpMain = layoutEcosystemGraph(
      BTP_SECTOR_MAP,
      buildEcosystemProjection(BTP_SECTOR_MAP, "btp-construction", "main"),
    )
    const bankMain = layoutEcosystemGraph(
      BANK_SECTOR_MAP,
      buildEcosystemProjection(BANK_SECTOR_MAP, "bank-distribution", "main"),
    )
    const tourismMain = layoutEcosystemGraph(
      TOURISM_SECTOR_MAP,
      buildEcosystemProjection(TOURISM_SECTOR_MAP, "tourism-booking", "main"),
    )

    expect(btpMain.nodes.map((node) => node.side)).toEqual([
      "incoming", "incoming", "incoming", "focal", "outgoing", "outgoing",
    ])
    expect(btpMain.edges).toHaveLength(5)
    expect(bankMain.edges).toHaveLength(2)
    expect(tourismMain.edges).toHaveLength(2)
  })

  it.each(SECTOR_MAP_FIXTURES.map((fixture) => [fixture.sector.slug, fixture] as const))(
    "%s distingue trois influences transverses",
    (_slug, fixture) => {
      const projection = buildEcosystemProjection(
        fixture,
        fixture.sector.defaultActivityId,
        "influences",
      )
      const layout = layoutEcosystemGraph(fixture, projection)

      expect(layout.edges).toHaveLength(3)
      expect(layout.nodes.filter((node) => node.ref.kind === "ecosystemLayer")).toHaveLength(3)
      expect(layout.edges.map((edge) => edge.label).sort()).toEqual([
        "finance",
        "outille",
        "prescrit",
      ])
    },
  )

  it("agrège les relations parallèles sans perdre leurs preuves", () => {
    const fixture = cloneFixture(BTP_SECTOR_MAP)
    fixture.relationships.push({
      id: "r-trade-construction-secondary",
      from: { kind: "activity", id: "btp-trade" },
      to: { kind: "activity", id: "btp-construction" },
      mode: "main",
      label: "flux secondaire",
      intensity: 1,
      confidence: "low",
      evidenceIds: ["ev-btp-pilot"],
    })

    const layout = layoutEcosystemGraph(
      fixture,
      buildEcosystemProjection(fixture, "btp-construction", "main"),
    )
    const aggregated = layout.edges.find((edge) => (
      edge.relationshipIds.includes("r-trade-construction-secondary")
    ))

    expect(aggregated?.relationshipIds).toEqual([
      "r-trade-construction",
      "r-trade-construction-secondary",
    ])
    expect(aggregated?.label).toBe("fournit le chantier · flux secondaire")
    expect(aggregated?.intensity).toBe(3)
    expect(aggregated?.confidence).toBe("high")
    expect(aggregated?.evidenceIds).toEqual(["ev-btp-pilot"])
  })

  it("plafonne chaque côté à quatre voisins et expose le nombre omis", () => {
    const fixture = cloneFixture(BTP_SECTOR_MAP)
    for (let index = 0; index < 3; index += 1) {
      const id = `btp-extra-${index}`
      fixture.activities.push({
        id,
        stageId: "btp-stage-1",
        label: `Amont secondaire ${index + 1}`,
        order: index + 3,
      })
      fixture.relationships.push({
        id: `r-${id}-construction`,
        from: { kind: "activity", id },
        to: { kind: "activity", id: "btp-construction" },
        mode: "main",
        intensity: 1,
        confidence: "low",
        evidenceIds: ["ev-btp-pilot"],
      })
    }

    const layout = layoutEcosystemGraph(
      fixture,
      buildEcosystemProjection(fixture, "btp-construction", "main"),
    )

    expect(layout.nodes.filter((node) => node.side === "incoming")).toHaveLength(4)
    expect(layout.omitted.incoming).toBe(2)
  })
})

describe("SectorEcosystemDesktop", () => {
  it.each(SECTOR_MAP_FIXTURES.map((fixture) => [fixture.sector.slug, fixture] as const))(
    "rend %s depuis le même SectorMap et le même inspector",
    (_slug, fixture) => {
      const markup = renderEcosystem(fixture)
      const focal = fixture.activities.find((activity) => (
        activity.id === fixture.sector.defaultActivityId
      ))

      expect(markup).toContain('data-sector-map-view="ecosystem"')
      expect(markup).toContain('data-ecosystem-mode="main"')
      expect(markup).toContain("Comment fonctionne ce maillon et qui l’influence ?")
      expect(markup).toContain(escaped(focal?.label ?? ""))
      expect(markup).toContain(escaped(`Inspector de ${focal?.label}`))
      expect(markup).not.toContain(">Tout<")
    },
  )

  it("rend le mode Influences sans mélanger le flux principal", () => {
    const markup = renderEcosystem(BTP_SECTOR_MAP, "influences")

    expect(markup).toContain('data-ecosystem-mode="influences"')
    expect(markup).toContain("prescrit")
    expect(markup).toContain("finance")
    expect(markup).toContain("outille")
    expect(markup).not.toContain("fournit le chantier")
  })
})

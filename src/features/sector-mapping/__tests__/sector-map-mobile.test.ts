import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  BANK_SECTOR_MAP,
  BTP_SECTOR_MAP,
  SECTOR_MAP_FIXTURES,
  TOURISM_SECTOR_MAP,
} from "../fixtures"
import { SectorMapMobile } from "../mobile/SectorMapMobile"
import { buildMobileEcosystemLayout } from "../mobile/mobile-sector-map-model"
import type { SectorMap } from "../model"

function renderMobile(
  model: SectorMap,
  view: "value" | "ecosystem" = "value",
  mode: "main" | "influences" = "main",
) {
  return renderToStaticMarkup(createElement(SectorMapMobile, {
    sectorMap: model,
    initialView: view,
    initialEcosystemMode: mode,
  }))
}

function escaped(value: string) {
  return value.replaceAll("&", "&amp;")
}

describe("SectorMapMobile", () => {
  it.each(SECTOR_MAP_FIXTURES.map((fixture) => [fixture.sector.slug, fixture] as const))(
    "rend VALEUR mobile pour %s avec navigation séquentielle et inspector partagé",
    (_slug, fixture) => {
      const markup = renderMobile(fixture)
      const focal = fixture.activities.find((activity) => activity.id === fixture.sector.defaultActivityId)

      expect(markup).toContain('data-sector-map-mobile="true"')
      expect(markup).toContain('data-sector-map-view="value"')
      expect(markup).toContain("Projection analytique de la valeur")
      expect(markup).toContain("Activité précédente")
      expect(markup).toContain("Activité suivante")
      expect(markup).toContain("Forces transverses")
      expect(markup).toContain("Justification &amp; sources")
      expect(markup).toContain(escaped(`Inspector de ${focal?.label}`))
      expect(markup).not.toContain("Comparer")
      expect(markup).not.toContain(">Tout<")
    },
  )

  it.each(SECTOR_MAP_FIXTURES.flatMap((fixture) => ([
    [fixture.sector.slug, fixture, "main" as const],
    [fixture.sector.slug, fixture, "influences" as const],
  ]))) (
    "rend l’ego graph %s / %s avec le focal dans la composition principale",
    (_slug, fixture, mode) => {
      const markup = renderMobile(fixture, "ecosystem", mode)
      const focal = fixture.activities.find((activity) => activity.id === fixture.sector.defaultActivityId)

      expect(markup).toContain('data-sector-map-view="ecosystem"')
      expect(markup).toContain('data-ecosystem-mobile="true"')
      expect(markup).toContain(`data-ecosystem-mode="${mode}"`)
      expect(markup).toContain("Maillon focal")
      expect(markup).toContain(escaped(focal?.label ?? ""))
      expect(markup).toContain("Résumé textuel du graphe")
    },
  )

  it("conserve le multi-positionnement Banque sans dupliquer l'entité canonique", () => {
    const markup = renderMobile(BANK_SECTOR_MAP)

    expect(BANK_SECTOR_MAP.entities.filter((entity) => entity.id === "bpm-bank")).toHaveLength(1)
    expect(markup).toContain("Banque Populaire Méditerranée")
  })
})

describe("buildMobileEcosystemLayout", () => {
  it.each(SECTOR_MAP_FIXTURES.flatMap((fixture) => ([
    [fixture.sector.slug, fixture, "main" as const],
    [fixture.sector.slug, fixture, "influences" as const],
  ]))) (
    "%s / %s plafonne les voisins tout en conservant le foyer",
    (_slug, fixture, mode) => {
      const first = buildMobileEcosystemLayout(fixture, fixture.sector.defaultActivityId, mode)
      const second = buildMobileEcosystemLayout(fixture, fixture.sector.defaultActivityId, mode)

      expect(first).toEqual(second)
      expect(first.focal.side).toBe("focal")
      expect(first.incoming.length).toBeLessThanOrEqual(2)
      expect(first.outgoing.length).toBeLessThanOrEqual(2)
      expect(first.hiddenIncoming).toBeGreaterThanOrEqual(0)
      expect(first.hiddenOutgoing).toBeGreaterThanOrEqual(0)
    },
  )

  it("réduit le BTP dense à deux entrants majeurs et expose le reste", () => {
    const layout = buildMobileEcosystemLayout(BTP_SECTOR_MAP, "btp-construction", "main")

    expect(layout.incoming).toHaveLength(2)
    expect(layout.outgoing).toHaveLength(2)
    expect(layout.hiddenIncoming).toBe(1)
    expect(layout.incoming.map((relation) => relation.node.label)).toEqual([
      "Négoce & distribution de matériaux",
      "Composants & équipements du bâtiment",
    ])
  })

  it("rend les flux directs et le contournement du Tourisme sélectionnable", () => {
    const booking = buildMobileEcosystemLayout(TOURISM_SECTOR_MAP, "tourism-booking", "main")
    const packaging = buildMobileEcosystemLayout(TOURISM_SECTOR_MAP, "tourism-packaging", "main")

    expect(booking.outgoing.map((relation) => relation.node.label)).toContain("Production du séjour")
    expect(packaging.incoming.map((relation) => relation.node.label)).toContain("Avis & fidélisation")
  })

  it("distingue prescrit, finance et outille dans les influences", () => {
    const layout = buildMobileEcosystemLayout(BTP_SECTOR_MAP, "btp-construction", "influences")
    const labels = layout.incoming.map((relation) => relation.label)

    expect(labels).toEqual(["prescrit", "outille"])
    expect(layout.hiddenIncoming).toBe(1)
  })
})

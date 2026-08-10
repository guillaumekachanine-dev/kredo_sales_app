import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  BANK_SECTOR_MAP,
  BTP_SECTOR_MAP,
  SECTOR_MAP_FIXTURES,
  TOURISM_SECTOR_MAP,
} from "../fixtures"
import type { SectorMap } from "../model"
import { SectorValueDesktop } from "../value-desktop/SectorValueDesktop"
import {
  activityColumnCount,
  buildCaptureProfileSegments,
  buildSectorValueDesktopModel,
  getSelectedActivityContext,
} from "../value-desktop/value-desktop-model"

function renderSector(model: SectorMap) {
  return renderToStaticMarkup(createElement(SectorValueDesktop, { sectorMap: model }))
}

function escaped(value: string) {
  return value.replaceAll("&", "&amp;")
}

describe("SectorValueDesktop", () => {
  it.each(SECTOR_MAP_FIXTURES.map((fixture) => [fixture.sector.slug, fixture] as const))(
    "rend %s avec le même composant",
    (_slug, fixture) => {
      const markup = renderSector(fixture)

      expect(markup).toContain(escaped(fixture.sector.name))
      expect(markup).toContain("Projection analytique de la valeur")
      expect(markup).toContain("Forces transverses")
      expect(markup).toContain(escaped(`Inspector de ${fixture.activities.find((item) => item.id === fixture.sector.defaultActivityId)?.label}`))
      expect(markup).not.toContain("Comparer")
    },
  )

  it("génère les colonnes depuis les données, y compris un stage vide", () => {
    const bankModel = buildSectorValueDesktopModel(BANK_SECTOR_MAP)
    const bankMarkup = renderSector(BANK_SECTOR_MAP)

    expect(activityColumnCount(BTP_SECTOR_MAP.stages, BTP_SECTOR_MAP.activities)).toBe(7)
    expect(activityColumnCount(BANK_SECTOR_MAP.stages, BANK_SECTOR_MAP.activities)).toBe(6)
    expect(activityColumnCount(TOURISM_SECTOR_MAP.stages, TOURISM_SECTOR_MAP.activities)).toBe(6)
    expect(bankModel.columns.some((column) => column.kind === "empty")).toBe(true)
    expect(bankMarkup).toContain("Aucune activité documentée")
    expect(bankMarkup).toContain('data-column-count="6"')
  })

  it("interrompt le profil lorsqu'une captation est inconnue", () => {
    const model = buildSectorValueDesktopModel(BANK_SECTOR_MAP)
    const segments = buildCaptureProfileSegments(model.columns)

    const riskColumn = model.columns.find((column) => column.id === "bank-risk")
    expect(riskColumn?.kind).toBe("activity")
    if (riskColumn?.kind !== "activity") throw new Error("La colonne Risque doit être une activité")
    expect(riskColumn.activity.capture.value).toBeNull()
    expect(segments.length).toBeGreaterThan(1)
    expect(segments.flatMap((segment) => segment.points)).toHaveLength(4)
  })

  it("affiche explicitement une activité sans acteur et une captation absente", () => {
    const fixture = structuredClone(BTP_SECTOR_MAP) as SectorMap
    fixture.placements = fixture.placements.filter((placement) => placement.target.id !== "btp-market")
    fixture.metrics = fixture.metrics.filter((metric) => (
      metric.kind !== "value_capture" || metric.subject.id !== "btp-market"
    ))
    const markup = renderSector(fixture)

    expect(markup).toContain("Aucun acteur documenté")
    expect(markup).toContain("n.d.")
  })

  it("agrège visuellement une activité dense sans perdre le détail de l'inspector", () => {
    const fixture = structuredClone(BTP_SECTOR_MAP) as SectorMap
    fixture.entities.push({ id: "eiffage-extra", name: "Eiffage", status: "external" })
    fixture.placements.push({
      id: "p-eiffage-extra-construction",
      entityId: "eiffage-extra",
      target: { kind: "activity", id: "btp-construction" },
      order: 7,
      priorityOpportunity: false,
      evidenceIds: ["ev-btp-pilot"],
    })
    const markup = renderSector(fixture)
    const model = buildSectorValueDesktopModel(fixture)
    const context = getSelectedActivityContext(model, "btp-construction")

    expect(markup).toContain("+ 1 autres acteurs documentés")
    expect(context.activity.entities.some((entity) => entity.name === "Eiffage")).toBe(true)
  })

  it("rend visible l'écart entre acteurs documentés et total estimé", () => {
    const markup = renderSector(BTP_SECTOR_MAP)

    expect(markup).toContain("+ 10 autres acteurs estimés")
  })

  it("rend une entity multi-positionnée dans chaque activité sans la dupliquer dans le modèle", () => {
    const markup = renderSector(BANK_SECTOR_MAP)
    const occurrences = markup.match(/Banque Populaire Méditerranée/g)?.length ?? 0

    expect(BANK_SECTOR_MAP.entities.filter((entity) => entity.id === "bpm-bank")).toHaveLength(1)
    expect(occurrences).toBeGreaterThan(1)
  })

  it("ne met en évidence un acteur que lorsque le mode Compte fournit un companyId", () => {
    const sectorMarkup = renderSector(BTP_SECTOR_MAP)
    const accountMarkup = renderToStaticMarkup(createElement(SectorValueDesktop, {
      sectorMap: BTP_SECTOR_MAP,
      initialActivityId: "btp-construction",
      focusedCompanyId: "company-idec",
      embedded: true,
    }))

    expect(sectorMarkup).not.toContain("compte sélectionné")
    expect(accountMarkup).toContain("compte sélectionné")
  })
})

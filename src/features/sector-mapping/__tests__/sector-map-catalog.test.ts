import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { buildSectorMapCatalog, type SectorMapDatabaseRows } from "../data/sector-map-catalog"
import { SectorMapContextSelector } from "../integration/SectorMapContextSelector"
import { buildActivityProjection, buildEcosystemProjection, validateSectorMap } from "../model"

const rows = {
  sectors: [{ id: "sector-1", slug: "industrie-test", name: "Industrie test", updated_at: "2026-08-10T08:00:00Z" }],
  nodes: [
    {
      id: "activity-upstream",
      sector_id: "sector-1",
      couche: "chaine",
      maillon: 1,
      rang: 1,
      label: "Production",
      description: "Production amont",
      capture_valeur: 2,
      capture_justification: "Captation intermédiaire documentée.",
      confiance: "moyenne",
      updated_at: "2026-08-09T08:00:00Z",
    },
    {
      id: "activity-focal",
      sector_id: "sector-1",
      couche: "chaine",
      maillon: 3,
      rang: 1,
      label: "Intégration",
      description: null,
      capture_valeur: null,
      capture_justification: null,
      confiance: "faible",
      updated_at: "2026-08-10T08:00:00Z",
    },
    {
      id: "layer-funding",
      sector_id: "sector-1",
      couche: "financeur",
      maillon: null,
      rang: 1,
      label: "Banques",
      description: "Financement du secteur",
      capture_valeur: null,
      capture_justification: null,
      confiance: "haute",
      updated_at: "2026-08-08T08:00:00Z",
    },
  ],
  actors: [
    {
      id: "actor-account-upstream",
      node_id: "activity-upstream",
      company_id: "company-1",
      nom: "Compte Alpha",
      role: "Fournisseur",
      poids: "fort",
      source: "Référentiel Kredo",
      confiance: "haute",
      updated_at: "2026-08-10T09:00:00Z",
      company: { lifecycle_status: "client" },
    },
    {
      id: "actor-account-focal",
      node_id: "activity-focal",
      company_id: "company-1",
      nom: "Compte Alpha",
      role: "Intégrateur",
      poids: "fort",
      source: "https://example.com/source",
      confiance: "haute",
      updated_at: "2026-08-10T09:00:00Z",
      company: { lifecycle_status: "client" },
    },
    {
      id: "actor-external",
      node_id: "activity-focal",
      company_id: null,
      nom: "Acteur externe",
      role: null,
      poids: null,
      source: null,
      confiance: null,
      updated_at: "2026-08-10T09:00:00Z",
      company: null,
    },
    {
      id: "actor-bank",
      node_id: "layer-funding",
      company_id: null,
      nom: "Banque externe",
      role: "Financeur",
      poids: "moyen",
      source: null,
      confiance: "moyenne",
      updated_at: "2026-08-10T09:00:00Z",
      company: null,
    },
  ],
  links: [
    {
      id: "link-main",
      node_amont: "activity-upstream",
      node_aval: "activity-focal",
      nature: "fournit",
      intensite: 3,
      libelle: "Un libellé volontairement beaucoup trop long pour encombrer inutilement une arête du graphe",
      created_at: "2026-08-10T07:00:00Z",
    },
    {
      id: "link-funding",
      node_amont: "layer-funding",
      node_aval: "activity-focal",
      nature: "finance",
      intensite: 2,
      libelle: "Crédit et garanties",
      created_at: "2026-08-10T07:00:00Z",
    },
  ],
} satisfies SectorMapDatabaseRows

describe("catalogue SectorMap Supabase", () => {
  it("transforme les tables existantes sans inventer de second modèle", () => {
    const catalog = buildSectorMapCatalog(rows, "2026-08-10T10:00:00Z")
    const map = catalog.maps[0]

    expect(catalog.state).toBe("ready")
    expect(validateSectorMap(map)).toEqual([])
    expect(map.sector.defaultActivityId).toBe("activity-focal")
    expect(map.stages).toHaveLength(5)
    expect(map.ecosystemLayers).toEqual([expect.objectContaining({ id: "layer-funding", kind: "funding" })])
    expect(map.entities.filter((entity) => entity.companyId === "company-1")).toHaveLength(1)
    expect(map.placements.filter((placement) => placement.entityId === "company:company-1")).toHaveLength(2)
  })

  it("préserve inconnue, couverture dédupliquée, preuves et séparation des modes", () => {
    const map = buildSectorMapCatalog(rows).maps[0]
    const activity = buildActivityProjection(map, "activity-focal")
    const main = buildEcosystemProjection(map, "activity-focal", "main")
    const influences = buildEcosystemProjection(map, "activity-focal", "influences")

    expect(activity.capture).toMatchObject({ value: null, confidence: "low" })
    expect(activity.coverage).toMatchObject({ covered: 1, total: 2, gap: 1 })
    expect(activity.whiteSpace.status).toBe("none")
    expect(main.relationships[0]).toMatchObject({ mode: "main", label: undefined })
    expect(influences.relationships[0]).toMatchObject({ mode: "influence", label: "finance" })
    expect(map.evidence.find((item) => item.id === "link:link-main")?.excerpt).toContain("volontairement")
    expect(map.evidence.find((item) => item.id === "actor:actor-account-focal")?.url).toBe("https://example.com/source")
  })

  it("résout le mode Compte vers le secteur canonique et son premier placement", () => {
    const catalog = buildSectorMapCatalog(rows)

    expect(catalog.accounts).toEqual([{
      id: "sector-1:company-1",
      companyId: "company-1",
      name: "Compte Alpha",
      sectorId: "sector-1",
      sectorName: "Industrie test",
      initialActivityId: "activity-upstream",
    }])
  })

  it("rend un seul contrôle actif Secteur ou Compte avec des libellés explicites", () => {
    const catalog = buildSectorMapCatalog(rows)
    const markup = renderToStaticMarkup(createElement(SectorMapContextSelector, {
      catalog,
      mode: "account",
      sectorId: "sector-1",
      accountId: "sector-1:company-1",
      activeAccount: catalog.accounts[0],
      onModeChange: () => undefined,
      onSectorChange: () => undefined,
      onAccountChange: () => undefined,
    }))

    expect(markup).toContain("Chaîne de valeur")
    expect(markup).toContain('aria-checked="false"')
    expect(markup).toContain('aria-checked="true"')
    expect(markup).toContain("Compte Alpha")
    expect(markup).toContain("focus appliqué à la cartographie sectorielle")
  })
})

import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { TerrainHomeDashboardMobile } from "../TerrainHomeDashboardMobile"
import { TerrainEssentialsMobile } from "../TerrainEssentialsMobile"
import type { BusinessIntelligenceSegmentWorkspace } from "../../data/business-intelligence-workspace-types"

type LoadedWorkspace = Extract<
  BusinessIntelligenceSegmentWorkspace,
  { state: "ready" | "empty" }
>

function makeFullWorkspace(): LoadedWorkspace {
  const ws = {
    state: "ready",
    sourceResolution: {},
    corpusMetadata: null,
    segment: { id: "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6", name: "Compositions B2B", slug: "seg-parfumerie-compositions-b2b", status: "published", macro: null },
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
      playbook: {
        dependances_critiques: [
          {
            nom: "Disponibilité et variabilité des matières naturelles",
            criticite: "haute",
            situation: "Les ingrédients naturels imposent qualification.",
            risque: "Rupture ou variation matière provoquant reformulation.",
            prestation_ouverte: "Workflow sourcing et traçabilité",
            src_ids: [20, 21],
          },
          {
            nom: "Évolution des règles IFRA/REACH",
            criticite: "haute",
            situation: "Évolutions de règles.",
            risque: "Screening lent et incohérences.",
            prestation_ouverte: "Data governance réglementaire",
            src_ids: [5, 6],
          },
          {
            nom: "Montée en cadence des sites",
            criticite: "haute",
            situation: "Grasse.",
            risque: "Interfaces fragiles.",
            prestation_ouverte: "Tests de performance",
            src_ids: [18],
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
    valueChain: {
      sourceSectorId: "sec-pilot",
      level: "segment",
      updatedAt: "2026-08-22T10:00:00Z",
      catalog: {
        state: "ready",
        sectors: [{ id: "sec-pilot", slug: "seg-parfumerie-compositions-b2b", name: "Compositions B2B" }],
        accounts: [],
        generatedAt: "2026-08-22T10:00:00Z",
        maps: [
          {
            sector: { id: "sec-pilot", slug: "seg-parfumerie-compositions-b2b", name: "Compositions B2B", defaultActivityId: "node-1" },
            stages: [
              { id: "stage-1", label: "Amont & Sourcing", order: 1 },
              { id: "stage-2", label: "Formulation & Composition", order: 2 },
              { id: "stage-3", label: "Conditionnement & Distribution", order: 3 },
            ],
            activities: [
              { id: "node-1", stageId: "stage-1", label: "Sourcing et qualification des matières", order: 1 },
              { id: "node-2", stageId: "stage-2", label: "Formulation et création olfactive", order: 1 },
              { id: "node-3", stageId: "stage-3", label: "Distribution et livraison B2B", order: 1 },
            ],
            entities: [],
            placements: [],
            relationships: [],
            ecosystemLayers: [],
            metrics: [],
            evidence: [
              { id: "node:node-1", label: "Ev 1", excerpt: "Sélection des fournisseurs" },
              { id: "node:node-3", label: "Ev 3", excerpt: "Livraison aux marques" },
            ],
          },
        ],
      },
    },
    news: { items: [], updatedAt: null },
    coverage: {
      study: { available: true, level: "segment", updatedAt: "2026-08-22" },
      playbook: { available: true, level: "segment", updatedAt: "2026-08-22" },
      competitiveMap: { available: false, level: null, updatedAt: null },
      valueChain: { available: true, level: "segment", updatedAt: "2026-08-22" },
      regulatory: { available: true, level: "segment", updatedAt: "2026-08-22" },
      news: { available: false, level: null, updatedAt: null },
    },
  }
  return ws as unknown as LoadedWorkspace
}

describe("TerrainEssentialsMobile Integration", () => {
  it("renders Essentiel button on Home when data is available", () => {
    const workspace = makeFullWorkspace()
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace }))

    expect(html).toContain("Essentiel")
    expect(html).toContain('data-terrain-surface="home"')
  })

  it("hides Essentiel CTA button on Home when workspace has no valueChain and no critical dependencies", () => {
    const emptyWorkspace = makeFullWorkspace()
    emptyWorkspace.valueChain = null
    emptyWorkspace.knowledge.playbook = {}

    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: emptyWorkspace }))

    expect(html).not.toContain("Essentiel")
  })

  it("renders TerrainEssentialsMobile surface with premier + dernier maillon and top 2 dependencies", () => {
    const workspace = makeFullWorkspace()
    const html = renderToString(
      createElement(TerrainHomeDashboardMobile, {
        workspace,
        initialSurface: "essentials",
      }),
    )

    expect(html).toContain('data-terrain-surface="essentials"')
    expect(html).toContain("Deux repères de la chaîne")

    // Check endpoints
    expect(html).toContain("Premier maillon")
    expect(html).toContain("Sourcing et qualification des matières")
    expect(html).toContain("Dernier maillon")
    expect(html).toContain("Distribution et livraison B2B")

    // Check critical dependencies (max 2 displayed)
    expect(html).toContain("À surveiller — dépendances critiques")
    expect(html).toContain("Disponibilité et variabilité des matières naturelles")
    expect(html).toContain("Évolution des règles IFRA/REACH")
    expect(html).not.toContain("Montée en cadence des sites") // 3rd dependency excluded because max is 2!

    // Check interactive source triggers
    expect(html).toContain("Sources :")
    expect(html).toContain("S20")
    expect(html).toContain("S21")
    expect(html).toContain("S5")
    expect(html).toContain("S6")
  })

  it("renders partial section correctly when only value chain endpoints exist", () => {
    const workspace = makeFullWorkspace()
    workspace.knowledge.playbook = {} // No dependencies

    const html = renderToString(
      createElement(TerrainHomeDashboardMobile, {
        workspace,
        initialSurface: "essentials",
      }),
    )

    expect(html).toContain("Deux repères de la chaîne")
    expect(html).not.toContain("À surveiller — dépendances critiques")
  })

  it("renders partial section correctly when only critical dependencies exist", () => {
    const workspace = makeFullWorkspace()
    workspace.valueChain = null // No value chain

    const html = renderToString(
      createElement(TerrainHomeDashboardMobile, {
        workspace,
        initialSurface: "essentials",
      }),
    )

    expect(html).not.toContain("Deux repères de la chaîne")
    expect(html).toContain("À surveiller — dépendances critiques")
  })

  it("includes back button with Terrain label and touch target", () => {
    const html = renderToString(
      createElement(TerrainEssentialsMobile, {
        model: {
          valueChainEndpoints: [],
          criticalDependencies: [
            {
              nom: "Dep 1",
              criticite: "haute",
              situation: null,
              risque: "Risk 1",
              practiceKredo: "data-ai",
              prestationOuverte: "Prestation 1",
              doncCommercialement: null,
              srcIds: [],
            },
          ],
        },
        onBack: () => {},
      }),
    )

    expect(html).toContain("Terrain")
    expect(html).toContain("Retour au Mode Terrain")
  })
})

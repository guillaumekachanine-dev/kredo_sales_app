import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { TerrainHomeDashboardMobile } from "../TerrainHomeDashboardMobile"
import { TerrainRevisionMobile } from "../TerrainRevisionMobile"
import { buildTerrainRevisionCards } from "../terrain-revision-model"
import type { BusinessIntelligenceSegmentWorkspace } from "../../data/business-intelligence-workspace-types"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

function createMockWorkspace(
  playbookOverrides: Record<string, unknown> = {},
): LoadedWorkspace {
  const ws = {
    state: "ready",
    segment: {
      id: "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6",
      name: "Compositions & ingrédients B2B",
      slug: "seg-parfumerie-compositions-b2b",
      status: "active",
      macro: {
        id: "macro-parfumerie",
        name: "Parfumerie, Arômes & Cosmétique",
        slug: "parfumerie-aromes",
      },
    },
    corpusMetadata: {
      qualityVerdict: "production_ready",
      activationState: "active",
      snapshotDate: "2026-08-22",
      gaps: [],
    },
    knowledge: {
      segmentId: "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6",
      segmentName: "Compositions & ingrédients B2B",
      segmentSlug: "seg-parfumerie-compositions-b2b",
      segmentStatus: "active",
      macroId: "macro-parfumerie",
      macroName: "Parfumerie, Arômes & Cosmétique",
      macroSlug: "parfumerie-aromes",
      macroStatus: "active",
      description: "Synthèse",
      descriptionLevel: "segment",
      attractivenessScore: 4.5,
      attractivenessScoreLevel: "segment",
      marketSizeEurBn: 2.4,
      marketSizeEurBnLevel: "segment",
      marketGrowthPct: null,
      marketGrowthPctLevel: null,
      playbook: {
        message_sectoriel:
          "Votre fenêtre n'est pas « faire de l'IA » : c'est être capable, dès la notification IFRA 52, de relier chaque restriction aux matières, formules, usages et certificats clients, pendant que vos nouveaux sites et vos capacités de création montent en charge.",
        market_thesis: [
          {
            id: 1,
            these:
              "La valeur commerciale du segment vient moins d'un TAM agrégé que de sa complexité opérationnelle.",
            src_ids: [7, 13],
            donc_commercialement: "DONC, commercialement : ouvrir sur la maîtrise matière.",
          },
        ],
        objections: [
          {
            objection: "« IFRA, c'est le métier du réglementaire, pas du SI. »",
            reponse:
              "« Justement : la règle n'est pas le sujet SI. Le sujet SI est le temps nécessaire pour relier la règle aux matières, formules, usages, clients et documents, puis tracer ce qui a été décidé. »",
          },
          {
            objection: "« Nous avons déjà un PLM / ERP groupe. »",
            reponse:
              "« L'objectif n'est pas de le remplacer. Il faut qualifier ce qui manque entre la plateforme groupe, le laboratoire, la qualité, le site et les workflows de changement locaux. »",
          },
          {
            objection: "« Nous avons déjà testé l'IA. »",
            reponse:
              "« Le sujet n'est plus le test. Le vrai seuil est l'industrialisation : données autorisées, propriété intellectuelle, évaluation, traçabilité et retour sécurisé vers la formulation. »",
          },
          {
            objection: "« Notre usine est déjà automatisée. »",
            reponse:
              "« L'automatisation n'est pas le point de départ ; ce qui nous intéresse est la fiabilité du chemin complet équipement–donnée–qualité–ERP pendant le ramp-up. »",
          },
          {
            objection: "« Les achats IT sont gérés par le groupe. »",
            reponse:
              "« Alors le premier travail est précisément de séparer ce qui relève du standard groupe de ce qui reste achetable localement : intégration, rollout, données, qualité, support ou change. »",
          },
        ],
        ...playbookOverrides,
      },
      playbookLevel: "segment",
      practicesFit: null,
      practicesFitLevel: "segment",
      keyPlayersPaca: [],
      keyPlayersNational: [],
      hasSegmentKnowledge: true,
      digitalMaturity: "medium",
      avgTjmMin: 650,
      avgTjmMax: 850,
      caveats: null,
      sourceRunId: null,
      studySnapshotDate: "2026-08-22",
      effectiveStatus: "active",
      items: { painPoints: [], events: [], news: [], regulatory: [] },
      painPoints: [],
      events: [],
      news: [],
      regulatory: [
        {
          id: "reg-1",
          name: "IFRA 52",
          deadlineDate: "2026-12-31",
          urgency: "high",
          authority: "IFRA",
          description: null,
          kredoPractice: null,
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: null,
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ],
    },
    portfolio: {
      totalAccounts: 0,
      priorityAccounts: 0,
      accounts: [],
      scores: { byAccountId: {}, byCompanyId: {} },
    },
    competitiveMap: null,
    valueChain: null,
    news: { items: [], updatedAt: null },
    coverage: {
      study: { available: true, level: "segment", updatedAt: null },
      playbook: { available: true, level: "segment", updatedAt: null },
      competitiveMap: { available: false, level: null, updatedAt: null },
      valueChain: { available: false, level: null, updatedAt: null },
      regulatory: { available: true, level: "segment", updatedAt: null },
      news: { available: false, level: null, updatedAt: null },
    },
    sourceResolution: {},
  }
  return ws as never
}

describe("TerrainHomeDashboardMobile UI Integration with Révision", () => {
  it("renders Home with both Stories and Révision CTAs when both exist in playbook", () => {
    const ws = createMockWorkspace()
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: ws }))

    expect(html).toContain('data-terrain-surface="home"')
    expect(html).toContain("Corpus fiable")
    expect(html).toContain("IFRA 52")
    expect(html).toContain("Angle du jour")

    // Both CTAs are present in grid
    expect(html).toContain("Stories")
    expect(html).toContain("02") // 1 message + 1 thesis
    expect(html).toContain("Révision")
    expect(html).toContain("05") // 5 objections
  })

  it("renders only Révision CTA when stories are missing", () => {
    const ws = createMockWorkspace({
      message_sectoriel: null,
      market_thesis: [],
      theses: [],
    })
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: ws }))

    expect(html).toContain('data-terrain-surface="home"')
    expect(html).toContain("Révision")
    expect(html).toContain("05")
    expect(html).not.toContain("Stories")
  })

  it("renders only Stories CTA when objections are missing", () => {
    const ws = createMockWorkspace({
      objections: [],
    })
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: ws }))

    expect(html).toContain('data-terrain-surface="home"')
    expect(html).toContain("Stories")
    expect(html).not.toContain("Révision")
  })

  it("does not render any mode CTA when both stories and objections are missing", () => {
    const ws = createMockWorkspace({
      message_sectoriel: null,
      market_thesis: [],
      theses: [],
      objections: [],
    })
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: ws }))

    expect(html).toContain('data-terrain-surface="home"')
    expect(html).not.toContain("Accès aux modes Terrain")
    expect(html).not.toContain("Stories")
    expect(html).not.toContain("Révision")
  })

  it("does not render M4/M5 future buttons on Home", () => {
    const ws = createMockWorkspace()
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: ws }))

    expect(html).not.toContain("Top 3")
    expect(html).not.toContain("Essentiel")
  })

  it("renders Révision surface when initialSurface is 'revision'", () => {
    const ws = createMockWorkspace()
    const html = renderToString(
      createElement(TerrainHomeDashboardMobile, { workspace: ws, initialSurface: "revision" }),
    )

    // Révision surface completely replaces Home
    expect(html).toContain('data-terrain-surface="revision"')
    expect(html).not.toContain('data-terrain-surface="home"')
    expect(html).toContain("01 / 05")
    expect(html).toContain("Terrain")
    expect(html).toContain("IFRA, c&#x27;est le métier du réglementaire, pas du SI")
    expect(html).toContain("Voir la réponse")
  })
})

describe("TerrainRevisionMobile UI Rendering", () => {
  const ws = createMockWorkspace()
  const cards = buildTerrainRevisionCards(ws.knowledge.playbook)

  it("renders first card recto with objection text, progress 01 / 05, and 'Voir la réponse' CTA", () => {
    const html = renderToString(
      createElement(TerrainRevisionMobile, {
        cards,
        initialIndex: 0,
        initialRevealed: false,
        onBack: () => {},
      }),
    )

    expect(html).toContain('data-terrain-surface="revision"')
    expect(html).toContain('data-revision-index="0"')
    expect(html).toContain('data-revision-side="objection"')
    expect(html).toContain("01 / 05")
    expect(html).toContain("Révision")
    expect(html).toContain("Terrain")
    expect(html).toContain("Objection")
    expect(html).toContain("IFRA, c&#x27;est le métier du réglementaire, pas du SI")
    expect(html).toContain("Voir la réponse")
    expect(html).not.toContain("Suivante")

    // Invariant: no score, no quizzing, no fake source
    expect(html).not.toContain("Score")
    expect(html).not.toContain("Je savais")
    expect(html).not.toContain("Sources :")
  })

  it("renders first card verso when revealed with response text and 'Suivante' CTA", () => {
    const html = renderToString(
      createElement(TerrainRevisionMobile, {
        cards,
        initialIndex: 0,
        initialRevealed: true,
        onBack: () => {},
      }),
    )

    expect(html).toContain('data-revision-side="answer"')
    expect(html).toContain("Réponse")
    expect(html).toContain("Justement : la règle n&#x27;est pas le sujet SI")
    expect(html).toContain("Suivante")
    expect(html).not.toContain("Voir la réponse")
    // Small reference to the objection is retained
    expect(html).toContain("IFRA, c&#x27;est le métier du réglementaire, pas du SI")
  })

  it("renders 5th (last) card correctly with 05 / 05 progress", () => {
    const html = renderToString(
      createElement(TerrainRevisionMobile, {
        cards,
        initialIndex: 4,
        initialRevealed: false,
        onBack: () => {},
      }),
    )

    expect(html).toContain('data-revision-index="4"')
    expect(html).toContain("05 / 05")
    expect(html).toContain("Les achats IT sont gérés par le groupe")
    expect(html).toContain("Voir la réponse")
  })

  it("renders empty state fallback gracefully if cards array is empty", () => {
    const html = renderToString(
      createElement(TerrainRevisionMobile, { cards: [], onBack: () => {} }),
    )

    expect(html).toContain("Aucune objection disponible pour ce segment.")
    expect(html).toContain("← Retour Terrain")
  })
})

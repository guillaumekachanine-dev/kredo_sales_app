import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { TerrainHomeDashboardMobile } from "../TerrainHomeDashboardMobile"
import { TerrainStoriesMobile } from "../TerrainStoriesMobile"
import {
  buildTerrainStories,
} from "../terrain-stories-model"
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
              "La valeur commerciale du segment vient moins d'un TAM agrégé que de sa complexité opérationnelle : matières naturelles, formulation sur mesure, contraintes réglementaires et multiplicité des usages imposent une maîtrise continue du lien matière–formule–usage–client.",
            src_ids: [7, 13, 17, 20, 21],
            donc_commercialement:
              "DONC, commercialement : ouvrir sur la maîtrise matière–formule–client, la traçabilité et la capacité de changement plutôt que sur une transformation digitale générique.",
          },
          {
            id: 2,
            these:
              "Le bassin de Grasse traverse une vague visible d'investissements industriels et de montée en capacité, attestée notamment par Payan Bertrand et SFA NEROLI/Symrise, ce qui déplace le besoin vers l'intégration OT/IT, la qualité des données de production et la résilience avant ramp-up.",
            src_ids: [8, 18, 19, 25],
            donc_commercialement:
              "DONC, commercialement : un site en construction ou en montée en cadence mérite une priorité supérieure à un site stabilisé ; l'ouverture se fait avec le directeur industriel, la qualité et le SI.",
          },
          {
            id: 3,
            these:
              "IFRA 52 doit être traité comme un événement de données futur : la consultation est close et la notification est attendue vers la fin novembre 2026, mais aucune date exacte de notification ni aucune date de conformité propre à l'amendement 52 n'est publiée au snapshot.",
            src_ids: [6],
            donc_commercialement:
              "DONC, commercialement : la question utile est « serez-vous capables de mesurer l'impact sur vos matières, formules, usages et clients dès la notification ? », jamais « êtes-vous prêts pour le 30 novembre ? ».",
          },
          {
            id: 4,
            these:
              "Chez les leaders, la transformation data et IA touche déjà la création, la formulation, la gouvernance de données et les opérations ; cela invalide le pitch POC IA générique et remet au premier plan la qualité des données, les droits d'accès, la propriété intellectuelle et l'industrialisation.",
            src_ids: [12, 22, 23, 24],
            donc_commercialement:
              "DONC, commercialement : vendre un cas d'usage métier borné avec gouvernance, sécurité et MLOps, pas une démonstration d'IA détachée du patrimoine formulation.",
          },
          {
            id: 5,
            these:
              "Une « maison de composition » ne correspond pas à un modèle d'achat unique : les grands groupes publient des parcours fournisseurs et plateformes centrales structurés, alors que les maisons indépendantes exposent beaucoup moins leurs mécanismes d'achat IT.",
            src_ids: [10, 16, 20, 21, 22],
            donc_commercialement:
              "DONC, commercialement : qualifier dès le premier échange la frontière entre autonomie locale, siège, panel, plateforme centrale et budget de site ; ne jamais supposer qu'un modèle d'achat de groupe vaut pour une maison indépendante.",
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

describe("TerrainHomeDashboardMobile UI Integration", () => {
  it("renders Home with Stories CTA when stories exist in workspace playbook", () => {
    const ws = createMockWorkspace()
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: ws }))

    expect(html).toContain('data-terrain-surface="home"')
    expect(html).toContain("Corpus fiable")
    expect(html).toContain("IFRA 52")
    expect(html).toContain("Angle du jour")
    expect(html).toContain("Copier l’accroche")
    // Stories CTA exists and displays 06 stories
    expect(html).toContain("Stories")
    expect(html).toContain("06")
  })

  it("does not render Stories CTA when both message and theses are missing", () => {
    const ws = createMockWorkspace({
      message_sectoriel: null,
      market_thesis: [],
      theses: [],
    })
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: ws }))

    expect(html).toContain('data-terrain-surface="home"')
    expect(html).toContain("Corpus fiable")
    expect(html).not.toContain("Accès aux modes Terrain")
  })

  it("does not render M4, M5 future buttons on Home", () => {
    const ws = createMockWorkspace()
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: ws }))

    expect(html).not.toContain("Top 3")
    expect(html).not.toContain("Essentiel")
  })

  it("renders Stories surface when initialSurface is stories", () => {
    const ws = createMockWorkspace()
    const html = renderToString(
      createElement(TerrainHomeDashboardMobile, { workspace: ws, initialSurface: "stories" }),
    )

    // Stories surface replaces Home
    expect(html).toContain('data-terrain-surface="stories"')
    expect(html).not.toContain('data-terrain-surface="home"')
    expect(html).toContain("Message sectoriel")
    expect(html).toContain("01 / 06")
    expect(html).toContain("Terrain")
    expect(html).toContain("Précédent")
    expect(html).toContain("Suivant")
  })
})

describe("TerrainStoriesMobile UI Rendering", () => {
  const ws = createMockWorkspace()
  const stories = buildTerrainStories(ws.knowledge.playbook)

  it("renders first story (message sectoriel) with disabled Précédent and active progression", () => {
    const html = renderToString(
      createElement(TerrainStoriesMobile, { stories, initialIndex: 0, onBack: () => {} }),
    )

    expect(html).toContain('data-terrain-surface="stories"')
    expect(html).toContain('data-story-index="0"')
    expect(html).toContain("01 / 06")
    expect(html).toContain("Message sectoriel")
    expect(html).toContain("Votre fenêtre n&#x27;est pas « faire de l&#x27;IA »")
    // Précédent disabled
    expect(html).toContain("disabled")
    expect(html).toContain("Précédent")
    expect(html).toContain("Suivant")
    // No source line on story 1 (message sectoriel)
    expect(html).not.toContain("Sources :")
  })

  it("renders thesis story (index 1) with thesis text, commercial conclusion, and interactive source triggers", () => {
    const html = renderToString(
      createElement(TerrainStoriesMobile, { stories, initialIndex: 1, onBack: () => {} }),
    )

    expect(html).toContain('data-story-index="1"')
    expect(html).toContain("02 / 06")
    expect(html).toContain("Thèse 1")
    expect(html).toContain("complexité opérationnelle")
    expect(html).toContain("Donc, commercialement")
    expect(html).toContain("ouvrir sur la maîtrise matière")
    // Interactive source triggers for S7, S13, S17, S20, S21
    expect(html).toContain("Sources :")
    expect(html).toContain("S7")
    expect(html).toContain("S13")
    expect(html).toContain("S17")
    // Précédent is enabled
    expect(html).toContain("Précédent")
    expect(html).toContain("Suivant")
  })

  it("renders last thesis story (index 5) with 'Retour Terrain' primary CTA", () => {
    const html = renderToString(
      createElement(TerrainStoriesMobile, { stories, initialIndex: 5, onBack: () => {} }),
    )

    expect(html).toContain('data-story-index="5"')
    expect(html).toContain("06 / 06")
    expect(html).toContain("Thèse 5")
    expect(html).toContain("Une « maison de composition »")
    expect(html).toContain("Sources :")
    expect(html).toContain("S10")
    expect(html).toContain("S16")
    // Primary CTA is Retour Terrain
    expect(html).toContain("Retour Terrain")
    expect(html).not.toContain("Suivant")
  })

  it("renders empty state fallback gracefully if stories array is empty", () => {
    const html = renderToString(
      createElement(TerrainStoriesMobile, { stories: [], onBack: () => {} }),
    )

    expect(html).toContain("Aucune story disponible pour ce segment.")
    expect(html).toContain("← Retour Terrain")
  })
})

import { describe, expect, it } from "vitest"
import type { SectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"

function createMockKnowledge(overrides: Partial<SectorKnowledgeReadModel> = {}): SectorKnowledgeReadModel {
  return {
    segmentId: "seg-parfumerie-b2b",
    segmentName: "Compositions & ingrédients B2B",
    segmentSlug: "compositions-ingredients-b2b",
    segmentStatus: "active",
    macroId: "macro-parfumerie",
    macroName: "Parfumerie, Arômes & Cosmétique",
    macroSlug: "parfumerie-aromes-cosmetique",
    macroStatus: "active",
    description: "Acteurs de la composition de parfums et d'extraits naturels.",
    descriptionLevel: "segment",
    attractivenessScore: 82,
    attractivenessScoreLevel: "segment",
    marketSizeEurBn: 3.4,
    marketSizeEurBnLevel: "estimated",
    marketGrowthPct: 4.8,
    marketGrowthPctLevel: "segment",
    playbook: {
      theses: [
        {
          these: "Concentration des acteurs de niche par les leaders mondiaux.",
          detail: "Les rachats d'entreprises locales s'accélèrent sur le bassin de Grasse.",
          donc_commercialement: "Se positionner sur l'intégration des systèmes d'information post-acquisition.",
        },
      ],
      modeles_economiques: [
        {
          nom: "Formulation à façon",
          description: "Création et vente de concentrés parfumés personnalisés.",
        },
      ],
      fronts_technologiques: [
        {
          front: "IA générative appliquée à la création olfactive",
          impact: "Nécessite une gouvernance stricte des formules et données d'entraînement.",
        },
      ],
      dependances_critiques: [
        {
          dependance: "Outils de formulation et conformité IFRA (Coptis, Lascom)",
          description: "Dépendance logicielle forte pour la certification export.",
        },
      ],
      risques_et_opportunites: [
        {
          risque: "Durcissement réglementaire IFRA 52",
          opportunite: "Chantier d'audit et reformulation de portefeuille.",
          niveau: "majeur",
        },
      ],
    },
    playbookLevel: "segment",
    practicesFit: {
      "data-ai": { score: 90, rationale: "Forte intensité sur l'IA et la data gouvernance" },
    },
    practicesFitLevel: "segment",
    keyPlayersPaca: [{ name: "Robertet", size: "Grand groupe", note: "Site Plan de Grasse" }],
    keyPlayersNational: [{ name: "Givaudan France", size: "Leader", note: "Siège France" }],
    hasSegmentKnowledge: true,
    digitalMaturity: "high",
    avgTjmMin: 750,
    avgTjmMax: 950,
    caveats: {
      corpus: "29 sources officielles et sectorielles analysées",
      sources: ["https://www.robertet.com", "https://mesinfos.fr"],
    },
    sourceRunId: "run-e4-001",
    studySnapshotDate: "2026-08-14",
    effectiveStatus: "active",
    items: {
      painPoints: [
        {
          id: "pp-1",
          title: "Traçabilité des formules et conformité",
          description: "Contraintes strictes sur les allergènes et substances réglementées.",
          frequencyCount: 12,
          kredoPractice: "data-ai",
          verbatim: "Chaque mise à jour IFRA nous prend 3 mois de vérification manuelle.",
          sourceCompanyIds: [],
          resolvedLevel: "segment",
        },
      ],
      events: [
        {
          id: "ev-1",
          title: "IA Dates Arômes & Parfums",
          description: "Table ronde DSI sur l'IA de formulation.",
          eventType: "conference",
          eventDate: "2026-06-22",
          eventStatus: "confirmed",
          sourceUrl: "https://www.maison-ia.com",
          commercialOpportunity: "Opportunité de networking DSI",
          resolvedLevel: "segment",
          createdAt: "2026-06-01",
          updatedAt: "2026-06-01",
        },
      ],
      news: [],
      regulatory: [
        {
          id: "reg-1",
          name: "Notification IFRA 52",
          authority: "IFRA",
          description: "Restriction de 15 substances olfactives.",
          deadlineDate: "2026-11-14",
          urgency: "haute",
          kredoPractice: "data-ai",
          commercialAngle: "Screening automatisé du catalogue",
          isCommercialWindow: true,
          sourceUrl: "https://ifrafragrance.org",
          resolvedLevel: "segment",
          createdAt: "2026-06-01",
          updatedAt: "2026-06-01",
        },
      ],
    },
    painPoints: [
      {
        id: "pp-1",
        title: "Traçabilité des formules et conformité",
        description: "Contraintes strictes sur les allergènes et substances réglementées.",
        frequencyCount: 12,
        kredoPractice: "data-ai",
        verbatim: "Chaque mise à jour IFRA nous prend 3 mois de vérification manuelle.",
        sourceCompanyIds: [],
        resolvedLevel: "segment",
      },
    ],
    events: [
      {
        id: "ev-1",
        title: "IA Dates Arômes & Parfums",
        description: "Table ronde DSI sur l'IA de formulation.",
        eventType: "conference",
        eventDate: "2026-06-22",
        eventStatus: "confirmed",
        sourceUrl: "https://www.maison-ia.com",
        commercialOpportunity: "Opportunité de networking DSI",
        resolvedLevel: "segment",
        createdAt: "2026-06-01",
        updatedAt: "2026-06-01",
      },
    ],
    news: [],
    regulatory: [
      {
        id: "reg-1",
        name: "Notification IFRA 52",
        authority: "IFRA",
        description: "Restriction de 15 substances olfactives.",
        deadlineDate: "2026-11-14",
        urgency: "haute",
        kredoPractice: "data-ai",
        commercialAngle: "Screening automatisé du catalogue",
        isCommercialWindow: true,
        sourceUrl: "https://ifrafragrance.org",
        resolvedLevel: "segment",
        createdAt: "2026-06-01",
        updatedAt: "2026-06-01",
      },
    ],
    ...overrides,
  }
}

describe("SectorStudiesModal mono-segment", () => {
  it("contient exclusivement les données du segment actif sans catalogue multi-segments", () => {
    const knowledge = createMockKnowledge()
    expect(knowledge.segmentId).toBe("seg-parfumerie-b2b")
    expect(knowledge.description).toContain("composition de parfums")
    expect(knowledge.marketSizeEurBn).toBe(3.4)
    expect(knowledge.marketSizeEurBnLevel).toBe("estimated")
    expect(knowledge.attractivenessScore).toBe(82)
  })

  it("gère les provenances segment, macro, locked et estimated", () => {
    const knowledge = createMockKnowledge({
      descriptionLevel: "segment",
      marketSizeEurBnLevel: "estimated",
      attractivenessScoreLevel: "macro",
    })

    expect(knowledge.descriptionLevel).toBe("segment")
    expect(knowledge.marketSizeEurBnLevel).toBe("estimated")
    expect(knowledge.attractivenessScoreLevel).toBe("macro")
  })

  it("n'inclut aucune section vide lorsque les données correspondantes sont absentes", () => {
    const emptyKnowledge = createMockKnowledge({
      description: null,
      marketSizeEurBn: null,
      marketGrowthPct: null,
      attractivenessScore: null,
      digitalMaturity: null,
      avgTjmMin: null,
      avgTjmMax: null,
      playbook: {},
      painPoints: [],
      events: [],
      keyPlayersPaca: [],
      keyPlayersNational: [],
      caveats: {},
    })

    const hasEssential = Boolean(
      emptyKnowledge.description ||
      emptyKnowledge.marketSizeEurBn !== null ||
      emptyKnowledge.marketGrowthPct !== null ||
      emptyKnowledge.attractivenessScore !== null ||
      emptyKnowledge.digitalMaturity ||
      emptyKnowledge.avgTjmMin !== null,
    )
    expect(hasEssential).toBe(false)
  })
})

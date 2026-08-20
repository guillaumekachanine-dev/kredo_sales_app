import { describe, it, expect } from "vitest"
import { buildAccountPrioritizationModel } from "../models/build-account-prioritization-model"
import { buildSectorPlaybookModel } from "../models/build-sector-playbook-model"
import { buildSectorActivationModel } from "../models/build-sector-activation-model"
import { buildAccountAttackModel } from "../models/build-account-attack-model"
import type { SectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"

describe("BI Models", () => {
  it("les builders sont déterministes et ne mutent pas leurs entrées", () => {
    const mockSnapshot = {
      accounts: [
        { id: "1", name: "Test Account", sectorId: "s1", segmentId: "s1", actionPriorityScore: 50, potentialScore: 60, reachScore: 40, momentumScore: 30, legacyFolioScore: null }
      ],
      scores: {},
      signals: [],
      sectors: [],
      windows: [],
      _rawSources: {
        sectorRows: [],
        painPointRows: [],
        eventRows: [],
        newsRows: [],
        regulatoryRows: [],
      }
    }

    const cloned = JSON.parse(JSON.stringify(mockSnapshot))
    
    buildAccountPrioritizationModel(mockSnapshot as any)
    expect(mockSnapshot).toEqual(cloned)
  })

  it("les quatre provenances ne sont pas confondues", () => {
    const mockSnapshot = {
      accounts: [
        { id: "native", name: "Native", actionPriorityScore: 90, legacyFolioScore: null },
        { id: "legacy", name: "Legacy", actionPriorityScore: 80, legacyFolioScore: 4 },
        { id: "proxy", name: "Proxy", actionPriorityScore: 70, legacyFolioScore: null },
      ],
      scores: {
        "native": { scoreValue: 85, scoreBand: "A", confidenceScore: 90 }
      },
      signals: [],
      sectors: [],
      windows: []
    }

    const result = buildAccountPrioritizationModel(mockSnapshot as any)
    expect(result.find(r => r.accountId === "native")?.provenance).toBe("REAL_NATIVE")
    expect(result.find(r => r.accountId === "legacy")?.provenance).toBe("REAL_LEGACY")
    expect(result.find(r => r.accountId === "proxy")?.provenance).toBe("PROXY")
  })

  it("un secteur watch ne reçoit aucun faux playbook", () => {
    const mockSnapshot = {
      accounts: [],
      scores: {},
      signals: [],
      sectors: [
        { id: "s1", name: "Watch Sector", status: "watch" }
      ],
      windows: []
    }

    const playbook = buildSectorPlaybookModel(mockSnapshot as any, "s1")
    expect(playbook?.playbook.personas).toEqual([])
    expect(playbook?.playbook.roiArguments).toEqual([])
    expect(playbook?.summary).toBe("Étude sectorielle en préparation")
  })

  it("le dernier score natif est choisi par compte et ses composants rattachés", () => {
    const mockSnapshot = {
      accounts: [{ id: "c1", name: "Test" }],
      scores: {
        "c1": {
          runId: "r1",
          scoreValue: 80,
          components: [
            { key: "c1", label: "Strong driver", normalizedScore: 80 }
          ]
        }
      },
      signals: [],
      sectors: [],
      windows: []
    }

    const result = buildAccountAttackModel(mockSnapshot as any, "c1")
    expect(result?.positiveDrivers).toContain("Strong driver")
    expect(result?.provenance).toBe("REAL_NATIVE")
  })

  it("non-régression L4 : deux comptes de deux segments différents du même macro ne fusionnent jamais", () => {
    const MACRO_BTP = "macro-btp-111"
    const SEG_CONSTRUCTEURS = "seg-btp-constructeurs"
    const SEG_MATERIAUX = "seg-btp-materiaux"

    const accounts = [
      {
        id: "acc-bouygues",
        name: "Bouygues Construction",
        sectorId: MACRO_BTP,
        segmentId: SEG_CONSTRUCTEURS,
        potentialScore: 85,
        reachScore: 60,
        legacyFolioScore: 4,
      },
      {
        id: "acc-saint-gobain",
        name: "Saint-Gobain Distribution",
        sectorId: MACRO_BTP,
        segmentId: SEG_MATERIAUX,
        potentialScore: 90,
        reachScore: 70,
        legacyFolioScore: 5,
      },
    ]

    const sectorKnowledgeModels: SectorKnowledgeReadModel[] = [
      {
        segmentId: SEG_CONSTRUCTEURS,
        segmentName: "Constructeurs & Promoteurs",
        segmentSlug: "btp-constructeurs-promoteurs",
        segmentStatus: "development",
        macroId: MACRO_BTP,
        macroName: "Bâtiment & Travaux Publics",
        macroSlug: "btp",
        macroStatus: "active",
        description: "Constructeurs de bâtiments",
        descriptionLevel: "segment",
        attractivenessScore: 4.5,
        attractivenessScoreLevel: "segment",
        marketSizeEurBn: 120,
        marketSizeEurBnLevel: "segment",
        marketGrowthPct: 2.1,
        marketGrowthPctLevel: "segment",
        playbook: { personas: [{ role: "DG" }] },
        playbookLevel: "macro",
        practicesFit: { cyber: 3, data_ai: 4 },
        practicesFitLevel: "segment",
        keyPlayersPaca: [],
        keyPlayersNational: [],
        hasSegmentKnowledge: true,
        digitalMaturity: "medium",
        avgTjmMin: 700,
        avgTjmMax: 900,
        caveats: null,
        sourceRunId: null,
        studySnapshotDate: null,
        effectiveStatus: "active",
        items: { painPoints: [], events: [], news: [], regulatory: [] },
        painPoints: [],
        events: [],
        news: [],
        regulatory: [],
      },
      {
        segmentId: SEG_MATERIAUX,
        segmentName: "Matériaux & Négoce BTP",
        segmentSlug: "btp-materiaux-negoce",
        segmentStatus: "development",
        macroId: MACRO_BTP,
        macroName: "Bâtiment & Travaux Publics",
        macroSlug: "btp",
        macroStatus: "active",
        description: "Négoce et fabrication de matériaux",
        descriptionLevel: "segment",
        attractivenessScore: 4.2,
        attractivenessScoreLevel: "segment",
        marketSizeEurBn: 45,
        marketSizeEurBnLevel: "segment",
        marketGrowthPct: 1.5,
        marketGrowthPctLevel: "segment",
        playbook: {},
        playbookLevel: "macro",
        practicesFit: { cyber: 2, data_ai: 3 },
        practicesFitLevel: "segment",
        keyPlayersPaca: [],
        keyPlayersNational: [],
        hasSegmentKnowledge: true,
        digitalMaturity: "low",
        avgTjmMin: 650,
        avgTjmMax: 850,
        caveats: null,
        sourceRunId: null,
        studySnapshotDate: null,
        effectiveStatus: "active",
        items: { painPoints: [], events: [], news: [], regulatory: [] },
        painPoints: [],
        events: [],
        news: [],
        regulatory: [],
      },
    ]

    const result = buildSectorActivationModel(
      {
        accounts,
        sectorKnowledgeModels,
      },
      { now: Date.now() },
    )

    expect(result.sectors).toHaveLength(2)

    const constructeurs = result.sectors.find((s) => s.id === SEG_CONSTRUCTEURS)
    const materiaux = result.sectors.find((s) => s.id === SEG_MATERIAUX)

    expect(constructeurs).toBeDefined()
    expect(materiaux).toBeDefined()

    // Vérification de la non-fusion :
    expect(constructeurs?.linkedAccountIds).toEqual(["acc-bouygues"])
    expect(constructeurs?.linkedAccountCount).toBe(1)
    expect(constructeurs?.name).toBe("Constructeurs & Promoteurs")
    expect(constructeurs?.status).toBe("active")

    expect(materiaux?.linkedAccountIds).toEqual(["acc-saint-gobain"])
    expect(materiaux?.linkedAccountCount).toBe(1)
    expect(materiaux?.name).toBe("Matériaux & Négoce BTP")
    expect(materiaux?.status).toBe("active")
  })

  it("garantit l'unicité stricte des IDs de fenêtres (keys React) pour un item partagé entre segments", () => {
    const SHARED_REG_ID = "768a6805-658f-4dd6-a400-b36f42e2cb6e"
    const sharedRegulatoryItem = {
      id: SHARED_REG_ID,
      name: "Directive CSRD",
      authority: "UE",
      description: "Reporting de durabilité",
      deadlineDate: "2026-12-31",
      urgency: "critical",
      kredoPractice: "data_ai",
      commercialAngle: "Audit et conformité CSRD",
      isCommercialWindow: true,
      sourceUrl: null,
      resolvedLevel: "macro" as const,
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    }

    const sectorKnowledgeModels: SectorKnowledgeReadModel[] = [
      {
        segmentId: "seg-1",
        segmentName: "Segment 1",
        segmentSlug: "seg-1",
        segmentStatus: "active",
        macroId: "macro-1",
        macroName: "Macro 1",
        macroSlug: "macro-1",
        macroStatus: "active",
        description: null,
        descriptionLevel: "segment",
        attractivenessScore: 4,
        attractivenessScoreLevel: "segment",
        marketSizeEurBn: null,
        marketSizeEurBnLevel: "segment",
        marketGrowthPct: null,
        marketGrowthPctLevel: "segment",
        playbook: null,
        playbookLevel: "segment",
        practicesFit: null,
        practicesFitLevel: "segment",
        keyPlayersPaca: [],
        keyPlayersNational: [],
        hasSegmentKnowledge: true,
        digitalMaturity: null,
        avgTjmMin: null,
        avgTjmMax: null,
        caveats: null,
        sourceRunId: null,
        studySnapshotDate: null,
        effectiveStatus: "active",
        items: { painPoints: [], events: [], news: [], regulatory: [sharedRegulatoryItem] },
        painPoints: [],
        events: [],
        news: [],
        regulatory: [sharedRegulatoryItem],
      },
      {
        segmentId: "seg-2",
        segmentName: "Segment 2",
        segmentSlug: "seg-2",
        segmentStatus: "active",
        macroId: "macro-1",
        macroName: "Macro 1",
        macroSlug: "macro-1",
        macroStatus: "active",
        description: null,
        descriptionLevel: "segment",
        attractivenessScore: 4,
        attractivenessScoreLevel: "segment",
        marketSizeEurBn: null,
        marketSizeEurBnLevel: "segment",
        marketGrowthPct: null,
        marketGrowthPctLevel: "segment",
        playbook: null,
        playbookLevel: "segment",
        practicesFit: null,
        practicesFitLevel: "segment",
        keyPlayersPaca: [],
        keyPlayersNational: [],
        hasSegmentKnowledge: true,
        digitalMaturity: null,
        avgTjmMin: null,
        avgTjmMax: null,
        caveats: null,
        sourceRunId: null,
        studySnapshotDate: null,
        effectiveStatus: "active",
        items: { painPoints: [], events: [], news: [], regulatory: [sharedRegulatoryItem] },
        painPoints: [],
        events: [],
        news: [],
        regulatory: [sharedRegulatoryItem],
      },
    ]

    const result = buildSectorActivationModel(
      { accounts: [], sectorKnowledgeModels },
      { now: Date.now() },
    )

    expect(result.windows).toHaveLength(2)
    const windowIds = result.windows.map((w) => w.id)
    const uniqueIds = new Set(windowIds)

    expect(uniqueIds.size).toBe(2)
    expect(windowIds).toContain(`regulation-seg-1-${SHARED_REG_ID}`)
    expect(windowIds).toContain(`regulation-seg-2-${SHARED_REG_ID}`)
  })
})

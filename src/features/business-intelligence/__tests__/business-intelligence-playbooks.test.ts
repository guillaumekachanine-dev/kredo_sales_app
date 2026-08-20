import { describe, it, expect } from "vitest"
import { buildSectorPlaybookModel } from "../models/build-sector-playbook-model"
import { buildBusinessIntelligenceDesktopModel } from "../presenters/build-business-intelligence-desktop-model"
import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"

const mockSnapshot: any = {

  state: "ready",
  generatedAt: "2026-07-17T00:00:00Z",
  lastUpdatedAt: "2026-07-17T00:00:00Z",
  accounts: [
    {
      id: "acc-1",
      name: "Acme Corp",
      sectorId: "sec-active-full",
      actionPriorityScore30d: 85,
      actionPriorityScore90d: 65,
      actionPriorityScore180d: 45,
      potentialScore: 90,
      reachScore: 40,
      momentumScore30d: 70,
      momentumScore90d: 60,
      momentumScore180d: 50,
      legacyFolioScore: null,
      nextDecision: "Contacter le CEO"
    },
    {
      id: "acc-2",
      name: "Beta Inc",
      sectorId: "sec-watch",
      actionPriorityScore30d: 55,
      actionPriorityScore90d: 55,
      actionPriorityScore180d: 55,
      potentialScore: 50,
      reachScore: 50,
      momentumScore30d: 50,
      momentumScore90d: 50,
      momentumScore180d: 50,
      legacyFolioScore: null,
      nextDecision: null
    }
  ],
  scores: {
    "acc-1": {
      runId: "run-1",
      scoreValue: 88,
      scoreBand: "A",
      confidenceScore: 90,
      calculatedAt: "2026-07-17T00:00:00Z",
      scoreVersion: "v1",
      summary: "High potential",
      components: []
    }
  },
  signals: [],
  windows: [
    {
      id: "win-1",
      title: "New Regulation active",
      sectorId: "sec-active-full",
      sectorName: "Finance",
      sourceType: "regulation",
      practiceLabel: "Compliance",
      isOpenNow: true,
      urgencyScore: 85,
      exposedAccountCount: 1,
      playbookSummary: "Compliance Audit",
      suggestedAction: "Propose audit",
      exposedAccounts: ["acc-1"],
      exposedAccountIds: ["acc-1"],
      sectorSlug: "finance",
      sourceId: "src-1",
      sourceLabel: "Authority",
      sourceUrl: "https://example.com/source",
      dataOrigin: "REAL_NATIVE",
      practiceKey: "cyber",
      deadlineAt: "2026-12-31"
    }
  ],
  sectors: [
    {
      id: "sec-active-full",
      slug: "finance",
      name: "Finance",
      status: "active",
      attractivenessScore: 80,
      digitalMaturity: "high",
      topPracticeKey: "cyber",
      topPracticeLabel: "Cybersecurity",
      practiceScores: { cyber: 90, data_ai: 40, cloud_eng: 20, product: 10 },
      linkedAccountIds: ["acc-1"],
      linkedAccountCount: 1,
      coveredAccountCount: 0,
      averagePotentialScore: 90,
      averageReachScore: 40,
      coverageGap: 60,
      dataCoverageRatio: 0,
      openWindowCount: 1,
      futureWindowCount: 0,
      undatedWindowCount: 0,
      expiredWindowCount: 0,
      activationState: "to_activate",
      updatedAt: "2026-07-17T00:00:00Z",
      description: "Secteur bancaire et financier",
      marketSizeEurBn: 150,
      marketGrowthPct: 4.5,
      keyPlayersPaca: [{ name: "Caisse Epargne", size: "M", note: "Fort ancrage local" }],
      keyPlayersNational: [{ name: "BNP", size: "L", note: "Leader national" }],
      avgTjmMin: 650,
      avgTjmMax: 950,
      caveats: {
        verbatims: "Verbatims issus d'entretiens DSI",
        frequences: "Calculé sur 12 sources",
        corpus: "DSI Banque Pop, BNP",
        marche: "Rapports Gartner 2026",
        sources: ["https://example.com/source1", "https://example.com/source2"]
      },
      playbook: {
        personas: [
          { role: "DSI", enjeu: "Sécurité", peur: "Fuite de données" }
        ],
        roi_arguments: ["Réduction de 20% des coûts d'audit"],
        objections: [
          { objection: "Trop cher", reponse: "Rentabilisé en 6 mois" }
        ],
        entry_points: ["Audit de sécurité initial"]
      },
      painPoints: [
        {
          id: "pp-1",
          title: "Conformité NIS 2",
          description: "Mise en conformité réglementaire",
          frequencyCount: 8,
          kredoPractice: "cyber",
          verbatim: "NIS 2 est notre priorité absolue"
        }
      ]
    },
    {
      id: "sec-active-partial",
      slug: "retail",
      name: "Retail",
      status: "active",
      attractivenessScore: 60,
      digitalMaturity: "medium",
      topPracticeKey: "data_ai",
      topPracticeLabel: "Data & AI",
      practiceScores: { data_ai: 80, cyber: 30, cloud_eng: 10, product: 10 },
      linkedAccountIds: [],
      linkedAccountCount: 0,
      coveredAccountCount: 0,
      averagePotentialScore: null,
      averageReachScore: null,
      coverageGap: null,
      dataCoverageRatio: 0,
      openWindowCount: 0,
      futureWindowCount: 0,
      undatedWindowCount: 0,
      expiredWindowCount: 0,
      activationState: "data_insufficient",
      updatedAt: "2026-07-17T00:00:00Z",
      description: "Secteur de la distribution",
      marketSizeEurBn: null,
      marketGrowthPct: null,
      keyPlayersPaca: [],
      keyPlayersNational: [],
      avgTjmMin: null,
      avgTjmMax: null,
      caveats: null,
      playbook: null,
      painPoints: []
    },
    {
      id: "sec-watch",
      slug: "energie",
      name: "Énergie",
      status: "watch",
      attractivenessScore: null,
      digitalMaturity: null,
      topPracticeKey: "cloud_eng",
      topPracticeLabel: "Cloud Eng",
      practiceScores: {},
      linkedAccountIds: ["acc-2"],
      linkedAccountCount: 1,
      coveredAccountCount: 0,
      averagePotentialScore: 50,
      averageReachScore: 50,
      coverageGap: 50,
      dataCoverageRatio: 0,
      openWindowCount: 0,
      futureWindowCount: 0,
      undatedWindowCount: 0,
      expiredWindowCount: 0,
      activationState: "to_monitor",
      updatedAt: "2026-07-17T00:00:00Z",
      description: null,
      marketSizeEurBn: null,
      marketGrowthPct: null,
      keyPlayersPaca: [],
      keyPlayersNational: [],
      avgTjmMin: null,
      avgTjmMax: null,
      caveats: null,
      playbook: null,
      painPoints: []
    }
  ],
  filterOptions: {
    sectors: [],
    lifecycles: [],
    priorities: [],
    practices: [],
    sourceTypes: [],
    priorityBands: [],
    temporalStatuses: [],
    statusFilters: []
  },
  trust: {
    accountPotential: {},
    accountReach: {},
    accountMomentum: {},
    priorityCalculated: {}
  },
  dataQuality: {
    syntheticInteractionsCount: 0,
    realInteractionsCount: 0,
    hasDemoData: false,
    limitations: []
  }
}

describe("Business Intelligence Playbooks Tests", () => {
  it("construit un playbook entièrement typé pour un secteur actif complet", () => {
    const profile = buildSectorPlaybookModel(mockSnapshot, "sec-active-full")
    expect(profile).not.toBeNull()
    expect(profile!.status).toBe("active")
    expect(profile!.name).toBe("Finance")
    expect(profile!.description).toBe("Secteur bancaire et financier")
    expect(profile!.marketSizeEurBn).toBe(150)
    expect(profile!.marketGrowthPct).toBe(4.5)
    expect(profile!.playbook.personas).toHaveLength(1)
    expect(profile!.playbook.personas[0].role).toBe("DSI")
    expect(profile!.playbook.roiArguments).toContain("Réduction de 20% des coûts d'audit")
    expect(profile!.playbook.objections[0].objection).toBe("Trop cher")
    expect(profile!.playbook.entryPoints).toContain("Audit de sécurité initial")
    expect(profile!.painPoints).toHaveLength(1)
    expect(profile!.painPoints[0].title).toBe("Conformité NIS 2")
    expect(profile!.painPoints[0].verbatim).toBe("NIS 2 est notre priorité absolue")
    expect(profile!.deadlines).toHaveLength(1)
    expect(profile!.deadlines[0].title).toBe("New Regulation active")
    expect(profile!.keyPlayers.paca).toHaveLength(1)
    expect(profile!.keyPlayers.paca[0].name).toBe("Caisse Epargne")
    expect(profile!.caveats).not.toBeNull()
    expect(profile!.caveats!.corpus).toBe("DSI Banque Pop, BNP")
    expect(profile!.sources).toContain("https://example.com/source1")
  })

  it("gère correctement un secteur actif partiellement renseigné sans lever d'erreurs", () => {
    const profile = buildSectorPlaybookModel(mockSnapshot, "sec-active-partial")
    expect(profile).not.toBeNull()
    expect(profile!.status).toBe("active")
    expect(profile!.playbook.personas).toHaveLength(0)
    expect(profile!.playbook.roiArguments).toHaveLength(0)
    expect(profile!.painPoints).toHaveLength(0)
    expect(profile!.caveats).toBeNull()
    expect(profile!.sources).toHaveLength(0)
    expect(profile!.marketSizeEurBn).toBeNull()
  })

  it("gère correctement un secteur watch sans faux playbooks ni fallbacks", () => {
    const profile = buildSectorPlaybookModel(mockSnapshot, "sec-watch")
    expect(profile).not.toBeNull()
    expect(profile!.status).toBe("watch")
    expect(profile!.summary).toBe("Étude sectorielle en préparation")
    expect(profile!.playbook.personas).toHaveLength(0)
    expect(profile!.playbook.roiArguments).toHaveLength(0)
    expect(profile!.playbook.objections).toHaveLength(0)
    expect(profile!.playbook.entryPoints).toHaveLength(0)
    expect(profile!.painPoints).toHaveLength(0)
    expect(profile!.keyPlayers.paca).toHaveLength(0)
    expect(profile!.caveats).toBeNull()
    expect(profile!.sources).toHaveLength(0)
  })

  it("retourne des données de période (30 / 90 / 180) distinctes dans le présentateur", () => {
    const desktopModel = buildBusinessIntelligenceDesktopModel(mockSnapshot)
    
    const p30 = desktopModel.periods[30]
    const p90 = desktopModel.periods[90]
    const p180 = desktopModel.periods[180]

    // p30: acc-1 has 85, acc-2 has 55. Sorted: acc-1 first.
    expect(p30.priorityBoard[0].priority).toBe(85)
    expect(p30.priorityBoard[0].name).toBe("Acme Corp")
    expect(p30.priorityBoard[0].momentum).toBe(70)

    // p90: acc-1 has 65, acc-2 has 55. Sorted: acc-1 first.
    expect(p90.priorityBoard[0].priority).toBe(65)
    expect(p90.priorityBoard[0].name).toBe("Acme Corp")
    expect(p90.priorityBoard[0].momentum).toBe(60)

    // p180: acc-1 has 45, acc-2 has 55. Sorted: acc-2 (Beta Inc) first!
    expect(p180.priorityBoard[0].priority).toBe(55)
    expect(p180.priorityBoard[0].name).toBe("Beta Inc")
    expect(p180.priorityBoard[0].momentum).toBe(50)
  })

  it("gère l'extraction correcte des métriques watch pour un secteur", () => {
    const profile = buildSectorPlaybookModel(mockSnapshot, "sec-watch")
    expect(profile).not.toBeNull()
    expect(profile!.linkedAccountCount).toBe(1)
    expect(profile!.attractivenessScore).toBeNull()
  })

  it("filtre correctement par sectorId (UUID) et gère l'état de sélection", () => {
    const desktopModel = buildBusinessIntelligenceDesktopModel(mockSnapshot)
    const p30 = desktopModel.periods[30]

    // Filtre par secteur actif avec compte
    const filteredFull = p30.priorityBoard.filter(a => a.sectorId === "sec-active-full")
    expect(filteredFull).toHaveLength(1)
    expect(filteredFull[0].accountId).toBe("acc-1")

    // Filtre par secteur sans compte dans le portefeuille
    const filteredPartial = p30.priorityBoard.filter(a => a.sectorId === "sec-active-partial")
    expect(filteredPartial).toHaveLength(0)
  })

  it("extrait des chaînes affichables depuis la forme objet du playbook Master Study (ADR-0021, E4) sans planter", () => {
    // Régression : le contrat E4 réel (segment pilote seg-parfumerie-compositions-b2b)
    // porte roi_arguments/entry_points/personas en objets structurés sourcés, pas en
    // chaînes brutes ni en clés role/enjeu/peur. Un cast aveugle vers string[] faisait
    // planter le rendu (React #31, objet passé comme enfant) — jamais détecté avant la
    // première ingestion réelle, seul secteur seedé pré-chantier exerçait ce chemin.
    const e4Snapshot = {
      ...mockSnapshot,
      sectors: [
        ...mockSnapshot.sectors,
        {
          id: "sec-e4-shape",
          slug: "seg-parfumerie-compositions-b2b",
          name: "Compositions & ingrédients B2B",
          status: "active",
          attractivenessScore: 4.8,
          digitalMaturity: "high",
          topPracticeKey: "data_ai",
          topPracticeLabel: "Data & AI",
          practiceScores: { data_ai: 90, cyber: 10, cloud_eng: 10, product: 10 },
          linkedAccountIds: [],
          linkedAccountCount: 0,
          coveredAccountCount: 0,
          averagePotentialScore: null,
          averageReachScore: null,
          coverageGap: null,
          dataCoverageRatio: 0,
          openWindowCount: 0,
          futureWindowCount: 0,
          undatedWindowCount: 0,
          expiredWindowCount: 0,
          activationState: "to_activate",
          updatedAt: "2026-08-14T00:00:00Z",
          description: "Segment pilote Master Study",
          marketSizeEurBn: null,
          marketGrowthPct: null,
          keyPlayersPaca: [],
          keyPlayersNational: [],
          avgTjmMin: null,
          avgTjmMax: null,
          caveats: null,
          playbook: {
            personas: [
              { fonction: "DSI / responsable SI", repond_de: "Fiabilité du SI et des intégrations.", ce_qui_le_reveille: "Un ramp-up industriel qui dépend d'interfaces fragiles." },
            ],
            roi_arguments: [
              { src_ids: [6], argument: "IFRA notifie l'amendement 52 fin novembre 2026 : réduire le temps de qualification du portefeuille impacté." },
            ],
            objections: [
              { objection: "IFRA, c'est le métier du réglementaire, pas du SI.", reponse: "Le sujet SI est le temps pour relier la règle aux matières, formules et clients." },
            ],
            entry_points: [
              { angle: "Être capable de mesurer l'impact portefeuille dès la notification.", signal: "Notification IFRA 52 attendue fin novembre 2026", src_ids: [6], interlocuteur: "Affaires réglementaires" },
            ],
          },
          painPoints: [],
        },
      ],
    }

    const profile = buildSectorPlaybookModel(e4Snapshot, "sec-e4-shape")
    expect(profile).not.toBeNull()

    expect(profile!.playbook.personas).toHaveLength(1)
    expect(profile!.playbook.personas[0].role).toBe("DSI / responsable SI")
    expect(profile!.playbook.personas[0].enjeu).toBe("Fiabilité du SI et des intégrations.")
    expect(profile!.playbook.personas[0].peur).toBe("Un ramp-up industriel qui dépend d'interfaces fragiles.")

    expect(profile!.playbook.roiArguments).toHaveLength(1)
    expect(profile!.playbook.roiArguments[0]).toContain("IFRA notifie l'amendement 52")
    expect(profile!.playbook.roiArguments.every((value) => typeof value === "string")).toBe(true)

    expect(profile!.playbook.entryPoints).toHaveLength(1)
    expect(profile!.playbook.entryPoints[0]).toBe(
      "Notification IFRA 52 attendue fin novembre 2026 — Être capable de mesurer l'impact portefeuille dès la notification.",
    )
    expect(profile!.playbook.entryPoints.every((value) => typeof value === "string")).toBe(true)
  })
})



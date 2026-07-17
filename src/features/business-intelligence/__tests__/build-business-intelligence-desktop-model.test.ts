import { describe, it, expect } from "vitest"
import { buildBusinessIntelligenceDesktopModel } from "../presenters/build-business-intelligence-desktop-model"

// Mock snapshot
const mockSnapshot: any = {
  generatedAt: "2026-07-17T00:00:00Z",
  dataQuality: { hasDemoData: true },
  accounts: [
    {
      id: "acc-1",
      name: "Acme Corp",
      sectorId: "sec-1",
      actionPriorityScore30d: 85,
      potentialScore: 90,
      reachScore: 40,
      momentumScore30d: 60,
      legacyFolioScore: null,
      nextDecision: "Contacter le CEO"
    },
    {
      id: "acc-2",
      name: "Watch Corp",
      sectorId: "sec-watch",
      actionPriorityScore30d: 50,
      potentialScore: 50,
      reachScore: 50,
      momentumScore30d: 50,
      legacyFolioScore: null,
      nextDecision: null
    }
  ],
  scores: {
    "acc-1": {
      scoreValue: 88,
      scoreBand: "A",
      confidenceScore: 90,
      scoreVersion: "v1",
      calculatedAt: "2026-07-17T00:00:00Z",
      summary: "High potential",
      components: []
    }
  },
  signals: [],
  windows: [
    {
      id: "win-1",
      title: "New Regulation",
      sectorId: "sec-1",
      sectorName: "Finance",
      sourceType: "regulation",
      practiceLabel: "Compliance",
      isOpenNow: true,
      urgencyScore: 85,
      exposedAccountCount: 1,
      playbookSummary: "Compliance Audit",
      suggestedAction: "Propose audit",
      exposedAccounts: ["acc-1"]
    }
  ],
  sectors: [
    {
      id: "sec-1",
      name: "Finance",
      status: "active",
      attractivityScore: 80,
      activeWindowsCount: 1,
      linkedAccountsCount: 1,
      averageReach: 40,
      topPracticeLabel: "Compliance",
      playbook: {}
    },
    {
      id: "sec-watch",
      name: "Retail",
      status: "watch",
      attractivityScore: null,
      activeWindowsCount: 0,
      linkedAccountsCount: 1,
      averageReach: 50,
      topPracticeLabel: null,
      playbook: {}
    }
  ],
  interactions: [],
  agenda: []
}

describe("Business Intelligence Desktop Presenter", () => {
  it("est déterministe et calcule correctement les KPIs", () => {
    const model = buildBusinessIntelligenceDesktopModel(mockSnapshot)
    expect(model.generatedAt).toBe("2026-07-17T00:00:00Z")
    expect(model.hasDemoData).toBe(true)
    expect(model.kpis.priorityAccountsCount).toBe(2)
    expect(model.kpis.openWindowsCount).toBe(1)
    expect(model.kpis.activeSectorsCount).toBe(1) // Only active ones
    expect(model.kpis.averageConfidence).toBe(90) // acc-1 has 90, acc-2 has no native score
  })

  it("gère l'absence de score natif correctement", () => {
    const model = buildBusinessIntelligenceDesktopModel(mockSnapshot)
    const acc2Board = model.priorityBoard.find(a => a.accountId === "acc-2")
    expect(acc2Board?.nativeScore).toBeNull()
    
    const acc2Attack = model.attackPanelData["acc-2"]
    expect(acc2Attack?.confidence).toBeNull()
  })

  it("ne crée pas de faux fallbacks dans le plan d'attaque", () => {
    const model = buildBusinessIntelligenceDesktopModel(mockSnapshot)
    const acc2Attack = model.attackPanelData["acc-2"]
    expect(acc2Attack?.recommendedPractice).toBeNull()
    expect(acc2Attack?.approachAngle).toBeNull()
    expect(acc2Attack?.nextAction).toBeNull()
  })

  it("utilise la prochaine action réelle (nextDecision)", () => {
    const model = buildBusinessIntelligenceDesktopModel(mockSnapshot)
    const acc1Board = model.priorityBoard.find(a => a.accountId === "acc-1")
    expect(acc1Board?.nextAction).toBe("Contacter le CEO")
  })
})

import { describe, expect, it } from "vitest"
import { buildBusinessIntelligenceDesktopModel } from "../presenters/build-business-intelligence-desktop-model"
import { makeBusinessIntelligenceSnapshot, makePortfolioAccount } from "./business-intelligence-test-fixtures"

describe("Business Intelligence Desktop Presenter", () => {
  it("ordonne les comptes par faits explicites sans note synthétique", () => {
    const snapshot = makeBusinessIntelligenceSnapshot({
      accounts: [
        makePortfolioAccount("inactive", { name: "Inactive", inactivityRiskScore30d: 90 }),
        makePortfolioAccount("opportunity", {
          name: "Opportunity",
          openOpportunityCount: 1,
          plannedCommercialEngagement30d: 0,
          inactivityRiskScore30d: 20,
          nextDecision: "Planifier la prochaine étape",
        }),
      ],
    })

    const period = buildBusinessIntelligenceDesktopModel(snapshot).periods[30]
    expect(period.priorityBoard.map((account) => account.accountId)).toEqual(["opportunity", "inactive"])
    expect(period.priorityBoard[0]?.nextAction).toBe("Planifier la prochaine étape")
    expect(period.matrixPoints[0]).toMatchObject({ openOpportunityCount: 1, reach: 50, momentum: 0 })
  })

  it("place un signal urgent avant les autres faits", () => {
    const snapshot = makeBusinessIntelligenceSnapshot({
      accounts: [
        makePortfolioAccount("opportunity", { openOpportunityCount: 1 }),
        makePortfolioAccount("signal"),
      ],
      signals: [{
        id: "signal-1",
        companyId: "signal",
        title: "Échéance urgente",
        summary: null,
        category: "regulation",
        relevanceScore: 80,
        urgencyScore: 95,
        detectedAt: "2026-07-16T00:00:00.000Z",
        recommendedAction: "Préparer un atelier",
      }],
    })

    expect(buildBusinessIntelligenceDesktopModel(snapshot).periods[30].priorityBoard[0]?.accountId).toBe("signal")
  })
})

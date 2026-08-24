import { describe, expect, it } from "vitest"
import { buildAccountAttackModel } from "../models/build-account-attack-model"
import { buildAccountPrioritizationModel } from "../models/build-account-prioritization-model"
import { makeBusinessIntelligenceSnapshot, makePortfolioAccount } from "./business-intelligence-test-fixtures"

describe("BI Models", () => {
  it("ne mute pas le snapshot", () => {
    const snapshot = makeBusinessIntelligenceSnapshot({ accounts: [makePortfolioAccount("account-1")] })
    const before = structuredClone(snapshot)
    buildAccountPrioritizationModel(snapshot)
    expect(snapshot).toEqual(before)
  })

  it("explique les points de vigilance par des faits", () => {
    const snapshot = makeBusinessIntelligenceSnapshot({
      accounts: [makePortfolioAccount("account-1", {
        reachScore: 20,
        openOpportunityCount: 1,
        plannedCommercialEngagement30d: 0,
        inactivityRiskScore30d: 90,
      })],
    })
    const attack = buildAccountAttackModel(snapshot, "account-1")
    expect(attack?.vigilancePoints).toContain("Couverture relationnelle faible")
    expect(attack?.vigilancePoints).toContain("Relation commerciale inactive sur la période")
    expect(attack?.vigilancePoints).toContain("Opportunité ouverte sans prochaine action planifiée")
  })
})

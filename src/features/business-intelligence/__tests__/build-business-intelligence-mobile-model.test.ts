import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  buildBusinessIntelligenceMobileModel,
  getMobileSectorAccounts,
  resolveMobilePriorityAccountId,
  resolveMobileSectorAccountId,
} from "../presenters/build-business-intelligence-mobile-model"
import { makeBusinessIntelligenceSnapshot, makePortfolioAccount } from "./business-intelligence-test-fixtures"

describe("Business Intelligence Mobile presenter", () => {
  const snapshot = makeBusinessIntelligenceSnapshot({
    accounts: [
      makePortfolioAccount("account-a", { sectorId: "sector-a", name: "A", inactivityRiskScore30d: 80 }),
      makePortfolioAccount("account-b", { sectorId: "sector-a", name: "B", openOpportunityCount: 1 }),
    ],
  })

  it("conserve les indicateurs spécialisés et les sélections", () => {
    const model = buildBusinessIntelligenceMobileModel(snapshot)
    expect(model.periods[30].accounts[0]).toMatchObject({
      accountId: "account-b",
      reach: 50,
      momentum: 0,
      openOpportunityCount: 1,
    })
    expect(resolveMobilePriorityAccountId(model.periods[30].accounts, "account-a")).toBe("account-a")
  })

  it("filtre par identifiant de secteur", () => {
    const period = buildBusinessIntelligenceMobileModel(snapshot).periods[30]
    expect(getMobileSectorAccounts(period, "sector-a")).toHaveLength(2)
    expect(resolveMobileSectorAccountId(period, "sector-a", null)).toBe("account-b")
    expect(getMobileSectorAccounts(period, "missing")).toEqual([])
  })

  it("ne monte jamais le Desktop dans la branche Mobile de la route", () => {
    const source = readFileSync("src/app/(app)/intelligence/page.tsx", "utf8")
    const mobileBranch = source.split('if (device === "mobile")')[1]?.split("const viewModel = buildBusinessIntelligenceDesktopModel")[0] ?? ""
    expect(mobileBranch).toContain("BusinessIntelligenceMobile")
    expect(mobileBranch).not.toContain("BusinessIntelligenceDesktop")
  })
})

import { describe, it, expect } from "vitest"
import {
  buildMobilePriorityViewModel,
  parseLens,
} from "../mobile-priority-view-model"
import type { ProspectionPortfolioAccount } from "@/lib/prospection/portfolio-account-metrics"
import type { ProspectionSummaryFilters } from "../synthese-view-model"
import type { PortfolioTrustBundle } from "@/lib/prospection/portfolio-account-metrics"

function makeAccount(
  id: string,
  overrides: Partial<ProspectionPortfolioAccount> = {},
): ProspectionPortfolioAccount {
  return {
    id,
    name: `Account ${id}`,
    sector: "tech",
    sectorId: null,
    segmentId: null,
    lifecycle: "prospect",
    priority: "normale",
    knowledgeState: "none",
    health: null,
    contactCount: 3,
    committeeRoleCount: 1,
    committeeRoles: ["decideur"],
    decisionPowerCount: 1,
    opportunityCount: 0,
    openOpportunityCount: 0,
    weightedPipeline: 0,
    latestCommercialActivityAt: null,
    latestPlannedEngagementAt: null,
    latestIntelligenceAt: null,
    latestDataUpdateAt: null,
    activity30d: 0,
    activity90d: 0,
    activity180d: 0,
    interactions30d: 0,
    interactions90d: 0,
    interactions180d: 0,
    calendar30d: 0,
    calendar90d: 0,
    calendar180d: 0,
    plannedCommercialEngagement30d: 0,
    plannedCommercialEngagement90d: 0,
    plannedCommercialEngagement180d: 0,
    reachScore: 50,
    reachGapScore: 50,
    momentumScore30d: 0,
    momentumScore90d: 0,
    momentumScore180d: 0,
    monthlyEquivalentPoints30d: 0,
    monthlyEquivalentPoints90d: 0,
    monthlyEquivalentPoints180d: 0,
    inactivityRiskScore30d: 0,
    inactivityRiskScore90d: 0,
    inactivityRiskScore180d: 0,
    nextDecision: "",
    legacyCoverage: {
      hasClientAnalysis: false,
      hasSectorAnalysis: false,
      hasPitches: false,
    },
    nativeCoverage: {
      hasClientAnalysis: false,
      hasSectorAnalysis: false,
      hasProcessDiagnostic: false,
      hasRoadmap: false,
      latestRunAt: null,
      latestRunStatus: null,
      countRuns: 0,
      countResults: 0,
    },
    ...overrides,
  } as ProspectionPortfolioAccount
}

const defaultFilters: ProspectionSummaryFilters = {
  period: "90d",
  sector: "all",
  lifecycle: "all",
  priority: "all",
  focus: "all",
}

const fakeTrustMeta = {
  id: "test",
  label: "Test",
  primaryOrigin: "PROXY" as const,
  origins: [],
  formula: "test",
  freshness: { latestAt: null, label: "N/A" },
  completeness: { value: 0.5, label: "50 %" },
  limitations: [],
}

const defaultTrust: PortfolioTrustBundle = {
  accountReach: fakeTrustMeta,
  accountMomentum30d: fakeTrustMeta,
  accountInactivityRisk: fakeTrustMeta,
}

function generateAccounts(count: number): ProspectionPortfolioAccount[] {
  return Array.from({ length: count }, (_, i) =>
    makeAccount(`acc-${i}`, {
      inactivityRiskScore90d: count - i,
    }),
  )
}

describe("buildMobilePriorityViewModel", () => {
  it("truncates to max 15 items", () => {
    const accounts = generateAccounts(25)
    const result = buildMobilePriorityViewModel({
      accounts,
      filters: defaultFilters,
      lens: "all",
      trust: defaultTrust,
    })
    expect(result.items.length).toBe(15)
    expect(result.totalForLens).toBe(25)
  })

  it("computes lens counts before truncation", () => {
    const accounts = generateAccounts(20)
    const result = buildMobilePriorityViewModel({
      accounts,
      filters: defaultFilters,
      lens: "all",
      trust: defaultTrust,
    })
    const allLens = result.lenses.find((l) => l.key === "all")
    expect(allLens?.count).toBe(20)
  })

  it("sorts by inactivity risk descending when opportunity facts are equal", () => {
    const accounts = [
      makeAccount("low", { inactivityRiskScore90d: 10 }),
      makeAccount("high", { inactivityRiskScore90d: 90 }),
      makeAccount("mid", { inactivityRiskScore90d: 50 }),
    ]
    const result = buildMobilePriorityViewModel({
      accounts,
      filters: defaultFilters,
      lens: "all",
      trust: defaultTrust,
    })
    expect(result.items[0].accountId).toBe("high")
    expect(result.items[1].accountId).toBe("mid")
    expect(result.items[2].accountId).toBe("low")
  })

  it("applies lens filter before truncation", () => {
    const accounts = generateAccounts(20).map((a, i) =>
      makeAccount(a.id, {
        ...a,
        contactCount: i < 5 ? 0 : 3,
        reachScore: i < 5 ? 10 : 80,
      }),
    )
    const result = buildMobilePriorityViewModel({
      accounts,
      filters: defaultFilters,
      lens: "cibler",
      trust: defaultTrust,
    })
    expect(result.totalForLens).toBeLessThanOrEqual(20)
    expect(result.items.every((item) => item.lenses.includes("cibler"))).toBe(true)
  })

  it("returns totalPortfolio as count after base filters", () => {
    const accounts = [
      makeAccount("tech1", { sector: "tech" }),
      makeAccount("tech2", { sector: "tech" }),
      makeAccount("health", { sector: "santé" }),
    ]
    const result = buildMobilePriorityViewModel({
      accounts,
      filters: { ...defaultFilters, sector: "tech" },
      lens: "all",
      trust: defaultTrust,
    })
    expect(result.totalPortfolio).toBe(2)
  })
})

describe("parseLens", () => {
  it("returns valid lens as-is", () => {
    expect(parseLens("cibler")).toBe("cibler")
    expect(parseLens("couvrir")).toBe("couvrir")
    expect(parseLens("engager")).toBe("engager")
    expect(parseLens("decider")).toBe("decider")
  })

  it('returns "all" for null', () => {
    expect(parseLens(null)).toBe("all")
  })

  it('returns "all" for invalid value', () => {
    expect(parseLens("invalid")).toBe("all")
    expect(parseLens("")).toBe("all")
  })
})

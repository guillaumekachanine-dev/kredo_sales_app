import { describe, it, expect } from "vitest"
import {
  resolveMobilePrimaryAction,
  hasQualificationSignal,
} from "../mobile-priority-view-model"
import type { CommercialRecommendation } from "../synthese-view-model"
import type {
  ProspectionPortfolioAccount,
  PortfolioPeriodMetrics,
} from "@/lib/prospection/portfolio-account-metrics"

function makeAccount(
  overrides: Partial<ProspectionPortfolioAccount> = {},
): ProspectionPortfolioAccount {
  return {
    id: "acc-1",
    name: "Test Corp",
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

const defaultReco: CommercialRecommendation = {
  key: "maintain",
  dominantReason: "test",
  actionLabel: "test",
  whyNow: "test",
  costOfInaction: "",
}

describe("resolveMobilePrimaryAction", () => {
  it("returns create-contact-task when no contacts", () => {
    const account = makeAccount({ contactCount: 0 })
    const result = resolveMobilePrimaryAction(account, defaultReco, "90d")
    expect(result.key).toBe("create-contact-task")
  })

  it("returns advance-opportunity when opportunity is open", () => {
    const account = makeAccount({ openOpportunityCount: 2 })
    const result = resolveMobilePrimaryAction(account, defaultReco, "90d")
    expect(result.key).toBe("advance-opportunity")
  })

  it("returns consolidate-committee when opp open + committee recommendation", () => {
    const account = makeAccount({ openOpportunityCount: 1 })
    const reco = { ...defaultReco, key: "committee" }
    const result = resolveMobilePrimaryAction(account, reco, "90d")
    expect(result.key).toBe("consolidate-committee")
  })

  it("returns prepare-next-meeting when engagement planned", () => {
    const account = makeAccount({ plannedCommercialEngagement90d: 1 })
    const result = resolveMobilePrimaryAction(account, defaultReco, "90d")
    expect(result.key).toBe("prepare-next-meeting")
  })

  it("does NOT schedule meeting when engagement already planned", () => {
    const account = makeAccount({
      plannedCommercialEngagement90d: 1,
      momentumScore90d: 50,
    })
    const result = resolveMobilePrimaryAction(account, defaultReco, "90d")
    expect(result.key).toBe("prepare-next-meeting")
    expect(result.key).not.toBe("schedule-meeting")
  })

  it("returns create-opportunity when qualification signal present", () => {
    const account = makeAccount({
      activity90d: 3,
      interactions90d: 2,
      committeeRoleCount: 2,
      openOpportunityCount: 0,
    })
    const result = resolveMobilePrimaryAction(account, defaultReco, "90d")
    expect(result.key).toBe("create-opportunity")
  })

  it("does NOT create opportunity without qualification facts", () => {
    const account = makeAccount({
      activity90d: 0,
      interactions90d: 0,
      committeeRoleCount: 0,
    })
    const result = resolveMobilePrimaryAction(account, defaultReco, "90d")
    expect(result.key).not.toBe("create-opportunity")
  })

  it("returns schedule-contact when contact exists but no activity", () => {
    const account = makeAccount({
      contactCount: 5,
      activity90d: 0,
    })
    const result = resolveMobilePrimaryAction(account, defaultReco, "90d")
    expect(result.key).toBe("schedule-contact")
  })

  it("returns schedule-meeting when momentum high and no planned engagement", () => {
    const account = makeAccount({
      contactCount: 3,
      activity90d: 1,
      momentumScore90d: 40,
      plannedCommercialEngagement90d: 0,
    })
    const result = resolveMobilePrimaryAction(account, defaultReco, "90d")
    expect(result.key).toBe("schedule-meeting")
  })

  it("returns fallback qualification task when no clear recommendation", () => {
    const account = makeAccount({
      contactCount: 3,
      activity90d: 1,
      interactions90d: 0,
      momentumScore90d: 10,
      plannedCommercialEngagement90d: 0,
      committeeRoleCount: 0,
    })
    const result = resolveMobilePrimaryAction(account, defaultReco, "90d")
    expect(result.key).toBe("create-qualification-task")
    expect(result.disabled).toBe(false)
  })
})

describe("hasQualificationSignal", () => {
  it("returns true with sufficient signals", () => {
    const account = makeAccount({
      committeeRoleCount: 1,
    })
    const metrics: PortfolioPeriodMetrics = {
      activityCount: 3,
      interactionsCount: 2,
      calendarCount: 0,
      plannedCount: 0,
      momentumScore: 30,
      monthlyEquivalentPoints: 0,
      inactivityRiskScore: 0,
    }
    expect(hasQualificationSignal(account, metrics)).toBe(true)
  })

  it("returns false with activity but no committee", () => {
    const account = makeAccount({
      committeeRoleCount: 0,
    })
    const metrics: PortfolioPeriodMetrics = {
      activityCount: 5,
      interactionsCount: 3,
      calendarCount: 0,
      plannedCount: 0,
      momentumScore: 30,
      monthlyEquivalentPoints: 0,
      inactivityRiskScore: 0,
    }
    expect(hasQualificationSignal(account, metrics)).toBe(false)
  })

  it("returns false with only 1 activity", () => {
    const account = makeAccount({
      committeeRoleCount: 2,
    })
    const metrics: PortfolioPeriodMetrics = {
      activityCount: 1,
      interactionsCount: 1,
      calendarCount: 0,
      plannedCount: 0,
      momentumScore: 20,
      monthlyEquivalentPoints: 0,
      inactivityRiskScore: 0,
    }
    expect(hasQualificationSignal(account, metrics)).toBe(false)
  })
})

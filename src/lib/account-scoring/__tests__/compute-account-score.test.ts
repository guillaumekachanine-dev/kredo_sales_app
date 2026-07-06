import { describe, expect, it } from "vitest"
import { computeAccountScore } from "../compute-account-score"
import type { AccountScoreContext, AccountScoreSignal } from "../types"

function makeSignal(overrides: Partial<AccountScoreSignal> = {}): AccountScoreSignal {
  return {
    id: "sig-1",
    category: "company_context",
    type: "folio_news_item",
    title: "Test signal",
    confidenceScore: 0.5,
    relevanceScore: 0,
    urgencyScore: 0,
    detectedAt: "2026-06-09T00:00:00Z",
    expiresAt: "2026-08-08T00:00:00Z",
    eventAt: null,
    ...overrides,
  }
}

function makeContext(overrides: Partial<AccountScoreContext> = {}): AccountScoreContext {
  return {
    company: {
      id: "company-1",
      name: "Test Company",
      lifecycleStatus: "prospect",
      sector: null,
      sectorId: null,
      segment: null,
      revenue: null,
      employeeCount: null,
      sizeBand: null,
      priority: null,
    },
    sector: null,
    contacts: { totalCount: 0, decisionMakerCount: 0, priorityCount: 0, strongRelationshipCount: 0 },
    opportunities: {
      openCount: 0,
      openWeightedGain: 0,
      wonCount: 0,
      lostCount: 0,
      hasOverdueNextAction: false,
      hasUpcomingNextAction: false,
    },
    missions: { activeCount: 0, avgGrossMarginPct: null },
    interactions: { recentCount90d: 0, lastInteractionAt: null },
    signals: [],
    dataCutoffAt: "2026-07-06T00:00:00Z",
    ...overrides,
  }
}

describe("computeAccountScore", () => {
  it("returns band U (exploratoire) for an empty account, regardless of raw score", () => {
    const result = computeAccountScore(makeContext())

    expect(result.scoreBand).toBe("U")
    expect(result.confidenceScore).toBeLessThan(40)
  })

  it("scores 0-100 and stays within bounds even with a rich prospect context", () => {
    const context = makeContext({
      sector: { slug: "banque-finance-assurance", attractivenessScore: 4.4, practicesFit: { cyber: 5, data_ai: 5 } },
      contacts: { totalCount: 6, decisionMakerCount: 2, priorityCount: 1, strongRelationshipCount: 1 },
      opportunities: {
        openCount: 2,
        openWeightedGain: 80_000,
        wonCount: 1,
        lostCount: 0,
        hasOverdueNextAction: false,
        hasUpcomingNextAction: true,
      },
      interactions: { recentCount90d: 5, lastInteractionAt: "2026-07-01T00:00:00Z" },
      signals: [makeSignal({ relevanceScore: 0.8, urgencyScore: 0.7, confidenceScore: 0.85 })],
    })

    const result = computeAccountScore(context)

    expect(result.scoreValue).toBeGreaterThanOrEqual(0)
    expect(result.scoreValue).toBeLessThanOrEqual(100)
    expect(result.scoreBand).not.toBe("U")
    expect(result.confidenceScore).toBeGreaterThanOrEqual(40)
  })

  it("does not include C6 (valeur active) for a prospect even with active missions data", () => {
    const context = makeContext({
      missions: { activeCount: 2, avgGrossMarginPct: 30 },
    })

    const result = computeAccountScore(context)

    expect(result.components.find((c) => c.componentKey === "C6_active_value")).toBeUndefined()
  })

  it("includes C6 (valeur active) only for client_actif with active missions", () => {
    const context = makeContext({
      company: { ...makeContext().company, lifecycleStatus: "client_actif" },
      missions: { activeCount: 2, avgGrossMarginPct: 30 },
    })

    const result = computeAccountScore(context)
    const c6 = result.components.find((c) => c.componentKey === "C6_active_value")

    expect(c6).toBeDefined()
    expect(c6!.lifecycleMultiplier).toBe(1.0)
  })

  it("omits C6 for a client_actif with zero active missions (data inconsistency guard)", () => {
    const context = makeContext({
      company: { ...makeContext().company, lifecycleStatus: "client_actif" },
      missions: { activeCount: 0, avgGrossMarginPct: null },
    })

    const result = computeAccountScore(context)

    expect(result.components.find((c) => c.componentKey === "C6_active_value")).toBeUndefined()
  })

  it("treats FOLIO-only signals (relevance/urgency both 0) as qualitative context, not zero signal", () => {
    const withFolioSignals = computeAccountScore(makeContext({ signals: [makeSignal(), makeSignal({ id: "sig-2" })] }))
    const withoutSignals = computeAccountScore(makeContext({ signals: [] }))

    const c3WithFolio = withFolioSignals.components.find((c) => c.componentKey === "C3_signals")!
    const c3Without = withoutSignals.components.find((c) => c.componentKey === "C3_signals")!

    expect(c3WithFolio.normalizedScore).toBeGreaterThan(c3Without.normalizedScore)
  })

  it("prioritizes a quantified signal over FOLIO-only signals for C3", () => {
    const result = computeAccountScore(
      makeContext({
        signals: [makeSignal(), makeSignal({ id: "sig-strong", relevanceScore: 0.9, urgencyScore: 0.9, confidenceScore: 0.9 })],
      }),
    )

    const c3 = result.components.find((c) => c.componentKey === "C3_signals")!
    expect(c3.normalizedScore).toBe(90)
    expect(c3.evidenceRefs[0]?.id).toBe("sig-strong")
  })

  it("applies a penalty for overdue next actions in momentum", () => {
    const onTrack = computeAccountScore(
      makeContext({
        opportunities: {
          openCount: 1,
          openWeightedGain: 0,
          wonCount: 0,
          lostCount: 0,
          hasOverdueNextAction: false,
          hasUpcomingNextAction: true,
        },
      }),
    )
    const overdue = computeAccountScore(
      makeContext({
        opportunities: {
          openCount: 1,
          openWeightedGain: 0,
          wonCount: 0,
          lostCount: 0,
          hasOverdueNextAction: true,
          hasUpcomingNextAction: false,
        },
      }),
    )

    const c5OnTrack = onTrack.components.find((c) => c.componentKey === "C5_momentum")!
    const c5Overdue = overdue.components.find((c) => c.componentKey === "C5_momentum")!

    expect(c5Overdue.normalizedScore).toBeLessThan(c5OnTrack.normalizedScore)
  })

  it("maps client_dormant and ancien_client to the dormant lifecycle bucket", () => {
    const dormant = computeAccountScore(makeContext({ company: { ...makeContext().company, lifecycleStatus: "client_dormant" } }))
    const ancien = computeAccountScore(makeContext({ company: { ...makeContext().company, lifecycleStatus: "ancien_client" } }))

    const c3Dormant = dormant.components.find((c) => c.componentKey === "C3_signals")!
    const c3Ancien = ancien.components.find((c) => c.componentKey === "C3_signals")!

    // Les deux lifecycle "dormant" appliquent le même multiplicateur 1.2 sur C3.
    expect(c3Dormant.lifecycleMultiplier).toBe(1.2)
    expect(c3Ancien.lifecycleMultiplier).toBe(1.2)
  })
})

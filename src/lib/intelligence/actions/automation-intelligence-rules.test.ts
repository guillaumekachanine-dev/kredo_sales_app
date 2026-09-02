import { describe, expect, it } from "vitest"

import {
  REAPED_RUN_ERROR_PREFIX,
  buildAutomationCosts,
  buildAutomationErrors,
  buildAutomationFixes,
  isReapedRun,
  normalizeErrorSignature,
  type AutomationWorkflowRow,
} from "./automation-intelligence-rules"

const NOW = "2026-09-02T09:00:00.000Z"

function workflow(overrides: Partial<AutomationWorkflowRow> = {}): AutomationWorkflowRow {
  return {
    runType: "intel-020",
    label: "INTEL-020 Communication",
    runs30d: 100,
    succeeded30d: 96,
    failed30d: 4,
    successRatePct30d: 96,
    stuckRunningNow: 0,
    stuckQueuedNow: 0,
    lastRunAt: "2026-09-01T10:00:00.000Z",
    lastFailureAt: "2026-09-01T10:00:00.000Z",
    p95DurationMs: 42_000,
    totalCost30d: 12.5,
    avgCost30d: 0.125,
    avgCostAllTime: 0.1,
    hasPricingGap: false,
    hasTokensGap: false,
    ...overrides,
  }
}

describe("normalizeErrorSignature", () => {
  it("collapses runs that differ only by identifiers, dates, numbers and quotes", () => {
    const a = normalizeErrorSignature('Mission "veille-analyse-mensuelle" échouée pour le run 3f2504e0-4f89-11d3-9a0c-0305e82c3301 à 2026-09-01T10:00:00Z après 3 tentatives')
    const b = normalizeErrorSignature('Mission "rentabilite-portefeuille" échouée pour le run 550e8400-e29b-41d4-a716-446655440000 à 2026-08-15T04:12:00Z après 12 tentatives')

    expect(a).toBe(b)
    expect(a).not.toBeNull()
  })

  it("keeps genuinely different failures apart", () => {
    expect(normalizeErrorSignature("Timeout du nœud Call LLM"))
      .not.toBe(normalizeErrorSignature("Réponse JSON invalide du nœud Callback"))
  })

  it("returns null on an empty or blank message", () => {
    expect(normalizeErrorSignature(null)).toBeNull()
    expect(normalizeErrorSignature("   ")).toBeNull()
  })

  it("caps a very long signature", () => {
    expect(normalizeErrorSignature("x".repeat(400))!.length).toBeLessThanOrEqual(161)
  })
})

describe("buildAutomationErrors", () => {
  // Un run repris par ops-004 est un run BLOQUÉ que la base a refermé, pas une
  // erreur de workflow. Le confondre ferait accuser le mauvais coupable.
  it("counts reaped runs apart from genuine failures", () => {
    const result = buildAutomationErrors({
      workflows: [workflow()],
      failedRuns: [
        { id: "r1", runType: "intel-020", errorMessage: "Timeout du nœud Call LLM", failedAt: "2026-09-01T10:00:00.000Z" },
        { id: "r2", runType: "intel-020", errorMessage: `${REAPED_RUN_ERROR_PREFIX} après 30 minutes`, failedAt: "2026-08-30T10:00:00.000Z" },
      ],
    })

    expect(result.summary.failedRuns30d).toBe(1)
    expect(result.summary.reapedRuns30d).toBe(1)
    expect(result.clusters).toHaveLength(1)
    expect(isReapedRun(`${REAPED_RUN_ERROR_PREFIX} x`)).toBe(true)
  })

  it("groups identical failures and lists every workflow they hit", () => {
    const result = buildAutomationErrors({
      workflows: [workflow(), workflow({ runType: "intel-030", label: "INTEL-030 Connaissance" })],
      failedRuns: [
        { id: "r1", runType: "intel-020", errorMessage: "Timeout après 30 s", failedAt: "2026-09-01T10:00:00.000Z" },
        { id: "r2", runType: "intel-030", errorMessage: "Timeout après 45 s", failedAt: "2026-09-02T10:00:00.000Z" },
      ],
    })

    expect(result.clusters).toHaveLength(1)
    expect(result.clusters[0].count).toBe(2)
    expect(result.clusters[0].workflowLabels).toEqual(["INTEL-020 Communication", "INTEL-030 Connaissance"])
    expect(result.clusters[0].lastSeenAt).toBe("2026-09-02T10:00:00.000Z")
  })

  it("surfaces a workflow that only has stuck runs, with no failure at all", () => {
    const result = buildAutomationErrors({
      workflows: [workflow({ failed30d: 0, stuckRunningNow: 2 })],
      failedRuns: [],
    })

    expect(result.failingWorkflows).toHaveLength(1)
    expect(result.failingWorkflows[0].stuckNow).toBe(2)
    expect(result.summary.stuckNow).toBe(2)
  })
})

describe("buildAutomationCosts", () => {
  // Les vues Lot 0 renvoient NULL plutôt qu'un coût sous-estimé. Les règles ne
  // doivent pas rattraper ce choix en additionnant des zéros silencieux.
  it("never turns an unknown cost into zero, and says what is missing", () => {
    const result = buildAutomationCosts({
      workflows: [
        workflow({ runType: "a", label: "A", totalCost30d: 10 }),
        workflow({ runType: "b", label: "B", totalCost30d: null, avgCost30d: null, hasPricingGap: true }),
      ],
    })

    expect(result.summary.knownCost30d).toBe(10)
    expect(result.summary.workflowsWithGaps).toBe(1)
    expect(result.gaps).toEqual([{ label: "B", reason: "Aucun tarif enregistré pour le modèle utilisé" }])
    expect(result.workflows.find((w) => w.label === "B")!.totalCost30d).toBeNull()
  })

  it("measures the per-run drift against the all-time average", () => {
    const result = buildAutomationCosts({
      workflows: [workflow({ avgCost30d: 0.15, avgCostAllTime: 0.1 })],
    })

    expect(result.workflows[0].avgCostDriftPct).toBe(50)
  })

  it("reports no drift when the historical average is missing", () => {
    const result = buildAutomationCosts({ workflows: [workflow({ avgCostAllTime: null })] })
    expect(result.workflows[0].avgCostDriftPct).toBeNull()
  })
})

describe("buildAutomationFixes", () => {
  it("ranks a broken workflow above a noisy but healthy one, and explains why", () => {
    const result = buildAutomationFixes({
      now: NOW,
      workflows: [
        workflow({ runType: "broken", label: "Cassé", runs30d: 20, failed30d: 10, lastFailureAt: "2026-09-01T10:00:00.000Z" }),
        workflow({ runType: "noisy", label: "Bruyant", runs30d: 400, failed30d: 4, lastFailureAt: "2026-08-01T10:00:00.000Z" }),
      ],
    })

    expect(result.items.map((item) => item.runType)).toEqual(["broken", "noisy"])
    expect(result.items[0].severity).toBe("critical")
    expect(result.items[0].drivers.length).toBeGreaterThan(1)
    // Le score est exactement la somme des poids affichés : rien de caché.
    expect(result.items[0].score).toBe(
      result.items[0].drivers.reduce((total, driver) => total + driver.weight, 0),
    )
  })

  it("leaves the estimated waste null when the cost is incomplete", () => {
    const result = buildAutomationFixes({
      now: NOW,
      workflows: [workflow({ failed30d: 5, hasPricingGap: true })],
    })

    expect(result.items[0].estimatedWastedCostEur).toBeNull()
    expect(result.summary.totalEstimatedWasteEur).toBeNull()
  })

  it("estimates the waste from the average cost when it is complete", () => {
    const result = buildAutomationFixes({
      now: NOW,
      workflows: [workflow({ failed30d: 4, avgCost30d: 0.125 })],
    })

    expect(result.items[0].estimatedWastedCostEur).toBe(0.5)
    expect(result.summary.totalEstimatedWasteEur).toBe(0.5)
  })

  it("keeps healthy workflows out of the backlog but counts them", () => {
    const result = buildAutomationFixes({
      now: NOW,
      workflows: [workflow({ runType: "ok", failed30d: 0 }), workflow({ runType: "ko", failed30d: 3 })],
    })

    expect(result.items.map((item) => item.runType)).toEqual(["ko"])
    expect(result.summary.healthyWorkflows).toBe(1)
  })

  it("stops weighting recency once the last failure is old", () => {
    const recent = buildAutomationFixes({ now: NOW, workflows: [workflow({ lastFailureAt: "2026-09-01T10:00:00.000Z" })] })
    const old = buildAutomationFixes({ now: NOW, workflows: [workflow({ lastFailureAt: "2026-07-01T10:00:00.000Z" })] })

    expect(recent.items[0].score).toBeGreaterThan(old.items[0].score)
    expect(old.items[0].drivers.some((driver) => driver.label.includes("Échec dans"))).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { buildCockpitDesktopSnapshot, type CockpitDesktopSources } from "./cockpit-desktop-view-model"

const now = "2026-07-14T08:00:00.000Z"

function sources(overrides: Partial<CockpitDesktopSources> = {}): CockpitDesktopSources {
  return {
    now,
    companies: [],
    scores: [],
    signals: [],
    issues: [],
    opportunities: [],
    interactions: [],
    missions: [],
    projects: [],
    tasks: [],
    calendarEvents: [],
    aiRuns: [],
    trajectory: { points: [], ytdMarginTarget: 32 },
    ...overrides,
  }
}

describe("buildCockpitDesktopSnapshot", () => {
  it("classe les comptes selon les raisons définies, puis le score en départage", () => {
    const snapshot = buildCockpitDesktopSnapshot(sources({
      companies: [
        { id: "dormant", name: "Dormant", sector: "Tech", nextActionAt: null, nextActionLabel: null },
        { id: "signal", name: "Signal", sector: "Tech", nextActionAt: null, nextActionLabel: null },
        { id: "overdue-low", name: "Overdue low", sector: "Tech", nextActionAt: "2026-07-10", nextActionLabel: "Relancer" },
        { id: "overdue-high", name: "Overdue high", sector: "Tech", nextActionAt: "2026-07-11", nextActionLabel: "Préparer le point" },
        { id: "issue", name: "Issue", sector: "Tech", nextActionAt: null, nextActionLabel: null },
      ],
      scores: [
        { companyId: "overdue-low", scoreValue: 40, confidenceScore: 80 },
        { companyId: "overdue-high", scoreValue: 80, confidenceScore: 80 },
      ],
      signals: [{ id: "s-1", companyId: "signal", title: "Signal détecté", recommendedAction: "Contacter le compte", status: "new", expiresAt: "2026-08-01", urgencyScore: 0.8, detectedAt: now }],
      issues: [{ id: "i-1", companyId: "issue", title: "Enjeu urgent", urgency: 5, status: "open" }],
    }))

    expect(snapshot.accountsToAnimate.map((account) => [account.companyId, account.reasonType])).toEqual([
      ["overdue-high", "overdue_action"],
      ["overdue-low", "overdue_action"],
      ["signal", "actionable_signal"],
      ["issue", "urgent_issue"],
    ])
  })

  it("calcule l’exposition à 30 jours uniquement depuis des décisions concrètes", () => {
    const snapshot = buildCockpitDesktopSnapshot(sources({
      missions: [
        { id: "mission-soon", title: "Mission proche", companyId: "c1", endDate: "2026-08-10", status: "active" },
        { id: "mission-later", title: "Mission lointaine", companyId: "c1", endDate: "2026-08-20", status: "active" },
      ],
      projects: [
        { id: "project-late", title: "Projet en retard", endDate: "2026-07-12", status: "active" },
        { id: "project-ok", title: "Projet en cours", endDate: "2026-08-01", status: "active" },
      ],
      opportunities: [
        { id: "opp-advanced", companyId: "c1", title: "Opp avancée", stage: "contractualisation", weightedGain: 20_000, nextActionAt: null, nextActionLabel: null, updatedAt: "2026-07-01" },
        { id: "opp-early", companyId: "c1", title: "Opp qualifiée", stage: "qualification", weightedGain: 5_000, nextActionAt: null, nextActionLabel: null, updatedAt: "2026-07-01" },
      ],
    }))

    expect(snapshot.kpis.find((kpi) => kpi.id === "exposure-30d")?.value).toBe("3")
  })

  it("ne signale un run IA running que lorsqu’il dépasse le seuil explicite de 30 minutes", () => {
    const snapshot = buildCockpitDesktopSnapshot(sources({
      aiRuns: [
        { id: "old", companyId: "c1", runType: "analysis", status: "running", startedAt: "2026-07-14T07:29:00.000Z", createdAt: "2026-07-14T07:00:00.000Z" },
        { id: "fresh", companyId: "c2", runType: "analysis", status: "running", startedAt: "2026-07-14T07:45:00.000Z", createdAt: "2026-07-14T07:40:00.000Z" },
        { id: "old-complete", companyId: "c3", runType: "analysis", status: "succeeded", startedAt: "2026-07-14T07:00:00.000Z", createdAt: "2026-07-14T07:00:00.000Z" },
      ],
    }))

    expect(snapshot.alerts.filter((alert) => alert.type === "stuck_ai_run").map((alert) => alert.id)).toEqual(["ai-run:old"])
  })

  it("n’invente aucune valeur quand les données de trajectoire sont absentes", () => {
    const snapshot = buildCockpitDesktopSnapshot(sources())

    expect(snapshot.kpis.find((kpi) => kpi.id === "revenue-ytd")?.value).toBe("—")
    expect(snapshot.kpis.find((kpi) => kpi.id === "margin-ytd")?.value).toBe("—")
    expect(snapshot.trajectory.ytdRevenueActual).toBeNull()
    expect(snapshot.trajectory.ytdRevenueTarget).toBeNull()
    expect(snapshot.trajectory.ytdMarginActual).toBeNull()
  })

  it("retourne le même snapshot pour les mêmes données", () => {
    const input = sources({
      companies: [{ id: "c1", name: "Compte", sector: null, nextActionAt: "2026-07-10", nextActionLabel: null }],
      trajectory: { points: [{ monthLabel: "Jul", revenueActual: 120_000, revenueTarget: 200_000, marginActual: 28 }], ytdMarginTarget: 32 },
    })

    expect(buildCockpitDesktopSnapshot(input)).toEqual(buildCockpitDesktopSnapshot(input))
  })
})

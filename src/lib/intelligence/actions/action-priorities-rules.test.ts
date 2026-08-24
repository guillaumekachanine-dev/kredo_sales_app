import { describe, expect, it } from "vitest"
import { buildActionPriorities, type BuildActionPrioritiesInput } from "./action-priorities-rules"

const baseInput: BuildActionPrioritiesInput = {
  now: "2026-07-13T08:00:00.000Z",
  opportunities: [],
  missions: [],
  alerts: [],
  interactions: [],
  calendarEvents: [],
}

describe("buildActionPriorities", () => {
  it("ranks an overdue next action as critical", () => {
    const result = buildActionPriorities({
      ...baseInput,
      opportunities: [{
        id: "opp-1",
        title: "Refonte Cloud",
        stage: "qualification",
        companyId: "c-1",
        companyName: "Client A",
        weightedGain: 90_000,
        estimatedGain: null,
        nextActionAt: "2026-07-12T09:00:00.000Z",
        targetCloseDate: null,
        updatedAt: "2026-07-01T09:00:00.000Z",
      }],
    })

    expect(result.items[0]?.urgency).toBe("critical")
    expect(result.items[0]?.action).toContain("en retard")
  })

  it("gives a higher score to high-impact opportunities", () => {
    const result = buildActionPriorities({
      ...baseInput,
      opportunities: [
        { id: "small", title: "Petit besoin", stage: "qualification", companyId: "c-1", companyName: "A", weightedGain: 10_000, estimatedGain: null, nextActionAt: null, targetCloseDate: null, updatedAt: "2026-06-20T09:00:00.000Z" },
        { id: "large", title: "Gros besoin", stage: "qualification", companyId: "c-2", companyName: "B", weightedGain: 100_000, estimatedGain: null, nextActionAt: null, targetCloseDate: null, updatedAt: "2026-06-20T09:00:00.000Z" },
      ],
    })

    expect(result.items[0]?.entityId).toBe("large")
    expect((result.items[0]?.score ?? 0) > (result.items[1]?.score ?? 0)).toBe(true)
  })

  it("adds risk weight for close target dates", () => {
    const result = buildActionPriorities({
      ...baseInput,
      opportunities: [
        { id: "stale", title: "Stagnante", stage: "qualification", companyId: "c-1", companyName: "A", weightedGain: 30_000, estimatedGain: null, nextActionAt: null, targetCloseDate: null, updatedAt: "2026-06-20T09:00:00.000Z" },
        { id: "deadline", title: "Closing proche", stage: "qualification", companyId: "c-2", companyName: "B", weightedGain: 30_000, estimatedGain: null, nextActionAt: null, targetCloseDate: "2026-07-15", updatedAt: "2026-07-10T09:00:00.000Z" },
      ],
    })

    expect(result.items[0]?.entityId).toBe("deadline")
  })

  it("counts missions ending soon and creates a mission action", () => {
    const result = buildActionPriorities({
      ...baseInput,
      missions: [{ id: "m-1", title: "Mission Data", companyName: "Client", endDate: "2026-07-25", status: "active", opportunityId: null }],
    })

    expect(result.meta.missionsEndingSoon).toBe(1)
    expect(result.items[0]?.entityType).toBe("mission")
  })

  it("counts CRA alerts and creates collaborator actions", () => {
    const result = buildActionPriorities({
      ...baseInput,
      alerts: [{ collaboratorId: "col-1", fullName: "Ada Lovelace", periodStart: "2026-07-01", alertCraNotValidated: true, alertLowActivity: false, alertLowMargin: false, alertNegativeMargin: false }],
    })

    expect(result.meta.craNotValidated).toBe(1)
    expect(result.items[0]?.action).toContain("CRA")
  })

  it("limits output to ten ranked items", () => {
    const result = buildActionPriorities({
      ...baseInput,
      opportunities: Array.from({ length: 12 }, (_, index) => ({
        id: `opp-${index}`,
        title: `Opportunité ${index}`,
        stage: "qualification",
        companyId: `c-${index}`,
        companyName: `Client ${index}`,
        weightedGain: 50_000,
        estimatedGain: null,
        nextActionAt: "2026-07-10T09:00:00.000Z",
        targetCloseDate: null,
        updatedAt: "2026-07-01T09:00:00.000Z",
      })),
    })

    expect(result.items).toHaveLength(10)
    expect(result.items[0]?.rank).toBe(1)
    expect(result.items[9]?.rank).toBe(10)
  })
})

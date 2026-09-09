import { describe, expect, it } from "vitest"
import type { MissionsListRow } from "@/components/missions/MissionsListView"
import type { OpportunityDeadline } from "../opportunity-deadline.types"
import { buildPlanningChapter } from "../build-planning-chapter"

function row(overrides: Partial<MissionsListRow> & { entityId: string }): MissionsListRow {
  return {
    entityType: "opportunite",
    title: overrides.entityId,
    status: "active",
    client: "ACME",
    stage: "qualification",
    priority: "normale",
    ...overrides,
  }
}

function deadline(opportunityId: string, dueAt: string): OpportunityDeadline {
  return {
    opportunityId,
    opportunityTitle: opportunityId,
    client: "ACME",
    source: "next_action",
    label: "Relancer",
    dueAt,
    calendarEventType: null,
  }
}

describe("buildPlanningChapter", () => {
  it("ne garde que les opportunités ouvertes et les trie par échéance", () => {
    const result = buildPlanningChapter({
      rows: [
        row({ entityId: "sans-date" }),
        row({ entityId: "tard" }),
        row({ entityId: "tot", stage: "gagne", status: "won" }),
        row({ entityId: "proche" }),
      ],
      deadlines: [deadline("tard", "2026-11-01"), deadline("proche", "2026-09-10")],
      requestedOpportunityId: null,
    })
    expect(result.items.map((item) => item.id)).toEqual(["proche", "tard", "sans-date"])
    expect(result.selectedOpportunityId).toBe("proche")
  })

  it("honore ?opp= quand l'opportunité est ouverte", () => {
    const result = buildPlanningChapter({
      rows: [row({ entityId: "o1" }), row({ entityId: "o2" })],
      deadlines: [],
      requestedOpportunityId: "o2",
    })
    expect(result.selectedOpportunityId).toBe("o2")
  })

  it("replie une sélection invalide et documente les échéances manquantes", () => {
    const result = buildPlanningChapter({
      rows: [row({ entityId: "o1" })],
      deadlines: [],
      requestedOpportunityId: "disparue",
    })
    expect(result.selectedOpportunityId).toBe("o1")
    expect(result.dataNotes).toHaveLength(2)
  })
})

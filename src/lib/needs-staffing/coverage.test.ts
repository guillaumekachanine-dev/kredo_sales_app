import { describe, expect, it } from "vitest"
import {
  calculateCoverageMetrics,
  isActivePositioningStatus,
  isCoveringPositioningStatus,
} from "./coverage"

describe("needs staffing coverage", () => {
  it("counts only covering statuses and caps placements by required headcount", () => {
    const metrics = calculateCoverageMetrics(
      [
        { id: "opp-1", requiredHeadcount: 2, requiresStaffing: true },
        { id: "opp-2", requiredHeadcount: 1, requiresStaffing: true },
      ],
      [
        { opportunityId: "opp-1", status: "envoye_client" },
        { opportunityId: "opp-1", status: "retenu" },
        { opportunityId: "opp-1", status: "entretien_realise" },
        { opportunityId: "opp-2", status: "preselectionne" },
      ],
    )

    expect(metrics.openNeedsCount).toBe(2)
    expect(metrics.coveredPlacements).toBe(2)
    expect(metrics.requiredHeadcountTotal).toBe(3)
    expect(metrics.coverageRate).toBe(67)
  })

  it("excludes negative terminal statuses from active positionings", () => {
    expect(isActivePositioningStatus("identifie")).toBe(true)
    expect(isActivePositioningStatus("refuse_client")).toBe(false)
    expect(isActivePositioningStatus("refuse_candidat")).toBe(false)
    expect(isActivePositioningStatus("abandonne")).toBe(false)
  })

  it("documents the exact statuses considered as covering", () => {
    expect(isCoveringPositioningStatus("envoye_client")).toBe(true)
    expect(isCoveringPositioningStatus("entretien_planifie")).toBe(true)
    expect(isCoveringPositioningStatus("entretien_realise")).toBe(true)
    expect(isCoveringPositioningStatus("retenu")).toBe(true)
    expect(isCoveringPositioningStatus("gagne")).toBe(true)
    expect(isCoveringPositioningStatus("preselectionne")).toBe(false)
    expect(isCoveringPositioningStatus("identifie")).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { cycleAcvSort, filterNeedsRows, filterStaffingRows } from "./model"

describe("needs staffing model", () => {
  it("filters and sorts needs rows by shared URL params", () => {
    const rows = [
      { stage: "qualification", priority: "haute", practice: "Data", acv: 30000, estimatedGain: null },
      { stage: "qualification", priority: "haute", practice: "Data", acv: 10000, estimatedGain: null },
      { stage: "gagne", priority: "haute", practice: "Data", acv: 50000, estimatedGain: null },
    ]

    expect(filterNeedsRows(rows, {
      stage: "qualification",
      priority: "haute",
      practice: "Data",
      sort: "acv",
      direction: "asc",
    }).map((row) => row.acv)).toEqual([10000, 30000])

    expect(filterNeedsRows(rows, {
      stage: "qualification",
      priority: "haute",
      practice: "Data",
      sort: "acv",
      direction: "desc",
    }).map((row) => row.acv)).toEqual([30000, 10000])
  })

  it("adapts staffing filters to opportunity_candidates status and linked opportunity fields", () => {
    const rows = [
      { status: "identifie", opportunityPriority: "haute", practice: "Data" },
      { status: "envoye_client", opportunityPriority: "haute", practice: "Cloud" },
      { status: "identifie", opportunityPriority: "normale", practice: "Data" },
    ]

    expect(filterStaffingRows(rows, {
      stage: "identifie",
      priority: "haute",
      practice: "Data",
    })).toEqual([{ status: "identifie", opportunityPriority: "haute", practice: "Data" }])
  })

  it("cycles the acv sort state neutral -> desc -> asc -> neutral", () => {
    expect(cycleAcvSort(null, null)).toEqual({ sort: "acv", direction: "desc" })
    expect(cycleAcvSort("acv", "desc")).toEqual({ sort: "acv", direction: "asc" })
    expect(cycleAcvSort("acv", "asc")).toEqual({ sort: null, direction: null })
  })
})

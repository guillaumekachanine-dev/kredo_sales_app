import { describe, expect, it } from "vitest"
import {
  cycleAcvSort,
  filterNeedsRows,
  filterStaffingRows,
  groupActiveStaffingsByOpportunityId,
  resolveProfilePractice,
  buildFinancialPreset,
} from "./model"
import { isActivePositioningStatus } from "./coverage"

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

  it("groups active staffings by opportunityId and excludes negative terminal statuses", () => {
    const staffings = [
      { id: "s1", opportunityId: "opp1", status: "identifie" },
      { id: "s2", opportunityId: "opp1", status: "refuse_client" }, // negative terminal
      { id: "s3", opportunityId: "opp2", status: "envoye_client" },
      { id: "s4", opportunityId: "opp2", status: "abandonne" }, // negative terminal
      { id: "s5", opportunityId: "opp2", status: "preselectionne" },
      { id: "s6", opportunityId: null, status: "identifie" }, // no opportunityId
    ]

    const grouped = groupActiveStaffingsByOpportunityId(staffings, isActivePositioningStatus)

    expect(grouped.has("opp1")).toBe(true)
    expect(grouped.get("opp1")?.map(s => s.id)).toEqual(["s1"])

    expect(grouped.has("opp2")).toBe(true)
    expect(grouped.get("opp2")?.map(s => s.id)).toEqual(["s3", "s5"])

    expect(grouped.has("opp3")).toBe(false)
  })

  it("resolves profile practice based on priority list", () => {
    // 1. Candidate practice is resolved if not collaborator
    expect(resolveProfilePractice(false, "Practice Collab", "Practice Cand", "Practice Need")).toBe("Practice Cand")

    // 2. Collaborator practice is resolved if collaborator
    expect(resolveProfilePractice(true, "Practice Collab", "Practice Cand", "Practice Need")).toBe("Practice Collab")

    // 3. Fallback to need practice if profile practices are missing
    expect(resolveProfilePractice(false, null, undefined, "Practice Need")).toBe("Practice Need")
    expect(resolveProfilePractice(true, undefined, null, "Practice Need")).toBe("Practice Need")

    // 4. Return null if none available
    expect(resolveProfilePractice(false, null, null, null)).toBe(null)
  })

  it("constructs financial simulation launch presets correctly", () => {
    const preset = buildFinancialPreset("cand123", "Jean Dupont", 65000, "comp456", "opp789", 750)
    expect(preset).toEqual({
      mode: "flash",
      title: "Simulation financière — Jean Dupont",
      candidateId: "cand123",
      candidateName: "Jean Dupont",
      annualGrossSalary: 65000,
      companyId: "comp456",
      opportunityId: "opp789",
      salesDailyRate: 750,
    })
  })
})


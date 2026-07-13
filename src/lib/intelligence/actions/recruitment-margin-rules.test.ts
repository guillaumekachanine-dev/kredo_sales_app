import { describe, expect, it } from "vitest"
import {
  buildAnalyzeFunnel,
  buildAnalyzeMargins,
  FUNNEL_STATIC_SNAPSHOT_CAVEAT,
  type BuildAnalyzeFunnelInput,
  type BuildAnalyzeMarginsInput,
} from "./recruitment-margin-rules"

const baseFunnelInput: BuildAnalyzeFunnelInput = {
  hiringProcesses: [],
  opportunityCandidates: [],
  candidates: [],
}

const baseMarginsInput: BuildAnalyzeMarginsInput = {
  missions: [],
  activitySummaries: [],
}

describe("buildAnalyzeFunnel", () => {
  it("returns the static snapshot caveat and all hiring steps", () => {
    const result = buildAnalyzeFunnel(baseFunnelInput)

    expect(result.caveat).toBe(FUNNEL_STATIC_SNAPSHOT_CAVEAT)
    expect(result.hiringFunnel.map((step) => step.step)).toEqual([
      "prequalification",
      "entretien_manager",
      "tests_techniques",
      "proposition",
      "signature",
      "integration",
    ])
  })

  it("counts active hiring processes and computes percentages", () => {
    const result = buildAnalyzeFunnel({
      ...baseFunnelInput,
      hiringProcesses: [
        hiringProcess({ id: "h-1", currentStep: "prequalification" }),
        hiringProcess({ id: "h-2", currentStep: "prequalification" }),
        hiringProcess({ id: "h-3", currentStep: "signature" }),
        hiringProcess({ id: "h-4", currentStep: "integration" }),
      ],
    })

    expect(result.summary.activeHiringProcesses).toBe(4)
    expect(result.hiringFunnel.find((step) => step.step === "prequalification")?.count).toBe(2)
    expect(result.hiringFunnel.find((step) => step.step === "prequalification")?.pctOfTotal).toBe(50)
  })

  it("excludes closed hiring processes from the current snapshot", () => {
    const result = buildAnalyzeFunnel({
      ...baseFunnelInput,
      hiringProcesses: [
        hiringProcess({ id: "h-1", currentStep: "signature", status: "active" }),
        hiringProcess({ id: "h-2", currentStep: "signature", status: "rejected" }),
        hiringProcess({ id: "h-3", currentStep: "integration", status: "hired" }),
      ],
    })

    expect(result.summary.activeHiringProcesses).toBe(1)
    expect(result.hiringFunnel.find((step) => step.step === "signature")?.count).toBe(1)
    expect(result.hiringFunnel.find((step) => step.step === "integration")?.count).toBe(0)
  })

  it("groups staffing statuses with business labels and a 10 item cap", () => {
    const result = buildAnalyzeFunnel({
      ...baseFunnelInput,
      opportunityCandidates: [
        opportunityCandidate({ id: "oc-1", status: "envoye_client" }),
        opportunityCandidate({ id: "oc-2", status: "envoye_client" }),
        opportunityCandidate({ id: "oc-3", status: "retenu" }),
        opportunityCandidate({ id: "oc-4", status: "status_custom_1" }),
        opportunityCandidate({ id: "oc-5", status: "status_custom_2" }),
        opportunityCandidate({ id: "oc-6", status: "status_custom_3" }),
        opportunityCandidate({ id: "oc-7", status: "status_custom_4" }),
        opportunityCandidate({ id: "oc-8", status: "status_custom_5" }),
        opportunityCandidate({ id: "oc-9", status: "status_custom_6" }),
        opportunityCandidate({ id: "oc-10", status: "status_custom_7" }),
        opportunityCandidate({ id: "oc-11", status: "status_custom_8" }),
        opportunityCandidate({ id: "oc-12", status: "status_custom_9" }),
      ],
    })

    expect(result.staffingFunnel).toHaveLength(10)
    expect(result.staffingFunnel[0]).toMatchObject({ status: "envoye_client", statusLabel: "CV envoyé", count: 2 })
    expect(result.staffingFunnel.some((status) => status.statusLabel === "Retenu")).toBe(true)
  })
})

describe("buildAnalyzeMargins", () => {
  it("counts negative and low active mission margins", () => {
    const result = buildAnalyzeMargins({
      ...baseMarginsInput,
      missions: [
        mission({ id: "m-1", grossMarginPct: -5 }),
        mission({ id: "m-2", grossMarginPct: 8 }),
        mission({ id: "m-3", grossMarginPct: 28 }),
        mission({ id: "m-4", status: "closed", grossMarginPct: -20 }),
      ],
    })

    expect(result.summary).toMatchObject({
      activeMissions: 3,
      negativeMargins: 1,
      lowMargins: 1,
      unknownMargins: 0,
    })
  })

  it("returns the three worst known margins sorted ascending", () => {
    const result = buildAnalyzeMargins({
      ...baseMarginsInput,
      missions: [
        mission({ id: "m-1", title: "A", grossMarginPct: 12 }),
        mission({ id: "m-2", title: "B", grossMarginPct: -8 }),
        mission({ id: "m-3", title: "C", grossMarginPct: 3 }),
        mission({ id: "m-4", title: "D", grossMarginPct: 18 }),
      ],
    })

    expect(result.worstMargins.map((item) => item.title)).toEqual(["B", "C", "A"])
  })

  it("falls back to the latest analytic activity summary when mission margin is absent", () => {
    const result = buildAnalyzeMargins({
      ...baseMarginsInput,
      missions: [mission({ id: "m-1", collaboratorId: "c-1", grossMarginPct: null })],
      activitySummaries: [
        activitySummary({ collaboratorId: "c-1", fullName: "Ada Lovelace", periodStart: "2026-04-01", realMarginPct: 30 }),
        activitySummary({ collaboratorId: "c-1", fullName: "Ada Lovelace", periodStart: "2026-06-01", realMarginPct: 7 }),
      ],
    })

    expect(result.worstMargins[0]).toMatchObject({
      collaboratorName: "Ada Lovelace",
      marginPct: 7,
      source: "activity_summary",
    })
    expect(result.summary.lowMargins).toBe(1)
  })

  it("tracks unknown margins without adding them to the worst margin list", () => {
    const result = buildAnalyzeMargins({
      ...baseMarginsInput,
      missions: [mission({ id: "m-1", grossMarginPct: null, collaboratorId: null })],
    })

    expect(result.summary.unknownMargins).toBe(1)
    expect(result.worstMargins).toEqual([])
  })
})

function hiringProcess(overrides: Partial<BuildAnalyzeFunnelInput["hiringProcesses"][number]>): BuildAnalyzeFunnelInput["hiringProcesses"][number] {
  return {
    id: "h-1",
    currentStep: "prequalification",
    status: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

function opportunityCandidate(overrides: Partial<BuildAnalyzeFunnelInput["opportunityCandidates"][number]>): BuildAnalyzeFunnelInput["opportunityCandidates"][number] {
  return {
    id: "oc-1",
    status: "identifie",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

function mission(overrides: Partial<BuildAnalyzeMarginsInput["missions"][number]>): BuildAnalyzeMarginsInput["missions"][number] {
  return {
    id: "m-1",
    title: "Mission",
    status: "active",
    grossMarginPct: 20,
    practice: "Data",
    companyName: "Client",
    collaboratorId: "c-1",
    ...overrides,
  }
}

function activitySummary(overrides: Partial<BuildAnalyzeMarginsInput["activitySummaries"][number]>): BuildAnalyzeMarginsInput["activitySummaries"][number] {
  return {
    collaboratorId: "c-1",
    fullName: "Consultant",
    periodStart: "2026-06-01",
    realMarginPct: 20,
    revenue: 10_000,
    realMargin: 2_000,
    ...overrides,
  }
}

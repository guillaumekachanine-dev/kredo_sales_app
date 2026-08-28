import { describe, it, expect } from "vitest"
import type { MissionActivityReport, MissionSummary, MissionCompensation } from "../mission-detail-types"
import {
  ACTIVITY_THRESHOLDS,
  parseDateOnly,
  getYearsSince,
  getMissionDurationMonths,
  isEndingSoon,
  computeTotalRevenue,
  computeYtdRevenue,
  computeRealMarginPct,
  computeTotalBillableDays,
  computeYtdBillableDays,
  computeOverallActivityRate,
  computeYtdActivityRate,
  computeEstimatedContractValue,
  computeAnnualContractValueThroughYearEnd,
  computeTheoreticalMarginPct,
  computeEstimatedMonthlySalary,
  buildCraAlerts,
  getCraStatusLabel,
  getPeriodLabel,
  isValidTabId,
} from "../mission-detail-utils"

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeReport = (
  overrides: Partial<MissionActivityReport> = {}
): MissionActivityReport => ({
  id: "r1",
  period_start: "2026-01-01",
  period_end: "2026-01-31",
  status: "validated",
  billable_days: 18,
  non_billable_days: 0,
  business_days: 21,
  pto_days: 2,
  sick_days: 1,
  activity_rate_percent: 85.7,
  tjm_snapshot: 600,
  cjm_snapshot: 400,
  ...overrides,
})

const makeMission = (overrides: Partial<MissionSummary> = {}): MissionSummary => ({
  id: "m1",
  title: "Test Mission",
  status: "active",
  start_date: "2025-01-01",
  end_date: "2025-12-31",
  role_title: "Tech Lead",
  practice: "Data & IA",
  seniority: "Senior",
  tjm: 650,
  cjm: 450,
  gross_margin_pct: null,
  billing_condition: null,
  description: null,
  metadata: {},
  opportunity_id: null,
  collaborator_id: "c1",
  company_id: "co1",
  external_ref: "MSN-001",
  ...overrides,
})

// ─── parseDateOnly ────────────────────────────────────────────────────────────

describe("parseDateOnly", () => {
  it("parses a valid date string", () => {
    const d = parseDateOnly("2026-06-30")
    expect(d).toBeInstanceOf(Date)
    expect(d!.getFullYear()).toBe(2026)
    expect(d!.getMonth()).toBe(5) // June = 5
    expect(d!.getDate()).toBe(30)
  })

  it("returns null for null/undefined", () => {
    expect(parseDateOnly(null)).toBeNull()
    expect(parseDateOnly(undefined)).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(parseDateOnly("")).toBeNull()
  })

  it("handles datetime strings by slicing to date only", () => {
    const d = parseDateOnly("2026-03-15T10:30:00Z")
    expect(d!.getDate()).toBe(15)
    expect(d!.getMonth()).toBe(2) // March = 2
  })
})

// ─── getMissionDurationMonths ─────────────────────────────────────────────────

describe("getMissionDurationMonths", () => {
  it("returns null when start is null", () => {
    expect(getMissionDurationMonths(null, "2026-12-31")).toBeNull()
  })

  it("returns null when end is null", () => {
    expect(getMissionDurationMonths("2026-01-01", null)).toBeNull()
  })

  it("calculates ~12 months for a year-long mission", () => {
    const months = getMissionDurationMonths("2026-01-01", "2026-12-31")
    expect(months).toBeGreaterThanOrEqual(11)
    expect(months).toBeLessThanOrEqual(13)
  })

  it("returns at least 1 for a 2-week mission", () => {
    expect(getMissionDurationMonths("2026-06-01", "2026-06-15")).toBe(1)
  })

  it("returns null when end < start", () => {
    expect(getMissionDurationMonths("2026-12-01", "2026-01-01")).toBeNull()
  })
})

// ─── isEndingSoon ─────────────────────────────────────────────────────────────

describe("isEndingSoon", () => {
  it("returns false for null end date", () => {
    expect(isEndingSoon(null)).toBe(false)
  })

  it("returns false for a date far in the future", () => {
    expect(isEndingSoon("2030-01-01")).toBe(false)
  })

  it("returns false for past end date", () => {
    expect(isEndingSoon("2020-01-01")).toBe(false)
  })
})

// ─── computeTotalRevenue ──────────────────────────────────────────────────────

describe("computeTotalRevenue", () => {
  it("returns 0 for empty reports", () => {
    expect(computeTotalRevenue([])).toBe(0)
  })

  it("sums billable_days × tjm_snapshot", () => {
    const reports = [
      makeReport({ billable_days: 18, tjm_snapshot: 600 }),
      makeReport({ id: "r2", period_start: "2026-02-01", billable_days: 16, tjm_snapshot: 620 }),
    ]
    expect(computeTotalRevenue(reports)).toBe(18 * 600 + 16 * 620)
  })
})

// ─── computeYtdRevenue ────────────────────────────────────────────────────────

describe("computeYtdRevenue", () => {
  it("returns 0 for empty reports", () => {
    expect(computeYtdRevenue([])).toBe(0)
  })

  it("filters to current year only", () => {
    const currentYear = new Date().getFullYear()
    const reports = [
      makeReport({ period_start: `${currentYear}-01-01`, billable_days: 10, tjm_snapshot: 600 }),
      makeReport({ id: "r2", period_start: `${currentYear - 1}-12-01`, billable_days: 20, tjm_snapshot: 600 }),
    ]
    expect(computeYtdRevenue(reports)).toBe(10 * 600)
  })
})

// ─── computeRealMarginPct ─────────────────────────────────────────────────────

describe("computeRealMarginPct", () => {
  it("returns null for empty reports", () => {
    expect(computeRealMarginPct([])).toBeNull()
  })

  it("returns null when billable_days is 0 across all reports", () => {
    const reports = [makeReport({ billable_days: 0, tjm_snapshot: 600, cjm_snapshot: 400 })]
    expect(computeRealMarginPct(reports)).toBeNull()
  })

  it("calculates correct margin", () => {
    // Revenue = 10 × 600 = 6000, Cost = 10 × 400 = 4000, Margin = (6000-4000)/6000 = 33.33%
    const reports = [makeReport({ billable_days: 10, tjm_snapshot: 600, cjm_snapshot: 400 })]
    const pct = computeRealMarginPct(reports)!
    expect(pct).toBeCloseTo(33.33, 1)
  })

  it("aggregates across multiple CRA correctly", () => {
    const reports = [
      makeReport({ billable_days: 10, tjm_snapshot: 600, cjm_snapshot: 400 }),
      makeReport({ id: "r2", period_start: "2026-02-01", billable_days: 15, tjm_snapshot: 700, cjm_snapshot: 490 }),
    ]
    const totalRevenue = 10 * 600 + 15 * 700 // 6000 + 10500 = 16500
    const totalCost = 10 * 400 + 15 * 490 // 4000 + 7350 = 11350
    const expectedMargin = ((totalRevenue - totalCost) / totalRevenue) * 100
    expect(computeRealMarginPct(reports)).toBeCloseTo(expectedMargin, 1)
  })
})

// ─── computeOverallActivityRate ───────────────────────────────────────────────

describe("computeOverallActivityRate", () => {
  it("returns null for empty reports", () => {
    expect(computeOverallActivityRate([])).toBeNull()
  })

  it("ignores reports with null activity_rate_percent", () => {
    const reports = [
      makeReport({ activity_rate_percent: null }),
      makeReport({ id: "r2", period_start: "2026-02-01", activity_rate_percent: 80 }),
    ]
    expect(computeOverallActivityRate(reports)).toBe(80)
  })

  it("averages across rated reports", () => {
    const reports = [
      makeReport({ activity_rate_percent: 80 }),
      makeReport({ id: "r2", period_start: "2026-02-01", activity_rate_percent: 90 }),
    ]
    expect(computeOverallActivityRate(reports)).toBe(85)
  })
})

// ─── computeEstimatedContractValue ────────────────────────────────────────────

describe("computeEstimatedContractValue", () => {
  it("returns null when start_date is null", () => {
    const mission = makeMission({ start_date: null, end_date: "2026-12-31" })
    expect(computeEstimatedContractValue(mission)).toBeNull()
  })

  it("returns null for open-ended missions", () => {
    const mission = makeMission({ start_date: "2026-01-01", end_date: null })
    expect(computeEstimatedContractValue(mission)).toBeNull()
  })

  it("returns a positive value for a mission with both dates", () => {
    const mission = makeMission({ start_date: "2026-01-01", end_date: "2026-12-31", tjm: 650 })
    const value = computeEstimatedContractValue(mission)
    expect(value).not.toBeNull()
    expect(value!).toBeGreaterThan(0)
  })
})

// ─── computeAnnualContractValueThroughYearEnd ─────────────────────────────────

describe("computeAnnualContractValueThroughYearEnd", () => {
  const ref = new Date(2026, 5, 15) // 15 juin 2026

  it("returns null when the mission has an end date (use TCV instead)", () => {
    const mission = makeMission({ start_date: "2025-01-01", end_date: "2026-12-31" })
    expect(computeAnnualContractValueThroughYearEnd(mission, ref)).toBeNull()
  })

  it("returns null when start_date is null", () => {
    const mission = makeMission({ start_date: null, end_date: null })
    expect(computeAnnualContractValueThroughYearEnd(mission, ref)).toBeNull()
  })

  it("returns null when the TJM is unknown", () => {
    const mission = makeMission({ start_date: "2024-01-01", end_date: null, tjm: 0 })
    expect(computeAnnualContractValueThroughYearEnd(mission, ref)).toBeNull()
  })

  it("values a mission started before the year from 1 January to 31 December", () => {
    const mission = makeMission({ start_date: "2024-03-01", end_date: null, tjm: 600 })
    // ~364 jours calendaires × 5/7 ≈ 260 j ouvrés × 600
    const value = computeAnnualContractValueThroughYearEnd(mission, ref)
    expect(value).not.toBeNull()
    expect(value!).toBeGreaterThan(150_000)
    expect(value!).toBeLessThan(160_000)
  })

  it("prorates from the mission start date when it starts within the year", () => {
    const started = makeMission({ start_date: "2026-01-01", end_date: null, tjm: 600 })
    const startedMidYear = makeMission({ start_date: "2026-07-01", end_date: null, tjm: 600 })
    const full = computeAnnualContractValueThroughYearEnd(started, ref)!
    const partial = computeAnnualContractValueThroughYearEnd(startedMidYear, ref)!
    expect(partial).toBeGreaterThan(0)
    expect(partial).toBeLessThan(full)
  })

  it("derives the year from the reference date (no hardcoded year)", () => {
    const mission = makeMission({ start_date: "2020-01-01", end_date: null, tjm: 500 })
    const in2026 = computeAnnualContractValueThroughYearEnd(mission, new Date(2026, 0, 1))
    const in2031 = computeAnnualContractValueThroughYearEnd(mission, new Date(2031, 0, 1))
    expect(in2026).not.toBeNull()
    expect(in2031).not.toBeNull()
    // Année pleine dans les deux cas (~260 j ouvrés × 500)
    expect(Math.abs(in2031! - in2026!)).toBeLessThanOrEqual(500)
  })
})

// ─── computeTheoreticalMarginPct ─────────────────────────────────────────────

describe("computeTheoreticalMarginPct", () => {
  it("uses gross_margin_pct when available", () => {
    const mission = makeMission({ gross_margin_pct: 30.5 })
    expect(computeTheoreticalMarginPct(mission)).toBe(30.5)
  })

  it("computes from tjm/cjm when gross_margin_pct is null", () => {
    const mission = makeMission({ tjm: 600, cjm: 400, gross_margin_pct: null })
    // (600 - 400) / 600 * 100 = 33.33...
    expect(computeTheoreticalMarginPct(mission)!).toBeCloseTo(33.33, 1)
  })

  it("returns null when tjm is 0", () => {
    const mission = makeMission({ tjm: 0, cjm: 400, gross_margin_pct: null })
    expect(computeTheoreticalMarginPct(mission)).toBeNull()
  })
})

// ─── computeEstimatedMonthlySalary ────────────────────────────────────────────

describe("computeEstimatedMonthlySalary", () => {
  it("uses gross_annual directly when available (admin)", () => {
    const comp: MissionCompensation = { gross_annual: 72000, charges_rate: 0.45, working_days_per_year: 218, taci: 0.85 }
    expect(computeEstimatedMonthlySalary(500, comp)).toBe(6000)
  })

  it("falls back to CJM heuristic when no gross_annual", () => {
    const comp: MissionCompensation = { gross_annual: null, charges_rate: 0.45, working_days_per_year: 218, taci: 0.85 }
    const salary = computeEstimatedMonthlySalary(500, comp)
    expect(salary).toBeGreaterThan(0)
  })

  it("handles null compensation with defaults", () => {
    const salary = computeEstimatedMonthlySalary(500, null)
    expect(salary).toBeGreaterThan(0)
  })
})

// ─── buildCraAlerts ───────────────────────────────────────────────────────────

describe("buildCraAlerts", () => {
  it("returns empty for no reports", () => {
    expect(buildCraAlerts([])).toHaveLength(0)
  })

  it("flags pending (draft/submitted/rejected) CRAs", () => {
    const reports = [makeReport({ status: "draft" })]
    const alerts = buildCraAlerts(reports)
    const pending = alerts.find((a) => a.id === "pending-cra")
    expect(pending).toBeDefined()
  })

  it("flags low activity", () => {
    const reports = [makeReport({ activity_rate_percent: ACTIVITY_THRESHOLDS.LOW - 10 })]
    const alerts = buildCraAlerts(reports)
    expect(alerts.some((a) => a.id === "low-activity")).toBe(true)
  })

  it("does NOT flag low activity when rate is above threshold", () => {
    const reports = [makeReport({ activity_rate_percent: ACTIVITY_THRESHOLDS.TARGET })]
    const alerts = buildCraAlerts(reports)
    expect(alerts.some((a) => a.id === "low-activity")).toBe(false)
  })
})

// ─── getCraStatusLabel ────────────────────────────────────────────────────────

describe("getCraStatusLabel", () => {
  it("returns French labels for known statuses", () => {
    expect(getCraStatusLabel("validated")).toBe("Validé")
    expect(getCraStatusLabel("draft")).toBe("Brouillon")
    expect(getCraStatusLabel("submitted")).toBe("Soumis")
    expect(getCraStatusLabel("rejected")).toBe("Rejeté")
  })

  it("returns the original string for unknown statuses", () => {
    expect(getCraStatusLabel("unknown_status")).toBe("unknown_status")
  })
})

// ─── isValidTabId ─────────────────────────────────────────────────────────────

describe("isValidTabId", () => {
  it("accepts valid tab IDs", () => {
    expect(isValidTabId("synthesis")).toBe(true)
    expect(isValidTabId("collaborator")).toBe(true)
    expect(isValidTabId("planning")).toBe(true)
    expect(isValidTabId("activity")).toBe(true)
    expect(isValidTabId("financial")).toBe(true)
  })

  it("rejects invalid strings", () => {
    expect(isValidTabId("")).toBe(false)
    expect(isValidTabId("overview")).toBe(false)
    expect(isValidTabId("documents")).toBe(false)
  })
})

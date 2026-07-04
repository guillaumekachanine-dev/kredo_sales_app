import { describe, expect, it } from "vitest"
import { getIsoWeekLabel } from "./iso-week"

describe("getIsoWeekLabel", () => {
  it("returns W01 for the first Thursday of the year", () => {
    expect(getIsoWeekLabel("2026-01-01")).toBe("2026-W01")
  })

  it("attributes late-December dates to next year's week 1 when applicable", () => {
    expect(getIsoWeekLabel("2025-12-29")).toBe("2026-W01")
  })

  it("matches the reference week used throughout ADR-0010 (06/07 -> 12/07/2026)", () => {
    expect(getIsoWeekLabel("2026-07-06")).toBe("2026-W28")
    expect(getIsoWeekLabel("2026-07-12")).toBe("2026-W28")
  })

  it("handles a year with 53 ISO weeks", () => {
    expect(getIsoWeekLabel("2026-12-31")).toBe("2026-W53")
    expect(getIsoWeekLabel("2027-01-04")).toBe("2027-W01")
  })
})

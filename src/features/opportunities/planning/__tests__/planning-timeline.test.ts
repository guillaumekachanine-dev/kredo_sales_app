import { describe, expect, it } from "vitest"
import {
  buildTimelinePeriod,
  getTimelinePosition,
  getTodayPosition,
  shiftTimelineAnchor,
} from "../planning-timeline"

describe("planning timeline — géométrie temporelle", () => {
  const reference = "2026-09-09T12:00:00.000Z"

  it("construit le vrai mois, sans découpage artificiel en quatre semaines", () => {
    const period = buildTimelinePeriod("month", reference, reference)
    expect(period.title).toBe("SEPTEMBRE 2026")
    expect(period.columns).toHaveLength(30)
    expect(period.columns.filter((column) => column.label).map((column) => column.label)).toEqual([
      "01", "08", "15", "22", "29",
    ])
  })

  it("positionne exactement le début, le milieu et la fin d'un mois", () => {
    const period = buildTimelinePeriod("month", reference, reference)
    expect(getTimelinePosition("2026-09-01T00:00:00Z", period)).toBe(0)
    expect(getTimelinePosition("2026-09-16T00:00:00Z", period)).toBe(50)
    expect(getTimelinePosition("2026-09-30T00:00:00Z", period)).toBeCloseTo(96.666, 2)
    expect(getTimelinePosition("2026-10-01T00:00:00Z", period)).toBeNull()
  })

  it("construit les 12 mois de l'année et tient compte d'une année bissextile", () => {
    const period = buildTimelinePeriod("year", "2028-06-01T00:00:00Z", reference)
    expect(period.columns).toHaveLength(12)
    expect(period.endMs - period.startMs).toBe(366 * 24 * 60 * 60 * 1000)
    expect(getTimelinePosition("2028-02-29T00:00:00Z", period)).not.toBeNull()
  })

  it("n'affiche aujourd'hui que dans la période qui le contient", () => {
    const september = buildTimelinePeriod("month", reference, reference)
    const october = buildTimelinePeriod("month", "2026-10-01T00:00:00Z", reference)
    expect(getTodayPosition(reference, september)).not.toBeNull()
    expect(getTodayPosition(reference, october)).toBeNull()
  })

  it("navigue par mois ou par année sans dérive de fin de mois", () => {
    expect(shiftTimelineAnchor("2026-01-31T12:00:00Z", "month", 1)).toBe("2026-02-01T00:00:00.000Z")
    expect(shiftTimelineAnchor(reference, "year", -1)).toBe("2025-09-01T00:00:00.000Z")
  })
})

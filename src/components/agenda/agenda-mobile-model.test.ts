import { describe, expect, it } from "vitest"
import { parseAgendaMobileRouteState, buildAgendaMobileRange, addDays } from "./agenda-mobile-model"
import { startOfLocalDay } from "@/lib/agenda/agenda-temporal"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"

describe("agenda-mobile-model", () => {
  const now = "2026-07-01T12:00:00.000Z" // Wednesday
  const todayKey = "2026-07-01"

  describe("parseAgendaMobileRouteState", () => {
    it("should fallback to calendar mode and today date for empty parameters", () => {
      const state = parseAgendaMobileRouteState({}, now)
      expect(state.mode).toBe("calendar")
      expect(state.date).toBe(todayKey)
      expect(state.filters.showDeadlines).toBe(true)
      expect(state.filters.showAbsences).toBe(true)
      expect(state.filters.showActivity).toBe(true)
      expect(state.filters.showInternal).toBe(true)
      expect(state.shouldRedirect).toBe(true) // because the incoming URL has no mode or date
    })

    it("should accept valid mode and date parameters and not require redirect", () => {
      const state = parseAgendaMobileRouteState(
        {
          mode: "calendar",
          date: "2026-07-15",
        },
        now
      )
      expect(state.mode).toBe("calendar")
      expect(state.date).toBe("2026-07-15")
      expect(state.shouldRedirect).toBe(false)
    })

    it("should normalize legacy view=day parameter to mode=calendar", () => {
      const state = parseAgendaMobileRouteState(
        {
          view: "day",
          date: "2026-07-02",
        },
        now
      )
      expect(state.mode).toBe("calendar")
      expect(state.date).toBe("2026-07-02")
      expect(state.shouldRedirect).toBe(true)
    })

    it("should normalize legacy view=week parameter to mode=calendar", () => {
      const state = parseAgendaMobileRouteState(
        {
          view: "week",
        },
        now
      )
      expect(state.mode).toBe("calendar")
      expect(state.shouldRedirect).toBe(true)
    })

    it("should ignore invalid dates and fallback to today", () => {
      const state = parseAgendaMobileRouteState(
        {
          mode: "feed",
          date: "invalid-date",
        },
        now
      )
      expect(state.date).toBe(todayKey)
      expect(state.shouldRedirect).toBe(true)
    })

    it("should preserve filters in the state and canonical query string", () => {
      const state = parseAgendaMobileRouteState(
        {
          mode: "calendar",
          date: "2026-07-01",
          filters: "deadlines,activity",
        },
        now
      )
      expect(state.filters.showDeadlines).toBe(true)
      expect(state.filters.showAbsences).toBe(false)
      expect(state.filters.showActivity).toBe(true)
      expect(state.filters.showInternal).toBe(false)
      expect(state.shouldRedirect).toBe(false)
      expect(state.canonicalQueryString).toContain("filters=deadlines")
      expect(state.canonicalQueryString).toContain("activity")
    })
  })

  describe("buildAgendaMobileRange", () => {
    it("should generate the J-30 to J+30 range relative to now", () => {
      const range = buildAgendaMobileRange(now)
      const expectedFrom = startOfLocalDay(addDays(todayKey, -30), AGENDA_V1_TIMEZONE).toISOString()
      const expectedTo = startOfLocalDay(addDays(todayKey, 31), AGENDA_V1_TIMEZONE).toISOString()

      expect(range.from).toBe(expectedFrom)
      expect(range.to).toBe(expectedTo)
    })
  })
})

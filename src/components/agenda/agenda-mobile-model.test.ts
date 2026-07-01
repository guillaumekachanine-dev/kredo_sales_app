import { describe, expect, it } from "vitest"
import { parseAgendaMobileRouteState, buildAgendaMobileRange, addDays } from "./agenda-mobile-model"
import { getTodayDateKey, startOfLocalDay } from "@/lib/agenda/agenda-temporal"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"

describe("agenda-mobile-model", () => {
  const now = "2026-07-01T12:00:00.000Z" // Wednesday
  const todayKey = "2026-07-01"

  describe("parseAgendaMobileRouteState", () => {
    it("should fallback to feed mode and today date for empty parameters", () => {
      const state = parseAgendaMobileRouteState({}, now)
      expect(state.mode).toBe("feed")
      expect(state.date).toBe(todayKey)
      expect(state.filters.type).toBe("all")
      expect(state.filters.company).toBe("all")
      expect(state.filters.task).toBe("all")
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

    it("should normalize legacy view=week parameter to mode=feed", () => {
      const state = parseAgendaMobileRouteState(
        {
          view: "week",
        },
        now
      )
      expect(state.mode).toBe("feed")
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
          mode: "feed",
          date: "2026-07-01",
          type: "rdv_client_suivi",
          company: "comp-123",
          task: "has_task",
        },
        now
      )
      expect(state.filters.type).toBe("rdv_client_suivi")
      expect(state.filters.company).toBe("comp-123")
      expect(state.filters.task).toBe("has_task")
      expect(state.shouldRedirect).toBe(false)
      expect(state.canonicalQueryString).toContain("type=rdv_client_suivi")
      expect(state.canonicalQueryString).toContain("company=comp-123")
      expect(state.canonicalQueryString).toContain("task=has_task")
    })
  })

  describe("buildAgendaMobileRange", () => {
    it("should generate the J-30 to J+62 range relative to now", () => {
      const range = buildAgendaMobileRange(now)
      const expectedFrom = startOfLocalDay(addDays(todayKey, -30), AGENDA_V1_TIMEZONE).toISOString()
      const expectedTo = startOfLocalDay(addDays(todayKey, 63), AGENDA_V1_TIMEZONE).toISOString()

      expect(range.from).toBe(expectedFrom)
      expect(range.to).toBe(expectedTo)
    })
  })
})

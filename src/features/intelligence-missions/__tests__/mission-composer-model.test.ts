import { describe, expect, it, vi } from "vitest"

import {
  buildMonthlyWatchMissionPayload,
  defaultMissionMonth,
  launchMonthlyWatchMission,
  MISSION_COMPOSER_ACTION_CONFIGS,
  MONTHLY_WATCH_MISSION_ACTION_ID,
  monthToVeillePeriod,
  RENTABILITE_MISSION_COMPOSER_CONFIG,
  VEILLE_MISSION_COMPOSER_CONFIG,
} from "../components/mission-composer-model"
import { resolveRunOutcome } from "@/lib/n8n/run-tracker-policy"

describe("mission composer month selector", () => {
  it.each([
    ["2026-01", "2026-01-01", "2026-01-31"],
    ["2026-02", "2026-02-01", "2026-02-28"],
    ["2024-02", "2024-02-01", "2024-02-29"],
    ["2026-04", "2026-04-01", "2026-04-30"],
  ])("maps %s to its exact boundaries", (month, periodStart, periodEnd) => {
    expect(monthToVeillePeriod(month)).toEqual({ kind: "veille_period", periodStart, periodEnd })
  })

  it("defaults to the complete previous calendar month", () => {
    expect(defaultMissionMonth(new Date("2026-01-15T12:00:00.000Z"))).toBe("2025-12")
  })
})

describe("mission composer launch contract", () => {
  it("sends only the mission slug and the allowed selector", () => {
    const payload = buildMonthlyWatchMissionPayload("2026-07")
    expect(payload).toEqual({
      missionSlug: "veille-analyse-mensuelle",
      selectors: [{ kind: "veille_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" }],
    })
    expect(Object.keys(payload).sort()).toEqual(["missionSlug", "selectors"])
    for (const forbidden of ["workflowId", "input", "workspaceId", "userId", "runType", "resultType", "model", "systemPrompt", "userPrompt", "budget", "corpus"]) {
      expect(payload).not.toHaveProperty(forbidden)
    }
  })

  it("returns the queued run from the trigger gateway", async () => {
    const fetcher = vi.fn(async (_input: string, _init: RequestInit) => ({
      ok: true,
      json: async () => ({ runId: "run-123", status: "queued" }),
    }))
    await expect(launchMonthlyWatchMission("2026-07", fetcher)).resolves.toEqual({ runId: "run-123", status: "queued" })
    expect(fetcher).toHaveBeenCalledWith("/api/n8n/trigger", expect.objectContaining({ method: "POST" }))
    const request = fetcher.mock.calls[0]?.[1]
    expect(JSON.parse(String(request?.body))).toEqual(buildMonthlyWatchMissionPayload("2026-07"))
  })

  it("surfaces the launch error returned by the gateway", async () => {
    const fetcher = vi.fn(async (_input: string, _init: RequestInit) => ({
      ok: false,
      json: async () => ({ error: "Corpus de veille introuvable" }),
    }))
    await expect(launchMonthlyWatchMission("2026-07", fetcher)).rejects.toThrow("Corpus de veille introuvable")
  })

  it("tracks only the mission_report result to success", () => {
    expect(resolveRunOutcome({
      run: { status: "running", error_message: null },
      resultType: "mission_report",
      results: [
        { id: "other", status: "succeeded", result_type: "strategic_watch_analysis" },
        { id: "mission", status: "succeeded", result_type: "mission_report" },
      ],
    })).toEqual({ settled: true, outcome: "succeeded", resultId: "mission", message: null })
  })
})

describe("mission composer action configs mapping", () => {
  it("maps monthly watch, analyze_margins, and prioritize_accounts to their respective configs", () => {
    expect(MISSION_COMPOSER_ACTION_CONFIGS[MONTHLY_WATCH_MISSION_ACTION_ID]).toEqual(VEILLE_MISSION_COMPOSER_CONFIG)
    expect(MISSION_COMPOSER_ACTION_CONFIGS.analyze_margins).toEqual(RENTABILITE_MISSION_COMPOSER_CONFIG)
    expect(MISSION_COMPOSER_ACTION_CONFIGS.prioritize_accounts).toBeDefined()
    expect(MISSION_COMPOSER_ACTION_CONFIGS.prioritize_accounts.missionSlug).toBe("activation-portefeuille")
  })

  it("builds delivery_period selectors for analyze_margins", () => {
    const config = MISSION_COMPOSER_ACTION_CONFIGS.analyze_margins
    expect(config.missionSlug).toBe("rentabilite-portefeuille")
    expect(config.buildSelectors("2026-07")).toEqual([
      { kind: "delivery_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" },
    ])
  })

  it("builds prospection_window selectors for prioritize_accounts", () => {
    const config = MISSION_COMPOSER_ACTION_CONFIGS.prioritize_accounts
    expect(config.missionSlug).toBe("activation-portefeuille")
    expect(config.buildSelectors("2026-08")).toEqual([
      { kind: "prospection_window", periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    ])
  })

  it("maps forecast_availability to capacite-staffing", () => {
    expect(MISSION_COMPOSER_ACTION_CONFIGS.forecast_availability).toBeDefined()
    expect(MISSION_COMPOSER_ACTION_CONFIGS.forecast_availability.missionSlug).toBe("capacite-staffing")
  })

  it("builds staffing_horizon selectors for forecast_availability", () => {
    const config = MISSION_COMPOSER_ACTION_CONFIGS.forecast_availability
    expect(config.missionSlug).toBe("capacite-staffing")
    expect(config.buildSelectors("2026-08")).toEqual([
      { kind: "staffing_horizon", periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    ])
  })
})


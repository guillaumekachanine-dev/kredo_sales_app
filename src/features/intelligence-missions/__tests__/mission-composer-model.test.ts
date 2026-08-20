import { describe, expect, it, vi } from "vitest"

import {
  buildMonthlyWatchMissionPayload,
  defaultMissionMonth,
  launchMonthlyWatchMission,
  monthToVeillePeriod,
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

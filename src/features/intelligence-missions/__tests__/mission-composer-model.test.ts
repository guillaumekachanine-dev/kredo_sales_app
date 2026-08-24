import { describe, expect, it, vi } from "vitest"

import {
  ACTIVATION_PORTEFEUILLE_MISSION_COMPOSER_CONFIG,
  buildMonthlyWatchMissionPayload,
  CAPACITE_STAFFING_MISSION_COMPOSER_CONFIG,
  defaultMissionMonth,
  launchMonthlyWatchMission,
  MISSION_COMPOSER_ACTION_CONFIGS,
  MONTHLY_WATCH_MISSION_ACTION_ID,
  monthToVeillePeriod,
  RENTABILITE_MISSION_COMPOSER_CONFIG,
  resolveInitialAccountSelection,
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
  it("declares inputKind 'month' on all four existing configs", () => {
    expect(VEILLE_MISSION_COMPOSER_CONFIG.inputKind).toBe("month")
    expect(RENTABILITE_MISSION_COMPOSER_CONFIG.inputKind).toBe("month")
    expect(ACTIVATION_PORTEFEUILLE_MISSION_COMPOSER_CONFIG.inputKind).toBe("month")
    expect(CAPACITE_STAFFING_MISSION_COMPOSER_CONFIG.inputKind).toBe("month")
  })

  it("maps monthly watch, analyze_margins, and prioritize_accounts to their respective configs", () => {
    expect(MISSION_COMPOSER_ACTION_CONFIGS[MONTHLY_WATCH_MISSION_ACTION_ID]).toEqual(VEILLE_MISSION_COMPOSER_CONFIG)
    expect(MISSION_COMPOSER_ACTION_CONFIGS.analyze_margins).toEqual(RENTABILITE_MISSION_COMPOSER_CONFIG)
    expect(MISSION_COMPOSER_ACTION_CONFIGS.prioritize_accounts).toBeDefined()
    expect(MISSION_COMPOSER_ACTION_CONFIGS.prioritize_accounts.missionSlug).toBe("activation-portefeuille")
  })

  it("builds veille_period selectors for monthly watch with input validation", () => {
    const config = VEILLE_MISSION_COMPOSER_CONFIG
    expect(config.buildSelectors({ kind: "month", month: "2026-01" })).toEqual([
      { kind: "veille_period", periodStart: "2026-01-01", periodEnd: "2026-01-31" },
    ])
    expect(() => config.buildSelectors({ kind: "account", companyId: "c-1" })).toThrow(
      'Entrée invalide pour la mission "veille-analyse-mensuelle" : attendu "month", reçu "account".',
    )
  })

  it("builds delivery_period selectors for analyze_margins with input validation", () => {
    const config = MISSION_COMPOSER_ACTION_CONFIGS.analyze_margins
    expect(config.missionSlug).toBe("rentabilite-portefeuille")
    expect(config.buildSelectors({ kind: "month", month: "2026-07" })).toEqual([
      { kind: "delivery_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" },
    ])
    expect(() => config.buildSelectors({ kind: "account", companyId: "c-1" })).toThrow(
      'Entrée invalide pour la mission "rentabilite-portefeuille" : attendu "month", reçu "account".',
    )
  })

  it("builds prospection_window selectors for prioritize_accounts with input validation", () => {
    const config = MISSION_COMPOSER_ACTION_CONFIGS.prioritize_accounts
    expect(config.missionSlug).toBe("activation-portefeuille")
    expect(config.buildSelectors({ kind: "month", month: "2026-08" })).toEqual([
      { kind: "prospection_window", periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    ])
    expect(() => config.buildSelectors({ kind: "account", companyId: "c-1" })).toThrow(
      'Entrée invalide pour la mission "activation-portefeuille" : attendu "month", reçu "account".',
    )
  })

  it("maps forecast_availability to capacite-staffing", () => {
    expect(MISSION_COMPOSER_ACTION_CONFIGS.forecast_availability).toBeDefined()
    expect(MISSION_COMPOSER_ACTION_CONFIGS.forecast_availability.missionSlug).toBe("capacite-staffing")
  })

  it("builds staffing_horizon selectors for forecast_availability with input validation", () => {
    const config = MISSION_COMPOSER_ACTION_CONFIGS.forecast_availability
    expect(config.missionSlug).toBe("capacite-staffing")
    expect(config.buildSelectors({ kind: "month", month: "2026-08" })).toEqual([
      { kind: "staffing_horizon", periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    ])
    expect(() => config.buildSelectors({ kind: "account", companyId: "c-1" })).toThrow(
      'Entrée invalide pour la mission "capacite-staffing" : attendu "month", reçu "account".',
    )
  })

  it("maps review_account to revue-compte-client", () => {
    expect(MISSION_COMPOSER_ACTION_CONFIGS.review_account).toBeDefined()
    expect(MISSION_COMPOSER_ACTION_CONFIGS.review_account.missionSlug).toBe("revue-compte-client")
    expect(MISSION_COMPOSER_ACTION_CONFIGS.review_account.inputKind).toBe("account")
  })

  it("builds both account_context and account_delivery selectors for review_account with input validation", () => {
    const config = MISSION_COMPOSER_ACTION_CONFIGS.review_account
    expect(config.missionSlug).toBe("revue-compte-client")
    expect(config.buildSelectors({ kind: "account", companyId: "company-uuid-123" })).toEqual([
      { kind: "account_context", companyId: "company-uuid-123" },
      { kind: "account_delivery", companyId: "company-uuid-123" },
    ])
    expect(() => config.buildSelectors({ kind: "month", month: "2026-08" })).toThrow(
      'Entrée invalide pour la mission "revue-compte-client" : attendu "account", reçu "month".',
    )
  })
})

describe("resolveInitialAccountSelection", () => {
  it("returns null when entityContext is null", () => {
    expect(resolveInitialAccountSelection(null)).toBeNull()
  })

  it.each([
    ["contact", "person-123", "Jean Dupont"],
    ["opportunity", "opp-456", "Refonte SI"],
    ["collaborator", "collab-789", "Alice Martin"],
    ["candidate", "cand-101", "Bob Smith"],
  ] as const)("returns null when entityType is '%s'", (entityType, entityId, label) => {
    expect(
      resolveInitialAccountSelection({
        entityType,
        entityId,
        label,
        pathname: "/test",
      }),
    ).toBeNull()
  })

  it("returns null when entityId is empty or whitespace", () => {
    expect(
      resolveInitialAccountSelection({
        entityType: "company",
        entityId: "",
        label: "Acme Corp",
        pathname: "/prospection/accounts/1",
      }),
    ).toBeNull()
    expect(
      resolveInitialAccountSelection({
        entityType: "company",
        entityId: "   ",
        label: "Acme Corp",
        pathname: "/prospection/accounts/1",
      }),
    ).toBeNull()
  })

  it("resolves pre-filled AccountValue when entityType is 'company'", () => {
    expect(
      resolveInitialAccountSelection({
        entityType: "company",
        entityId: "comp-cegema-123",
        label: "CEGEMA Courtage",
        pathname: "/prospection/accounts/comp-cegema-123",
      }),
    ).toEqual({
      id: "comp-cegema-123",
      name: "CEGEMA Courtage",
      isNew: false,
    })
  })
})


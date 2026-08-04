import { describe, expect, it } from "vitest"

import {
  hasTimedOut,
  isTerminalRunStatus,
  nextPollDelayMs,
  resolveRunOutcome,
  RUN_TRACKER_DEFAULTS,
} from "./run-tracker-policy"

const RESULT_ID = "11111111-1111-4111-8111-111111111111"

describe("isTerminalRunStatus", () => {
  it("reconnaît les trois états terminaux et eux seuls", () => {
    expect(["succeeded", "failed", "cancelled"].every(isTerminalRunStatus)).toBe(true)
    expect(["queued", "running", "", null, undefined].some(isTerminalRunStatus)).toBe(false)
  })
})

describe("resolveRunOutcome", () => {
  it("n'aboutit pas tant que le run est en cours", () => {
    expect(resolveRunOutcome({ run: { status: "running", error_message: null }, results: [] }))
      .toEqual({ settled: false })
    expect(resolveRunOutcome({ run: { status: "queued", error_message: null } }))
      .toEqual({ settled: false })
  })

  it("n'aboutit pas quand le run est encore introuvable", () => {
    expect(resolveRunOutcome({ run: null })).toEqual({ settled: false })
  })

  it("aboutit sur un résultat réussi même si le statut du run n'a pas suivi", () => {
    // La mise à jour du statut du run est non bloquante côté callback : elle
    // peut échouer alors que le résultat est bel et bien persisté.
    const outcome = resolveRunOutcome({
      run: { status: "running", error_message: null },
      results: [{ id: RESULT_ID, status: "succeeded", result_type: "account_knowledge" }],
    })

    expect(outcome).toEqual({ settled: true, outcome: "succeeded", resultId: RESULT_ID, message: null })
  })

  it("aboutit sur un échec de run même sans aucun résultat écrit", () => {
    // Cas réel : artefact refusé par la validation applicative avant persistance.
    const outcome = resolveRunOutcome({
      run: { status: "failed", error_message: "Sources citées inconnues du workspace" },
      results: [],
    })

    expect(outcome).toEqual({
      settled: true,
      outcome: "failed",
      resultId: null,
      message: "Sources citées inconnues du workspace",
    })
  })

  it("fournit un message par défaut quand l'échec n'en porte aucun", () => {
    const outcome = resolveRunOutcome({ run: { status: "failed", error_message: "   " } })
    expect(outcome.settled && outcome.outcome === "failed" && outcome.message).toBe("La génération a échoué.")
  })

  it("traite un run annulé comme un échec", () => {
    const outcome = resolveRunOutcome({ run: { status: "cancelled", error_message: null } })
    expect(outcome.settled && outcome.outcome).toBe("failed")
  })

  it("ignore un résultat d'un autre type que celui attendu", () => {
    const outcome = resolveRunOutcome({
      run: { status: "running", error_message: null },
      results: [{ id: RESULT_ID, status: "succeeded", result_type: "commercial_pitch" }],
      resultType: "account_knowledge",
    })

    expect(outcome).toEqual({ settled: false })
  })

  it("retient le résultat du type attendu parmi plusieurs", () => {
    const outcome = resolveRunOutcome({
      run: { status: "running", error_message: null },
      results: [
        { id: "22222222-2222-4222-8222-222222222222", status: "succeeded", result_type: "commercial_pitch" },
        { id: RESULT_ID, status: "succeeded", result_type: "account_knowledge" },
      ],
      resultType: "account_knowledge",
    })

    expect(outcome.settled && outcome.resultId).toBe(RESULT_ID)
  })

  it("aboutit sur un run réussi sans résultat du type attendu, sans prétendre en avoir un", () => {
    const outcome = resolveRunOutcome({
      run: { status: "succeeded", error_message: null },
      results: [],
      resultType: "account_knowledge",
    })

    expect(outcome).toEqual({ settled: true, outcome: "succeeded", resultId: null, message: null })
  })

  it("privilégie le succès sur l'échec quand les deux coexistent", () => {
    // Un run rejoué : un premier résultat en échec, puis un succès.
    const outcome = resolveRunOutcome({
      run: { status: "running", error_message: null },
      results: [
        { id: "33333333-3333-4333-8333-333333333333", status: "failed", result_type: "account_knowledge" },
        { id: RESULT_ID, status: "succeeded", result_type: "account_knowledge" },
      ],
      resultType: "account_knowledge",
    })

    expect(outcome.settled && outcome.outcome).toBe("succeeded")
  })
})

describe("nextPollDelayMs", () => {
  it("sonde à la cadence de base pendant la première minute", () => {
    expect(nextPollDelayMs(0)).toBe(RUN_TRACKER_DEFAULTS.basePollIntervalMs)
    expect(nextPollDelayMs(14)).toBe(RUN_TRACKER_DEFAULTS.basePollIntervalMs)
  })

  it("ralentit ensuite, pour ne pas accumuler du trafic inutile", () => {
    expect(nextPollDelayMs(15)).toBe(RUN_TRACKER_DEFAULTS.slowPollIntervalMs)
    expect(nextPollDelayMs(500)).toBe(RUN_TRACKER_DEFAULTS.slowPollIntervalMs)
  })

  it("ne descend jamais sous la cadence de base, même mal configuré", () => {
    expect(nextPollDelayMs(50, { basePollIntervalMs: 10_000, slowPollIntervalMs: 1_000 })).toBe(10_000)
  })

  it("borne le nombre de sondages d'un run de deux minutes", () => {
    let elapsed = 0
    let attempts = 0
    while (elapsed < 120_000) {
      elapsed += nextPollDelayMs(attempts)
      attempts += 1
    }
    // ~15 sondages à 4 s puis ~8 à 8 s : le coût reste marginal face à un run LLM.
    expect(attempts).toBeLessThanOrEqual(24)
  })
})

describe("hasTimedOut", () => {
  it("n'abandonne pas avant l'échéance", () => {
    expect(hasTimedOut(0, 299_999, RUN_TRACKER_DEFAULTS.timeoutMs)).toBe(false)
  })

  it("abandonne à l'échéance", () => {
    expect(hasTimedOut(0, 300_000, RUN_TRACKER_DEFAULTS.timeoutMs)).toBe(true)
  })
})

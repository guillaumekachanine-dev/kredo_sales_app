import { describe, expect, it } from "vitest"

import {
  ACCOUNT_DYNAMIC_METHOD_VERSION,
  accountDynamicLabel,
  computeAccountDynamic,
  type AccountDynamicSignalInput,
} from "./account-dynamic"
import { validateDeterministicIndicator } from "./intelligence-validators"

const NOW = new Date("2026-08-04T12:00:00.000Z")
const SOURCE_A = "11111111-1111-4111-8111-111111111111"
const SOURCE_B = "22222222-2222-4222-8222-222222222222"

function signal(overrides: Partial<AccountDynamicSignalInput> = {}): AccountDynamicSignalInput {
  return {
    primary_source_id: SOURCE_A,
    detected_at: "2026-07-20T00:00:00.000Z",
    relevance_score: 0.8,
    urgency_score: 0.5,
    confidence_score: 1,
    ...overrides,
  }
}

describe("computeAccountDynamic — account-dynamic-v1", () => {
  it("expose les 6 attributs exigés et une période explicite", () => {
    const indicator = computeAccountDynamic([signal()], { now: NOW })

    expect(indicator.method_version).toBe(ACCOUNT_DYNAMIC_METHOD_VERSION)
    expect(indicator.label.length).toBeGreaterThan(0)
    expect(indicator.evidence_count).toBe(1)
    expect(indicator.source_refs).toEqual([SOURCE_A])
    expect(indicator.period_end).toBe(NOW.toISOString())
    expect(new Date(indicator.period_start).getTime()).toBeLessThan(NOW.getTime())
    // L'indicateur doit passer le validateur générique du Lot 0 tel quel.
    expect(validateDeterministicIndicator(indicator, "$.identity.dynamic").valid).toBe(true)
  })

  it("est déterministe : deux appels sur la même entrée donnent le même résultat", () => {
    const input = [signal(), signal({ primary_source_id: SOURCE_B })]
    expect(computeAccountDynamic(input, { now: NOW })).toEqual(
      computeAccountDynamic(input, { now: NOW }),
    )
  })

  it("ne compte jamais un signal non sourcé (backfill FOLIO)", () => {
    const indicator = computeAccountDynamic(
      [signal({ primary_source_id: null }), signal({ primary_source_id: null })],
      { now: NOW },
    )

    expect(indicator.evidence_count).toBe(0)
    expect(indicator.source_refs).toEqual([])
  })

  it("rend un score null (pas 0) quand aucune preuve n'est disponible", () => {
    const indicator = computeAccountDynamic([], { now: NOW })

    expect(indicator.score).toBeNull()
    expect(indicator.evidence_count).toBe(0)
    expect(indicator.label).toContain("non mesurable")
    expect(validateDeterministicIndicator(indicator, "$.identity.dynamic").valid).toBe(true)
  })

  it("exclut les signaux hors de la fenêtre d'observation", () => {
    const indicator = computeAccountDynamic(
      [signal({ detected_at: "2025-01-01T00:00:00.000Z" }), signal()],
      { now: NOW },
    )

    expect(indicator.evidence_count).toBe(1)
  })

  it("déduplique les sources citées", () => {
    const indicator = computeAccountDynamic([signal(), signal(), signal()], { now: NOW })

    expect(indicator.evidence_count).toBe(3)
    expect(indicator.source_refs).toEqual([SOURCE_A])
  })

  it("borne le score à [0, 100] même avec des scores sources aberrants", () => {
    const indicator = computeAccountDynamic(
      Array.from({ length: 40 }, () => signal({ relevance_score: 9, urgency_score: 9 })),
      { now: NOW },
    )

    expect(indicator.score).toBeLessThanOrEqual(100)
    expect(indicator.score).toBeGreaterThanOrEqual(0)
  })

  it("pondère par la confiance sans exclure un signal peu fiable", () => {
    const confident = computeAccountDynamic([signal({ confidence_score: 1 })], { now: NOW })
    const doubtful = computeAccountDynamic([signal({ confidence_score: 0.2 })], { now: NOW })

    expect(doubtful.evidence_count).toBe(1)
    expect(doubtful.score!).toBeLessThan(confident.score!)
  })

  it("ne formule jamais le résultat en croissance ni en sentiment", () => {
    const forbidden = /croissance|d[ée]clin|positif|n[ée]gatif|favorable|bonne|mauvaise/i

    for (const score of [null, 0, 24, 25, 54, 55, 79, 80, 100]) {
      expect(accountDynamicLabel(score)).not.toMatch(forbidden)
    }
    // Un compte très actif « négativement » (PSE, contentieux) doit tout de même
    // remonter une forte activité DÉTECTÉE, jamais un jugement de valeur.
    const indicator = computeAccountDynamic(
      Array.from({ length: 12 }, () => signal({ relevance_score: 1, urgency_score: 1 })),
      { now: NOW },
    )
    expect(indicator.score).toBeGreaterThan(80)
    expect(indicator.label).toBe("Activité détectée forte")
  })
})

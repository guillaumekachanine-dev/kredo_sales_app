import { describe, expect, it } from "vitest"

import { JOURNAL_LIMIT, mergeRunJournalRows } from "../run-journal-merge"
import type { RunJournalRow } from "../automations-data"

function makeRun(overrides: Partial<RunJournalRow> & { id: string; createdAt: string }): RunJournalRow {
  return {
    runType: "intel-030-account-knowledge",
    runTypeLabel: "Connaissance compte",
    status: "queued",
    triggerSource: "ui",
    startedAt: null,
    completedAt: null,
    failedAt: null,
    errorMessage: null,
    companyId: null,
    companyName: null,
    primaryEntityType: "company",
    primaryEntityId: null,
    ownerName: null,
    ownerEmail: null,
    durationMs: null,
    costEstimate: null,
    hasPricingGap: false,
    hasTokensGap: false,
    config: null,
    ...overrides,
  }
}

describe("mergeRunJournalRows", () => {
  it("remplace un run déjà présent par sa version fraîche", () => {
    const current = [makeRun({ id: "a", createdAt: "2026-08-04T10:00:00Z", status: "running" })]
    const incoming = [
      makeRun({
        id: "a",
        createdAt: "2026-08-04T10:00:00Z",
        status: "succeeded",
        durationMs: 12_628,
        costEstimate: 0.0118,
      }),
    ]

    const merged = mergeRunJournalRows(current, incoming)

    expect(merged).toHaveLength(1)
    expect(merged[0].status).toBe("succeeded")
    // Durée et coût n'arrivent qu'avec le rechargement serveur : c'est
    // précisément ce que la fusion doit propager.
    expect(merged[0].durationMs).toBe(12_628)
    expect(merged[0].costEstimate).toBeCloseTo(0.0118)
  })

  it("insère un run inconnu en respectant l'ordre antichronologique", () => {
    const current = [
      makeRun({ id: "ancien", createdAt: "2026-08-04T09:00:00Z" }),
      makeRun({ id: "vieux", createdAt: "2026-08-03T09:00:00Z" }),
    ]
    const incoming = [makeRun({ id: "nouveau", createdAt: "2026-08-04T11:00:00Z" })]

    const merged = mergeRunJournalRows(current, incoming)

    expect(merged.map((row) => row.id)).toEqual(["nouveau", "ancien", "vieux"])
  })

  it("borne la liste à la fenêtre du journal", () => {
    const current = Array.from({ length: JOURNAL_LIMIT }, (_, index) =>
      makeRun({
        id: `run-${index}`,
        // index 0 = le plus récent
        createdAt: new Date(Date.UTC(2026, 7, 4, 12, 0, 0) - index * 60_000).toISOString(),
      })
    )
    const incoming = [makeRun({ id: "tout-neuf", createdAt: "2026-08-04T13:00:00Z" })]

    const merged = mergeRunJournalRows(current, incoming)

    expect(merged).toHaveLength(JOURNAL_LIMIT)
    expect(merged[0].id).toBe("tout-neuf")
    // Le plus ancien est sorti de la fenêtre, pas le nouveau.
    expect(merged.some((row) => row.id === `run-${JOURNAL_LIMIT - 1}`)).toBe(false)
  })

  it("ne duplique rien quand le même run est rechargé plusieurs fois", () => {
    const current = [makeRun({ id: "a", createdAt: "2026-08-04T10:00:00Z" })]
    const incoming = [
      makeRun({ id: "a", createdAt: "2026-08-04T10:00:00Z", status: "running" }),
      makeRun({ id: "a", createdAt: "2026-08-04T10:00:00Z", status: "succeeded" }),
    ]

    const merged = mergeRunJournalRows(current, incoming)

    expect(merged).toHaveLength(1)
    expect(merged[0].status).toBe("succeeded")
  })

  it("laisse la liste inchangée quand rien n'arrive", () => {
    const current = [makeRun({ id: "a", createdAt: "2026-08-04T10:00:00Z" })]

    expect(mergeRunJournalRows(current, [])).toEqual(current)
  })
})

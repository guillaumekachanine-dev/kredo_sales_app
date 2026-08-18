import { describe, expect, it } from "vitest"
import {
  applyCorpusBudget,
  TRUNCATION_MARKER,
  type CorpusCandidate,
} from "../domain/apply-corpus-budget"
import type { CorpusBudget, CorpusExclusion, CorpusItem } from "../domain/mission-contracts"

const BUDGET: CorpusBudget = { maxTotalChars: 1_000, maxCharsPerItem: 100, maxItems: 10 }

function item(overrides: Partial<CorpusItem> & { id: string }): CorpusItem {
  const content = overrides.content ?? "contenu"
  return {
    ref: { kind: "veille_period", table: "veille_articles", id: overrides.id },
    title: overrides.title ?? `Titre ${overrides.id}`,
    date: overrides.date ?? "2026-07-01",
    provenance: overrides.provenance ?? "veille_articles",
    content,
    chars: content.length,
    ...overrides,
    ...(overrides.ref ? { ref: overrides.ref } : {}),
  }
}

function candidate(id: string, weight: number, extra: Partial<CorpusItem> = {}): CorpusCandidate {
  return { item: item({ id, ...extra }), weight }
}

/** Invariant structurel : rien n'est perdu entre l'entrée et la trace. */
function expectTraceIsComplete(
  resolved: ReturnType<typeof applyCorpusBudget>,
  candidates: CorpusCandidate[],
  exclusions: CorpusExclusion[] = [],
) {
  expect(resolved.trace).toHaveLength(candidates.length + exclusions.length)
  expect(resolved.stats.requested).toBe(candidates.length + exclusions.length)
  expect(resolved.stats.kept + resolved.stats.dropped).toBe(resolved.stats.requested)
  expect(resolved.stats.kept).toBe(resolved.items.length)
  expect(resolved.trace.filter((entry) => entry.kept)).toHaveLength(resolved.items.length)
}

describe("applyCorpusBudget — cas limites", () => {
  it("rend un corpus vide sans rien inventer", () => {
    const resolved = applyCorpusBudget([], BUDGET)
    expect(resolved.items).toEqual([])
    expect(resolved.trace).toEqual([])
    expect(resolved.stats).toEqual({ requested: 0, kept: 0, dropped: 0, totalChars: 0 })
  })

  it("écarte et trace un unique élément plus gros que maxTotalChars", () => {
    // Après troncature à maxCharsPerItem l'élément fait 40 caractères ; le budget
    // total est volontairement plus petit encore.
    const candidates = [candidate("a", 50, { content: "x".repeat(500) })]
    const resolved = applyCorpusBudget(candidates, {
      maxTotalChars: 10,
      maxCharsPerItem: 40,
      maxItems: 10,
    })

    expect(resolved.items).toEqual([])
    expect(resolved.trace).toEqual([
      {
        ref: { kind: "veille_period", table: "veille_articles", id: "a" },
        title: "Titre a",
        provenance: "veille_articles",
        kept: false,
        reason: "budget_total",
      },
    ])
    expect(resolved.stats).toEqual({ requested: 1, kept: 0, dropped: 1, totalChars: 0 })
  })

  it("tronque en fin, pose un marqueur explicite et ne dépasse jamais maxCharsPerItem", () => {
    const candidates = [candidate("a", 50, { content: "y".repeat(500) })]
    const resolved = applyCorpusBudget(candidates, { ...BUDGET, maxCharsPerItem: 100 })

    const kept = resolved.items[0]
    expect(kept.content).toHaveLength(100)
    expect(kept.chars).toBe(100)
    expect(kept.content.endsWith(TRUNCATION_MARKER)).toBe(true)
    expect(kept.content.startsWith("y".repeat(10))).toBe(true)
    expect(resolved.trace[0]).toMatchObject({ kept: true, reason: "truncated" })
  })

  it("recalcule `chars` plutôt que de faire confiance au provider", () => {
    const wrong = item({ id: "a", content: "abcd" })
    wrong.chars = 9_999
    const resolved = applyCorpusBudget([{ item: wrong, weight: 10 }], BUDGET)
    expect(resolved.items[0].chars).toBe(4)
    expect(resolved.stats.totalChars).toBe(4)
  })
})

describe("applyCorpusBudget — ordre déterministe", () => {
  it("conserve d'abord le poids fort, puis la date la plus récente", () => {
    const candidates = [
      candidate("ancien-fort", 90, { date: "2026-01-01" }),
      candidate("recent-faible", 10, { date: "2026-12-01" }),
      candidate("recent-fort", 90, { date: "2026-06-01" }),
    ]
    const resolved = applyCorpusBudget(candidates, BUDGET)
    expect(resolved.items.map((entry) => entry.ref.id)).toEqual([
      "recent-fort",
      "ancien-fort",
      "recent-faible",
    ])
  })

  it("départage un ex aequo (même poids, même date) par table puis par id", () => {
    const candidates = [
      candidate("c", 50),
      candidate("a", 50),
      candidate("b", 50, {
        ref: { kind: "veille_period", table: "veille_digests", id: "b" },
      }),
    ]
    const resolved = applyCorpusBudget(candidates, BUDGET)
    // veille_articles < veille_digests, puis a < c.
    expect(resolved.items.map((entry) => entry.ref.id)).toEqual(["a", "c", "b"])
  })

  it("place les dates absentes APRÈS les dates connues, à poids égal", () => {
    const candidates = [
      candidate("sans-date", 50, { date: null }),
      candidate("vieille-date", 50, { date: "1999-01-01" }),
    ]
    const resolved = applyCorpusBudget(candidates, BUDGET)
    expect(resolved.items.map((entry) => entry.ref.id)).toEqual(["vieille-date", "sans-date"])
  })

  it("rend le même résultat quel que soit l'ordre d'arrivée des providers", () => {
    const candidates = [
      candidate("a", 50, { date: null }),
      candidate("b", 50, { date: "2026-05-01" }),
      candidate("c", 90, { date: null }),
      candidate("d", 10, { date: "2026-05-01" }),
    ]
    const forward = applyCorpusBudget(candidates, BUDGET)
    const backward = applyCorpusBudget([...candidates].reverse(), BUDGET)
    expect(backward.items.map((entry) => entry.ref.id)).toEqual(
      forward.items.map((entry) => entry.ref.id),
    )
    expect(backward.trace).toEqual(forward.trace)
  })
})

describe("applyCorpusBudget — bornes et traçabilité", () => {
  it("s'arrête à maxItems et trace le motif sur chaque écarté", () => {
    const candidates = [candidate("a", 30), candidate("b", 20), candidate("c", 10)]
    const resolved = applyCorpusBudget(candidates, { ...BUDGET, maxItems: 1 })

    expect(resolved.items.map((entry) => entry.ref.id)).toEqual(["a"])
    expect(resolved.trace.map((entry) => entry.reason)).toEqual([
      undefined,
      "budget_items",
      "budget_items",
    ])
    expectTraceIsComplete(resolved, candidates)
  })

  it("la priorité prime sur le remplissage : rien n'est repêché après le premier refus", () => {
    const candidates = [
      candidate("gros-prioritaire", 90, { content: "x".repeat(80) }),
      candidate("moyen", 50, { content: "y".repeat(80) }),
      candidate("minuscule", 10, { content: "z" }),
    ]
    const resolved = applyCorpusBudget(candidates, {
      maxTotalChars: 100,
      maxCharsPerItem: 100,
      maxItems: 10,
    })

    expect(resolved.items.map((entry) => entry.ref.id)).toEqual(["gros-prioritaire"])
    expect(resolved.trace.map((entry) => entry.reason)).toEqual([
      undefined,
      "budget_total",
      "budget_total",
    ])
  })

  it("ferme la trace avec les écarts décidés par les providers", () => {
    const candidates = [candidate("a", 50)]
    const exclusions: CorpusExclusion[] = [
      {
        ref: { kind: "intelligence_document", table: "intelligence_documents", id: "zzz" },
        title: "Document archivé",
        provenance: "intelligence_documents",
        reason: "archived",
      },
      {
        ref: { kind: "intelligence_document", table: "intelligence_documents", id: "aaa" },
        title: "Document introuvable",
        provenance: "intelligence_documents",
        reason: "not_found",
      },
    ]

    const resolved = applyCorpusBudget(candidates, BUDGET, exclusions)

    expect(resolved.trace.slice(1).map((entry) => entry.ref.id)).toEqual(["aaa", "zzz"])
    expect(resolved.trace.slice(1).map((entry) => entry.reason)).toEqual([
      "not_found",
      "archived",
    ])
    expectTraceIsComplete(resolved, candidates, exclusions)
  })

  it("ne laisse jamais aucun contenu fuiter dans la trace", () => {
    const candidates = [candidate("a", 50, { content: "SECRET-INDUSTRIEL" })]
    const resolved = applyCorpusBudget(candidates, BUDGET)
    expect(JSON.stringify(resolved.trace)).not.toContain("SECRET-INDUSTRIEL")
  })
})

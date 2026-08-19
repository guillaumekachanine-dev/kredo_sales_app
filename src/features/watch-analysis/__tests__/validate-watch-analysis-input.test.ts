import { describe, expect, it } from "vitest"
import { validateWatchAnalysisInput } from "../domain/watch-analysis-contracts"

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 2,
    triggerMode: "manual_custom",
    intention: "Comprendre l'impact réglementaire sur nos comptes cloud.",
    requestedAt: "2026-08-19T09:00:00.000Z",
    sources: [{ kind: "digest", digestId: "digest-1" }],
    ...overrides,
  }
}

describe("validateWatchAnalysisInput", () => {
  it("accepte un contrat valide avec 1 source", () => {
    const result = validateWatchAnalysisInput(baseInput())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sources).toHaveLength(1)
      expect(result.value.schemaVersion).toBe(2)
      expect(result.value.triggerMode).toBe("manual_custom")
    }
  })

  it("accepte 3 groupes de sources", () => {
    const result = validateWatchAnalysisInput(
      baseInput({
        sources: [
          { kind: "digest", digestId: "digest-1" },
          { kind: "account_signals", signalIds: ["signal-1"] },
          { kind: "intelligence_documents", documentIds: ["doc-1"] },
        ],
      }),
    )
    expect(result.ok).toBe(true)
  })

  it("refuse 0 groupe de sources", () => {
    const result = validateWatchAnalysisInput(baseInput({ sources: [] }))
    expect(result.ok).toBe(false)
  })

  it("refuse 4 groupes de sources", () => {
    const result = validateWatchAnalysisInput(
      baseInput({
        sources: [
          { kind: "digest", digestId: "digest-1" },
          { kind: "account_signals", signalIds: ["signal-1"] },
          { kind: "intelligence_documents", documentIds: ["doc-1"] },
          { kind: "knowledge_collection", collectionId: "collection-1" },
        ],
      }),
    )
    expect(result.ok).toBe(false)
  })

  it("refuse une intention vide", () => {
    const result = validateWatchAnalysisInput(baseInput({ intention: "   " }))
    expect(result.ok).toBe(false)
  })

  it("refuse un groupe account_signals vide", () => {
    const result = validateWatchAnalysisInput(baseInput({ sources: [{ kind: "account_signals", signalIds: [] }] }))
    expect(result.ok).toBe(false)
  })

  it("refuse un groupe digest avec articleIds vide", () => {
    const result = validateWatchAnalysisInput(
      baseInput({ sources: [{ kind: "digest", digestId: "digest-1", articleIds: [] }] }),
    )
    expect(result.ok).toBe(false)
  })

  it("refuse un groupe intelligence_documents vide", () => {
    const result = validateWatchAnalysisInput(
      baseInput({ sources: [{ kind: "intelligence_documents", documentIds: [] }] }),
    )
    expect(result.ok).toBe(false)
  })

  it("refuse un groupe knowledge_collection sans collectionId", () => {
    const result = validateWatchAnalysisInput(baseInput({ sources: [{ kind: "knowledge_collection", collectionId: "" }] }))
    expect(result.ok).toBe(false)
  })

  it("refuse schemaVersion !== 2", () => {
    const result = validateWatchAnalysisInput(baseInput({ schemaVersion: 1 }))
    expect(result.ok).toBe(false)
  })

  it('refuse triggerMode !== "manual_custom"', () => {
    const result = validateWatchAnalysisInput(baseInput({ triggerMode: "scheduled" }))
    expect(result.ok).toBe(false)
  })

  it("refuse un kind de source inconnu", () => {
    const result = validateWatchAnalysisInput(baseInput({ sources: [{ kind: "web_search" }] }))
    expect(result.ok).toBe(false)
  })

  it("déduplique les IDs à l'intérieur d'un même groupe", () => {
    const result = validateWatchAnalysisInput(
      baseInput({ sources: [{ kind: "account_signals", signalIds: ["signal-1", "signal-1", "signal-2"] }] }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const source = result.value.sources[0]
      expect(source.kind).toBe("account_signals")
      if (source.kind === "account_signals") {
        expect(source.signalIds.sort()).toEqual(["signal-1", "signal-2"])
      }
    }
  })

  it("refuse un ID vide au sein d'un groupe", () => {
    const result = validateWatchAnalysisInput(
      baseInput({ sources: [{ kind: "account_signals", signalIds: ["signal-1", "   "] }] }),
    )
    expect(result.ok).toBe(false)
  })
})

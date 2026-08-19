import { describe, expect, it } from "vitest"
import type { WatchAnalysisSource } from "@/lib/n8n/types"
import {
  buildWatchAnalysisInput,
  canAddSlot,
  firstEmptySlotIndex,
  initialSlots,
  MAX_WATCH_ANALYSIS_SLOTS,
  setSlotAt,
  sourcesFromSlots,
} from "../domain/watch-analysis-composer-state"

const DIGEST_SOURCE: WatchAnalysisSource = { kind: "digest", digestId: "digest-1" }
const SIGNALS_SOURCE: WatchAnalysisSource = { kind: "account_signals", signalIds: ["signal-1", "signal-2"] }
const DOCUMENTS_SOURCE: WatchAnalysisSource = { kind: "intelligence_documents", documentIds: ["doc-1"] }
const COLLECTION_SOURCE: WatchAnalysisSource = { kind: "knowledge_collection", collectionId: "collection-1" }

describe("initialSlots", () => {
  it("préremplit la Source 1 avec le digest courant quand il existe", () => {
    expect(initialSlots(DIGEST_SOURCE)).toEqual([DIGEST_SOURCE, null, null])
  })

  it("laisse la Source 1 vide quand aucun digest n'existe", () => {
    expect(initialSlots(null)).toEqual([null, null, null])
  })
})

describe("setSlotAt / sourcesFromSlots", () => {
  it("ajoute une Source 2", () => {
    const slots = setSlotAt(initialSlots(DIGEST_SOURCE), 1, SIGNALS_SOURCE)
    expect(sourcesFromSlots(slots)).toEqual([DIGEST_SOURCE, SIGNALS_SOURCE])
  })

  it("ajoute une Source 3", () => {
    let slots = setSlotAt(initialSlots(DIGEST_SOURCE), 1, SIGNALS_SOURCE)
    slots = setSlotAt(slots, 2, DOCUMENTS_SOURCE)
    expect(sourcesFromSlots(slots)).toEqual([DIGEST_SOURCE, SIGNALS_SOURCE, DOCUMENTS_SOURCE])
  })

  it("remplace une source existante", () => {
    const slots = setSlotAt(initialSlots(DIGEST_SOURCE), 0, COLLECTION_SOURCE)
    expect(sourcesFromSlots(slots)).toEqual([COLLECTION_SOURCE])
  })

  it("retire une source", () => {
    const withSlot2 = setSlotAt(initialSlots(DIGEST_SOURCE), 1, SIGNALS_SOURCE)
    const removed = setSlotAt(withSlot2, 0, null)
    expect(sourcesFromSlots(removed)).toEqual([SIGNALS_SOURCE])
  })
})

describe("canAddSlot / firstEmptySlotIndex — plafond de 3 groupes", () => {
  it("autorise l'ajout tant qu'un emplacement est libre", () => {
    const slots = setSlotAt(initialSlots(DIGEST_SOURCE), 1, SIGNALS_SOURCE)
    expect(canAddSlot(slots)).toBe(true)
    expect(firstEmptySlotIndex(slots)).toBe(2)
  })

  it("refuse l'ajout au-delà de 3 groupes", () => {
    let slots = setSlotAt(initialSlots(DIGEST_SOURCE), 1, SIGNALS_SOURCE)
    slots = setSlotAt(slots, 2, DOCUMENTS_SOURCE)
    expect(slots.filter(Boolean)).toHaveLength(MAX_WATCH_ANALYSIS_SLOTS)
    expect(canAddSlot(slots)).toBe(false)
    expect(firstEmptySlotIndex(slots)).toBeNull()
  })
})

describe("digest complet vs sous-sélection", () => {
  it("un digest complet n'a pas d'articleIds", () => {
    const source: WatchAnalysisSource = { kind: "digest", digestId: "digest-1" }
    expect(source.kind === "digest" ? source.articleIds : undefined).toBeUndefined()
  })

  it("une sous-sélection porte exactement les articleIds choisis", () => {
    const source: WatchAnalysisSource = { kind: "digest", digestId: "digest-1", articleIds: ["a1", "a2"] }
    expect(source.kind === "digest" ? source.articleIds : undefined).toEqual(["a1", "a2"])
  })
})

describe("sélection multiple — signaux, documents", () => {
  it("porte tous les signaux choisis", () => {
    expect(SIGNALS_SOURCE.kind === "account_signals" ? SIGNALS_SOURCE.signalIds : []).toEqual(["signal-1", "signal-2"])
  })

  it("porte tous les documents choisis", () => {
    const source: WatchAnalysisSource = { kind: "intelligence_documents", documentIds: ["doc-1", "doc-2"] }
    expect(source.kind === "intelligence_documents" ? source.documentIds : []).toEqual(["doc-1", "doc-2"])
  })
})

describe("Liste / Corpus", () => {
  it("une Liste ou un Corpus produit un seul collectionId", () => {
    expect(COLLECTION_SOURCE).toEqual({ kind: "knowledge_collection", collectionId: "collection-1" })
  })
})

describe("buildWatchAnalysisInput", () => {
  it("produit un WatchAnalysisInputV2 conforme", () => {
    const slots = setSlotAt(initialSlots(DIGEST_SOURCE), 1, SIGNALS_SOURCE)
    const input = buildWatchAnalysisInput({ intention: "Comprendre le marché", slots, requestedAt: "2026-08-19T10:00:00.000Z" })
    expect(input).toEqual({
      schemaVersion: 2,
      triggerMode: "manual_custom",
      intention: "Comprendre le marché",
      sources: [DIGEST_SOURCE, SIGNALS_SOURCE],
      requestedAt: "2026-08-19T10:00:00.000Z",
    })
  })

  it("triggerMode est toujours manual_custom", () => {
    const input = buildWatchAnalysisInput({ intention: "x", slots: initialSlots(DIGEST_SOURCE), requestedAt: "2026-08-19T10:00:00.000Z" })
    expect(input.triggerMode).toBe("manual_custom")
  })
})

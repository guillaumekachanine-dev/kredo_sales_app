import { describe, expect, it } from "vitest"
import {
  buildKnowledgeSynthesisOverview,
  type KnowledgeSynthesisRawData,
} from "../domain/knowledge-synthesis-overview"

describe("knowledge-synthesis-overview", () => {
  const fixedNow = new Date("2026-08-15T12:00:00Z")

  const sampleRawData: KnowledgeSynthesisRawData = {
    documents: [
      { id: "doc-1", document_type: "communication", created_at: "2026-08-10T10:00:00Z" },
      { id: "doc-2", document_type: "communication", created_at: "2026-08-01T10:00:00Z" },
      { id: "doc-3", document_type: "client_summary", created_at: "2026-07-25T10:00:00Z" },
      { id: "doc-4", document_type: "commercial_pitch", created_at: "2026-06-10T10:00:00Z" },
      { id: "doc-5", document_type: "communication", created_at: "2026-02-10T10:00:00Z" },
    ],
    collectionItems: [
      { collection_id: "col-1", content_type: "intelligence_document", content_id: "doc-1" },
      { collection_id: "col-1", content_type: "intelligence_document", content_id: "doc-2" },
      { collection_id: "col-2", content_type: "intelligence_document", content_id: "doc-3" },
    ],
    collections: [
      { id: "col-1", name: "Cas d'usage IA", kind: "list", item_type: "intelligence_document" },
      { id: "col-2", name: "Gouvernance", kind: "list", item_type: "intelligence_document" },
      { id: "col-3", name: "Corpus A", kind: "corpus", item_type: null },
    ],
  }

  it("calculates total documents, unique types, and recent 30 days count", () => {
    const overview = buildKnowledgeSynthesisOverview(sampleRawData, fixedNow)

    expect(overview.totalDocuments).toBe(5)
    expect(overview.uniqueTypeCount).toBe(3)
    // doc-1, doc-2, doc-3 are within 30 days of 2026-08-15
    expect(overview.recent30DaysCount).toBe(3)
  })

  it("calculates type distribution with percentages sorted by count", () => {
    const overview = buildKnowledgeSynthesisOverview(sampleRawData, fixedNow)

    expect(overview.typeDistribution.length).toBe(3)
    const topType = overview.typeDistribution[0]!
    expect(topType.typeKey).toBe("communication")
    expect(topType.count).toBe(3)
    expect(topType.percentage).toBe(60) // 3 / 5 = 60%
  })

  it("calculates document classification percentage and top lists", () => {
    const overview = buildKnowledgeSynthesisOverview(sampleRawData, fixedNow)

    // doc-1, doc-2, doc-3 are classified -> 3 / 5 = 60%
    expect(overview.classifiedDocCount).toBe(3)
    expect(overview.classifiedPercentage).toBe(60)

    expect(overview.topLists).toHaveLength(2)
    expect(overview.topLists[0]!.name).toBe("Cas d'usage IA")
    expect(overview.topLists[0]!.count).toBe(2)
  })

  it("generates exactly 3 deterministic insights", () => {
    const overview = buildKnowledgeSynthesisOverview(sampleRawData, fixedNow)

    expect(overview.insights).toHaveLength(3)
    expect(overview.insights[0]).toContain("Le type «")
    expect(overview.insights[2]).toContain("60% des documents")
  })
})

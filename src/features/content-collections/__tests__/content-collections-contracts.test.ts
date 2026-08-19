import { describe, expect, it } from "vitest"
import {
  groupResolvedItemsByType,
  isAddableContentType,
  isCollectionContentType,
  isEligibleForKnowledgeListReference,
  sortResolvedItems,
  validateCollectionName,
  type ResolvedCollectionItem,
} from "../domain/content-collections-contracts"

describe("content-collections domain contracts", () => {
  it("validates collection names properly", () => {
    expect(validateCollectionName("  ")).toEqual({
      ok: false,
      error: "Le nom de la liste est obligatoire.",
    })

    expect(validateCollectionName("Cas d'usage IA")).toEqual({
      ok: true,
      value: "Cas d'usage IA",
    })

    const longName = "A".repeat(121)
    expect(validateCollectionName(longName).ok).toBe(false)
  })

  it("checks content types correctly", () => {
    expect(isCollectionContentType("veille_article")).toBe(true)
    expect(isCollectionContentType("intelligence_document")).toBe(true)
    expect(isCollectionContentType("knowledge_list")).toBe(true)
    expect(isCollectionContentType("unknown_type")).toBe(false)

    expect(isAddableContentType("veille_article")).toBe(true)
    expect(isAddableContentType("intelligence_document")).toBe(true)
    expect(isAddableContentType("knowledge_list")).toBe(false)
  })

  it("restricts corpus references properly", () => {
    expect(isEligibleForKnowledgeListReference({ kind: "list" })).toBe(true)
    expect(isEligibleForKnowledgeListReference({ kind: "corpus" })).toBe(false)
  })

  it("sorts resolved items placing positioned items first", () => {
    const items: ResolvedCollectionItem[] = [
      {
        membershipId: "m1",
        contentType: "veille_article",
        contentId: "a1",
        addedAt: "2026-08-01",
        position: null,
        title: "Article 1",
        typeLabel: "Article de veille",
        date: "2026-08-01",
        preview: "Preview 1",
        url: "/veille",
      },
      {
        membershipId: "m2",
        contentType: "veille_article",
        contentId: "a2",
        addedAt: "2026-08-02",
        position: 1,
        title: "Article 2",
        typeLabel: "Article de veille",
        date: "2026-08-02",
        preview: "Preview 2",
        url: "/veille",
      },
      {
        membershipId: "m3",
        contentType: "intelligence_document",
        contentId: "d1",
        addedAt: "2026-08-03",
        position: 0,
        title: "Doc 1",
        typeLabel: "Document",
        date: "2026-08-03",
        preview: "Preview Doc",
        url: "/reports",
      },
    ]

    const sorted = sortResolvedItems(items)
    expect(sorted.map((i) => i.membershipId)).toEqual(["m3", "m2", "m1"])
  })

  it("groups items by content type in order of appearance", () => {
    const items: ResolvedCollectionItem[] = [
      {
        membershipId: "m1",
        contentType: "veille_article",
        contentId: "a1",
        addedAt: "2026-08-01",
        position: null,
        title: "Article 1",
        typeLabel: "Article de veille",
        date: "2026-08-01",
        preview: null,
        url: "/veille",
      },
      {
        membershipId: "m2",
        contentType: "intelligence_document",
        contentId: "d1",
        addedAt: "2026-08-02",
        position: null,
        title: "Doc 1",
        typeLabel: "Document",
        date: "2026-08-02",
        preview: null,
        url: "/reports",
      },
    ]

    const grouped = groupResolvedItemsByType(items)
    expect(grouped).toHaveLength(2)
    expect(grouped[0]?.contentType).toBe("veille_article")
    expect(grouped[1]?.contentType).toBe("intelligence_document")
  })
})

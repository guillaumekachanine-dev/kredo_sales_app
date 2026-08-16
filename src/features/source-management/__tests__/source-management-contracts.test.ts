import { describe, expect, it } from "vitest"
import {
  buildManualSourceKey,
  deriveCollectionMode,
  isKredoSourceCategory,
  normalizeHostname,
  validateManualSourceInput,
  KREDO_SOURCE_CATEGORY_LABELS,
  KREDO_SOURCE_CATEGORY_ORDER,
} from "../domain/source-management-contracts"

describe("normalizeHostname", () => {
  it("normalizes protocol, www prefix, trailing slash and case", () => {
    expect(normalizeHostname("https://www.LeMagIT.fr/")).toBe("lemagit.fr")
    expect(normalizeHostname("http://channelnews.fr")).toBe("channelnews.fr")
    expect(normalizeHostname("usine-digitale.fr")).toBe("usine-digitale.fr")
    expect(normalizeHostname("www.finextra.com")).toBe("finextra.com")
  })

  it("returns null on invalid input", () => {
    expect(normalizeHostname("")).toBeNull()
    expect(normalizeHostname("   ")).toBeNull()
    expect(normalizeHostname("not a url at all !!")).toBeNull()
  })

  it("treats equivalent URLs as the same domain (deduplication key)", () => {
    expect(normalizeHostname("https://www.example.com/path")).toBe(normalizeHostname("http://example.com"))
  })
})

describe("deriveCollectionMode", () => {
  it("is rss when a collection URL exists, site_search otherwise", () => {
    expect(deriveCollectionMode("https://example.com/rss")).toBe("rss")
    expect(deriveCollectionMode(null)).toBe("site_search")
    expect(deriveCollectionMode("")).toBe("site_search")
    expect(deriveCollectionMode("   ")).toBe("site_search")
  })
})

describe("buildManualSourceKey", () => {
  it("is deterministic and derived from the domain, not the name", () => {
    expect(buildManualSourceKey("example.com")).toBe("manual:example.com")
    expect(buildManualSourceKey("example.com")).toBe(buildManualSourceKey("example.com"))
  })
})

describe("isKredoSourceCategory / labels", () => {
  it("recognizes exactly the six canonical categories, in the documented order", () => {
    expect(KREDO_SOURCE_CATEGORY_ORDER).toEqual([
      "marche-esn",
      "ia-appliquee",
      "frontier",
      "strategie",
      "reglementaire",
      "vertical",
    ])
    for (const category of KREDO_SOURCE_CATEGORY_ORDER) {
      expect(isKredoSourceCategory(category)).toBe(true)
      expect(KREDO_SOURCE_CATEGORY_LABELS[category]).toBeTruthy()
    }
    expect(isKredoSourceCategory("invalid-category")).toBe(false)
    expect(isKredoSourceCategory(null)).toBe(false)
  })
})

describe("validateManualSourceInput", () => {
  const base = { name: "Le Monde Informatique", url: "lemondeinformatique.fr", family: "Marché IT / ESN France", kredoCategory: "marche-esn" as const }

  it("accepts a valid input without RSS (site_search path)", () => {
    const result = validateManualSourceInput(base)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.collectionUrl).toBeNull()
      expect(result.data.searchDomain).toBe("lemondeinformatique.fr")
    }
  })

  it("accepts a valid input with a normalized RSS URL", () => {
    const result = validateManualSourceInput({ ...base, rssUrl: "https://lemondeinformatique.fr/rss" })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.collectionUrl).toBe("https://lemondeinformatique.fr/rss")
  })

  it("rejects a missing name", () => {
    expect(validateManualSourceInput({ ...base, name: "  " })).toMatchObject({ ok: false })
  })

  it("rejects an invalid site URL", () => {
    expect(validateManualSourceInput({ ...base, url: "!!!" })).toMatchObject({ ok: false })
  })

  it("rejects a missing family", () => {
    expect(validateManualSourceInput({ ...base, family: "" })).toMatchObject({ ok: false })
  })

  it("rejects a missing or invalid KREDO category", () => {
    expect(validateManualSourceInput({ ...base, kredoCategory: "" })).toMatchObject({ ok: false })
  })

  it("rejects an invalid RSS URL when provided", () => {
    expect(validateManualSourceInput({ ...base, rssUrl: "not a url" })).toMatchObject({ ok: false })
  })
})

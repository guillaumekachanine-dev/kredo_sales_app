import { describe, expect, it } from "vitest"
import {
  formatConsultedAt,
  resolveTerrainSource,
  resolveTerrainSources,
} from "../terrain-source-model"
import type { ResolvedSource } from "../../shared/SourceChip"

describe("terrain-source-model Presenter & Resolver", () => {
  const mockResolution: Record<number, ResolvedSource> = {
    7: {
      srcId: 7,
      publisher: "AFISO",
      tier: 1,
      attests: "Structure de marché et dynamiques réglementaires IFRA",
      consultedAt: "2026-08-15",
      url: "https://example.com/afiso",
    },
    13: {
      srcId: 13,
      publisher: "Cosmetics Europe",
      tier: 2,
      attests: "Rapport annuel parfumerie et cosmétique",
      consultedAt: null,
      url: null,
    },
    17: {
      srcId: 17,
      publisher: "   ",
      tier: null,
      attests: "Données douanières et flux B2B",
      consultedAt: "invalid-date",
      url: "https://example.com/douanes",
    },
  }

  describe("resolveTerrainSource", () => {
    it("resolves a complete source correctly preserving publisher, tier, attests, consultedAt, and url", () => {
      const resolved = resolveTerrainSource(7, mockResolution)

      expect(resolved).toEqual({
        sourceId: 7,
        publisher: "AFISO",
        tier: "Tier T1",
        attests: "Structure de marché et dynamiques réglementaires IFRA",
        consultedAt: "2026-08-15",
        url: "https://example.com/afiso",
        isResolved: true,
      })
    })

    it("handles source with null URL and null consultedAt cleanly", () => {
      const resolved = resolveTerrainSource(13, mockResolution)

      expect(resolved).toEqual({
        sourceId: 13,
        publisher: "Cosmetics Europe",
        tier: "Tier T2",
        attests: "Rapport annuel parfumerie et cosmétique",
        consultedAt: null,
        url: null,
        isResolved: true,
      })
    })

    it("trims publisher and ignores whitespace-only publisher", () => {
      const resolved = resolveTerrainSource(17, mockResolution)

      expect(resolved.publisher).toBeNull()
      expect(resolved.tier).toBeNull()
      expect(resolved.attests).toBe("Données douanières et flux B2B")
      expect(resolved.url).toBe("https://example.com/douanes")
      expect(resolved.isResolved).toBe(true)
    })

    it("returns unresolved structure when sourceId is not present in resolution dictionary", () => {
      const resolved = resolveTerrainSource(99, mockResolution)

      expect(resolved).toEqual({
        sourceId: 99,
        publisher: null,
        tier: null,
        attests: null,
        consultedAt: null,
        url: null,
        isResolved: false,
      })
    })

    it("handles null or undefined resolution dictionary gracefully", () => {
      const resolvedNull = resolveTerrainSource(7, null)
      const resolvedUndefined = resolveTerrainSource(7, undefined)

      expect(resolvedNull.isResolved).toBe(false)
      expect(resolvedUndefined.isResolved).toBe(false)
      expect(resolvedNull.sourceId).toBe(7)
    })

    it("does not mutate the sourceResolution object", () => {
      const snapshot = JSON.stringify(mockResolution)
      resolveTerrainSource(7, mockResolution)
      expect(JSON.stringify(mockResolution)).toBe(snapshot)
    })
  })

  describe("resolveTerrainSources", () => {
    it("resolves a list of source IDs preserving exact input order", () => {
      const list = resolveTerrainSources([17, 7, 99, 13], mockResolution)

      expect(list).toHaveLength(4)
      expect(list[0]?.sourceId).toBe(17)
      expect(list[1]?.sourceId).toBe(7)
      expect(list[2]?.sourceId).toBe(99)
      expect(list[2]?.isResolved).toBe(false)
      expect(list[3]?.sourceId).toBe(13)
    })

    it("returns empty array for invalid or empty sourceIds list", () => {
      expect(resolveTerrainSources([], mockResolution)).toEqual([])
      expect(resolveTerrainSources(null as unknown as number[], mockResolution)).toEqual([])
    })
  })

  describe("formatConsultedAt", () => {
    it("formats valid ISO date strings in French localized format", () => {
      const formatted = formatConsultedAt("2026-08-15")
      expect(formatted).toContain("2026")
      expect(formatted).toContain("août")
    })

    it("returns explicit fallback message for null, empty or invalid date strings", () => {
      expect(formatConsultedAt(null)).toBe("Date de consultation non disponible")
      expect(formatConsultedAt("")).toBe("Date de consultation non disponible")
      expect(formatConsultedAt("invalid-date")).toBe("Date de consultation non disponible")
    })
  })
})

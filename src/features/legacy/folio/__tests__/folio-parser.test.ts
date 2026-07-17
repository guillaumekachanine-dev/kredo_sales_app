import { describe, it, expect } from "vitest"
import { asText, asTextList, buildSyntheseBlocks, parseNarrativeBlocks } from "../utils"

describe("Folio Data Parser Utilities", () => {
  describe("asText", () => {
    it("should return parsed string for valid input", () => {
      expect(asText("Hello")).toBe("Hello")
      expect(asText(123)).toBe("123")
      expect(asText(true)).toBe("Oui")
      expect(asText(false)).toBe("Non")
    })

    it("should return null for empty or placeholder strings", () => {
      expect(asText(null)).toBeNull()
      expect(asText(undefined)).toBeNull()
      expect(asText("Non trouvé")).toBeNull()
      expect(asText("N/A")).toBeNull()
      expect(asText("  ")).toBeNull()
    })
  })

  describe("asTextList", () => {
    it("should filter out non-meaningful text values", () => {
      const list = ["Valid text", "Non trouvé", "Other valid", "N/A", null]
      expect(asTextList(list)).toEqual(["Valid text", "Other valid"])
    })

    it("should return empty array for non-array inputs", () => {
      expect(asTextList(null)).toEqual([])
      expect(asTextList("not an array")).toEqual([])
    })
  })

  describe("buildSyntheseBlocks", () => {
    it("should split raw text into paragraphs", () => {
      const raw = "Paragraph 1\n\nParagraph 2"
      const result = buildSyntheseBlocks(raw)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ type: "paragraph", text: "Paragraph 1" })
      expect(result[1]).toEqual({ type: "paragraph", text: "Paragraph 2" })
    })

    it("should parse list format lines", () => {
      const raw = "- Item 1\n- Item 2\n- Item 3"
      const result = buildSyntheseBlocks(raw)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        type: "list",
        items: ["Item 1", "Item 2", "Item 3"],
      })
    })
  })

  describe("parseNarrativeBlocks", () => {
    it("should parse narrative chunks into paragraphs or lists", () => {
      const raw = "Narrative text\n\n• Point 1\n• Point 2"
      const result = parseNarrativeBlocks(raw)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ type: "paragraph", content: "Narrative text" })
      expect(result[1]).toEqual({ type: "list", content: ["Point 1", "Point 2"] })
    })
  })
})

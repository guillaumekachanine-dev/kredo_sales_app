export function isMeaningfulText(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 && normalized !== "non trouvé" && normalized !== "n/a" && normalized !== "na"
}

export function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return isMeaningfulText(value) ? value.trim() : null
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("fr-FR") : null
  if (typeof value === "boolean") return value ? "Oui" : "Non"
  return null
}

export function asTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => asText(entry))
    .filter((entry): entry is string => Boolean(entry))
}

export type SyntheseBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }

export const buildSyntheseBlocks = (rawText: string): SyntheseBlock[] => {
  const normalized = rawText.replace(/\r/g, "").trim()
  if (!normalized) return []
  const blocks: SyntheseBlock[] = []
  const paragraphs = normalized.split(/\n{2,}/)
  paragraphs.forEach((paragraph) => {
    const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) return
    const bulletLines = lines.filter((line) => /^[-•–]\s*/.test(line))
    if (bulletLines.length === lines.length && bulletLines.length > 0) {
      blocks.push({
        type: "list",
        items: bulletLines.map((line) => line.replace(/^[-•–]\s*/, "").trim()).filter(Boolean),
      })
      return
    }
    if (lines.length === 1) {
      const line = lines[0]
      const bulletSplit = line.split(/\s*[•–]\s*/).filter(Boolean)
      if (bulletSplit.length > 1) {
        blocks.push({ type: "list", items: bulletSplit.map((item) => item.trim()) })
        return
      }
      const dashSplit = line.split(/\s-\s/).filter(Boolean)
      if (dashSplit.length > 1) {
        blocks.push({ type: "list", items: dashSplit.map((item) => item.trim()) })
        return
      }
      const semiSplit = line.split(/\s*;\s*/).filter(Boolean)
      if (semiSplit.length > 2) {
        blocks.push({ type: "list", items: semiSplit.map((item) => item.trim()) })
        return
      }
    }
    blocks.push({ type: "paragraph", text: lines.join(" ") })
  })
  return blocks
}

export function parseNarrativeBlocks(rawText: string): Array<{ type: "paragraph" | "list"; content: string | string[] }> {
  const normalized = rawText.replace(/\r/g, "").trim()
  if (!normalized) return []

  const chunks = normalized.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean)
  return chunks.map((chunk) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) return { type: "paragraph" as const, content: "" }

    const bulletLines = lines
      .map((line) => line.replace(/^[-•–]\s*/, "").trim())
      .filter((line, index) => /^[-•–]/.test(lines[index]) && isMeaningfulText(line))

    if (bulletLines.length === lines.length && bulletLines.length > 0) {
      return { type: "list" as const, content: bulletLines }
    }

    return { type: "paragraph" as const, content: lines.join(" ") }
  }).filter((block) => {
    if (block.type === "paragraph") {
      return isMeaningfulText(block.content as string)
    }
    return (block.content as string[]).length > 0
  })
}

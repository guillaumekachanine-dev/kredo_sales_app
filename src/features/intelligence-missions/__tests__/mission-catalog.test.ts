import { describe, expect, it } from "vitest"
import { MISSION_CATALOG } from "../domain/mission-catalog"
import type { MissionSpec } from "../domain/mission-contracts"

describe("MISSION_CATALOG", () => {
  it("est type comme un catalogue de MissionSpec", () => {
    const typedCatalog: readonly MissionSpec[] = MISSION_CATALOG

    expect(typedCatalog).toHaveLength(1)
  })

  it("contient des slugs uniques", () => {
    const slugs = MISSION_CATALOG.map((mission) => mission.slug)

    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("contient uniquement le preset veille-analyse-mensuelle", () => {
    expect(MISSION_CATALOG).toHaveLength(1)
    expect(MISSION_CATALOG[0]?.slug).toBe("veille-analyse-mensuelle")
  })

  it("porte un preset complet sans configuration de type de sortie", () => {
    const preset = MISSION_CATALOG[0]

    expect(preset).toBeDefined()
    if (!preset) return

    expect(preset.version).toBeGreaterThan(0)
    expect(preset.label.trim()).not.toBe("")
    expect(preset.description.trim()).not.toBe("")
    expect(preset.intent.preset.trim()).not.toBe("")
    expect(preset.promptTemplate.trim()).not.toBe("")
    expect(preset.constraints.rules.length).toBeGreaterThan(0)
    expect(preset.corpus.budget.maxTotalChars).toBeGreaterThan(0)
    expect(preset.corpus.budget.maxCharsPerItem).toBeGreaterThan(0)
    expect(preset.corpus.budget.maxItems).toBeGreaterThan(0)
    expect(preset.model.provider).toBe("anthropic")
    expect(preset.model.model.trim()).not.toBe("")
    expect(preset.model.maxOutputTokens).toBeGreaterThan(0)

    expect(preset).not.toHaveProperty("resultType")
    expect(preset).not.toHaveProperty("outputSchema")
    expect(preset).not.toHaveProperty("qaRules")
  })
})

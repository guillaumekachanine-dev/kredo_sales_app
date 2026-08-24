import { describe, expect, it } from "vitest"
import { MISSION_CATALOG } from "../domain/mission-catalog"
import type { MissionSpec } from "../domain/mission-contracts"

describe("MISSION_CATALOG", () => {
  it("est type comme un catalogue de MissionSpec", () => {
    const typedCatalog: readonly MissionSpec[] = MISSION_CATALOG

    expect(typedCatalog).toHaveLength(3)
  })

  it("ne declare jamais un corpus vide : base ou requiredAtLaunch est renseigne", () => {
    for (const mission of MISSION_CATALOG) {
      expect(
        mission.corpus.base.length + mission.corpus.requiredAtLaunch.length,
      ).toBeGreaterThan(0)
    }
  })

  it("n'autorise un ajout utilisateur que s'il liste des kinds", () => {
    for (const mission of MISSION_CATALOG) {
      if (mission.corpus.userAddition.allowed) {
        expect(mission.corpus.userAddition.kinds.length).toBeGreaterThan(0)
      } else {
        expect(mission.corpus.userAddition.kinds).toHaveLength(0)
      }
    }
  })

  it("contient des slugs uniques", () => {
    const slugs = MISSION_CATALOG.map((mission) => mission.slug)

    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("contient les presets veille-analyse-mensuelle, rentabilite-portefeuille et activation-portefeuille dans cet ordre", () => {
    expect(MISSION_CATALOG).toHaveLength(3)
    expect(MISSION_CATALOG[0]?.slug).toBe("veille-analyse-mensuelle")
    expect(MISSION_CATALOG[1]?.slug).toBe("rentabilite-portefeuille")
    expect(MISSION_CATALOG[2]?.slug).toBe("activation-portefeuille")
  })

  it("porte un preset complet sans configuration de type de sortie", () => {
    const preset = MISSION_CATALOG[0]

    expect(preset).toBeDefined()
    if (!preset) return

    expect(preset.version).toBe(3)
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
    expect(preset.model.maxOutputTokens).toBe(8_000)

    expect(preset.corpus.requiredAtLaunch.length + preset.corpus.base.length).toBeGreaterThan(
      0,
    )

    expect(preset).not.toHaveProperty("resultType")
    expect(preset).not.toHaveProperty("outputSchema")
    expect(preset).not.toHaveProperty("qaRules")
  })

  it("impose les regles de concision et de selection dans le promptTemplate de veille-analyse-mensuelle", () => {
    const preset = MISSION_CATALOG[0]
    expect(preset).toBeDefined()
    if (!preset) return

    expect(preset.promptTemplate).toContain("executiveSummary (maximum 8 phrases)")
    expect(preset.promptTemplate).toContain("findings (maximum 8 constats au total)")
    expect(preset.promptTemplate).toContain("chaque statement de constat fait maximum 3 phrases")
    expect(preset.promptTemplate).toContain("recommendations les actions prioritaires découlant des constats (maximum 5 recommandations)")
    expect(preset.promptTemplate).toContain("chaque rationale de recommandation fait maximum 3 phrases")
    expect(preset.promptTemplate).toContain("sans jamais répéter plusieurs fois la même source")
    expect(preset.promptTemplate).toContain("Le rapport doit rester synthétique. Ne cherche pas à restituer chaque élément du corpus. Sélectionne uniquement les constats et recommandations les plus significatifs.")
    expect(preset.promptTemplate).toContain("Privilégie les constats les plus structurants plutôt que l'exhaustivité.")
  })

  it("porte un preset complet sans configuration de type de sortie pour rentabilite-portefeuille", () => {
    const preset = MISSION_CATALOG[1]

    expect(preset).toBeDefined()
    if (!preset) return

    expect(preset.version).toBe(1)
    expect(preset.slug).toBe("rentabilite-portefeuille")
    expect(preset.label.trim()).not.toBe("")
    expect(preset.description.trim()).not.toBe("")
    expect(preset.intent.preset.trim()).not.toBe("")
    expect(preset.promptTemplate.trim()).not.toBe("")
    expect(preset.constraints.rules.length).toBeGreaterThan(0)
    expect(preset.corpus.budget.maxTotalChars).toBe(120_000)
    expect(preset.corpus.budget.maxCharsPerItem).toBe(1_200)
    expect(preset.corpus.budget.maxItems).toBe(250)
    expect(preset.corpus.requiredAtLaunch).toEqual(["delivery_period"])
    expect(preset.corpus.base).toEqual([])
    expect(preset.corpus.userAddition.allowed).toBe(false)
    expect(preset.corpus.userAddition.kinds).toEqual([])
    expect(preset.model.provider).toBe("anthropic")
    expect(preset.model.model.trim()).not.toBe("")
    expect(preset.model.maxOutputTokens).toBe(8_000)

    expect(preset.corpus.requiredAtLaunch.length + preset.corpus.base.length).toBeGreaterThan(
      0,
    )

    expect(preset).not.toHaveProperty("resultType")
    expect(preset).not.toHaveProperty("outputSchema")
    expect(preset).not.toHaveProperty("qaRules")
  })

  it("impose la règle anti-recalcul dans les contraintes de rentabilite-portefeuille", () => {
    const preset = MISSION_CATALOG[1]
    expect(preset).toBeDefined()
    if (!preset) return

    const hasAntiRecalculRule = preset.constraints.rules.some((rule) =>
      rule.includes("Ne recalcule aucun ratio"),
    )
    expect(hasAntiRecalculRule).toBe(true)
    expect(preset.constraints.rules).toContain(
      "Ne recalcule aucun ratio ni aucun écart. Tous les chiffres et toutes les variations nécessaires sont déjà fournis, pré-calculés, dans le corpus. Ne produis aucun chiffre absent du corpus.",
    )
  })

  it("exige l'imputation nommée aux missions/clients/consultants dans le promptTemplate de rentabilite-portefeuille", () => {
    const preset = MISSION_CATALOG[1]
    expect(preset).toBeDefined()
    if (!preset) return

    expect(preset.promptTemplate).toContain(
      "chaque constat dans findings doit obligatoirement être imputé à une mission, un client ou un consultant nommé",
    )
    expect(preset.promptTemplate).toContain(
      "executiveSummary (maximum 8 phrases) en tranchant explicitement",
    )
    expect(preset.promptTemplate).toContain("findings (maximum 8 constats au total)")
    expect(preset.promptTemplate).toContain(
      "recommendations les actions prioritaires découlant des constats (maximum 5 recommandations)",
    )
    expect(preset.promptTemplate).toContain(
      "en renseignant systématiquement l'horizon (immediate, 30_days ou quarter)",
    )
    expect(preset.promptTemplate).toContain(
      "Le rapport doit rester synthétique. Ne cherche pas à restituer chaque élément du corpus. Sélectionne uniquement les constats et recommandations les plus significatifs.",
    )
    expect(preset.promptTemplate).toContain(
      "Privilégie les constats les plus structurants plutôt que l'exhaustivité.",
    )
  })

  it("porte un preset complet sans configuration de type de sortie pour activation-portefeuille", () => {
    const preset = MISSION_CATALOG[2]

    expect(preset).toBeDefined()
    if (!preset) return

    expect(preset.version).toBe(1)
    expect(preset.slug).toBe("activation-portefeuille")
    expect(preset.label.trim()).not.toBe("")
    expect(preset.description.trim()).not.toBe("")
    expect(preset.intent.preset.trim()).not.toBe("")
    expect(preset.promptTemplate.trim()).not.toBe("")
    expect(preset.constraints.rules.length).toBeGreaterThan(0)
    expect(preset.corpus.budget.maxTotalChars).toBe(120_000)
    expect(preset.corpus.budget.maxCharsPerItem).toBe(2_000)
    expect(preset.corpus.budget.maxItems).toBe(150)
    expect(preset.corpus.requiredAtLaunch).toEqual(["prospection_window"])
    expect(preset.corpus.base).toEqual([])
    expect(preset.corpus.userAddition.allowed).toBe(false)
    expect(preset.corpus.userAddition.kinds).toEqual([])
    expect(preset.model.provider).toBe("anthropic")
    expect(preset.model.model.trim()).not.toBe("")
    expect(preset.model.maxOutputTokens).toBe(16_000)

    expect(preset).not.toHaveProperty("resultType")
    expect(preset).not.toHaveProperty("outputSchema")
    expect(preset).not.toHaveProperty("qaRules")
  })

  it("impose la règle anti-agrégation de score dans les contraintes de activation-portefeuille", () => {
    const preset = MISSION_CATALOG[2]
    expect(preset).toBeDefined()
    if (!preset) return

    const hasAntiAggregationRule = preset.constraints.rules.some((rule) =>
      rule.includes("Ne calcule, ne cumule ni ne moyenne aucun score de signal"),
    )
    expect(hasAntiAggregationRule).toBe(true)
  })
})

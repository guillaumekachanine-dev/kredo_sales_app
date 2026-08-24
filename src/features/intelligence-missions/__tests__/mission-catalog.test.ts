import { describe, expect, it } from "vitest"
import { MISSION_CATALOG } from "../domain/mission-catalog"
import type { MissionSpec } from "../domain/mission-contracts"

describe("MISSION_CATALOG", () => {
  it("est type comme un catalogue de MissionSpec", () => {
    const typedCatalog: readonly MissionSpec[] = MISSION_CATALOG

    expect(typedCatalog).toHaveLength(7)
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

  it("contient les 7 presets du catalogue dans l'ordre de la feuille de route", () => {
    expect(MISSION_CATALOG).toHaveLength(7)
    expect(MISSION_CATALOG[0]?.slug).toBe("veille-analyse-mensuelle")
    expect(MISSION_CATALOG[1]?.slug).toBe("rentabilite-portefeuille")
    expect(MISSION_CATALOG[2]?.slug).toBe("activation-portefeuille")
    expect(MISSION_CATALOG[3]?.slug).toBe("capacite-staffing")
    expect(MISSION_CATALOG[4]?.slug).toBe("revue-compte-client")
    expect(MISSION_CATALOG[5]?.slug).toBe("post-mortem-commercial")
    expect(MISSION_CATALOG[6]?.slug).toBe("funnel-recrutement")
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

  it("porte un preset complet sans configuration de type de sortie pour capacite-staffing", () => {
    const preset = MISSION_CATALOG[3]

    expect(preset).toBeDefined()
    if (!preset) return

    expect(preset.version).toBe(1)
    expect(preset.slug).toBe("capacite-staffing")
    expect(preset.label.trim()).not.toBe("")
    expect(preset.description.trim()).not.toBe("")
    expect(preset.intent.preset.trim()).not.toBe("")
    expect(preset.promptTemplate.trim()).not.toBe("")
    expect(preset.constraints.rules.length).toBeGreaterThan(0)
    expect(preset.corpus.budget.maxTotalChars).toBe(120_000)
    expect(preset.corpus.budget.maxCharsPerItem).toBe(1_500)
    expect(preset.corpus.budget.maxItems).toBe(200)
    expect(preset.corpus.requiredAtLaunch).toEqual(["staffing_horizon"])
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

  it("impose la règle d'incertitude sur les fins de mission inconnues dans les contraintes de capacite-staffing", () => {
    const preset = MISSION_CATALOG[3]
    expect(preset).toBeDefined()
    if (!preset) return

    const hasUncertaintyRule = preset.constraints.rules.some((rule) =>
      rule.includes("ne conclus jamais à une absence de risque de banc"),
    )
    expect(hasUncertaintyRule).toBe(true)
  })

  it("porte un preset complet sans configuration de type de sortie pour revue-compte-client", () => {
    const preset = MISSION_CATALOG[4]

    expect(preset).toBeDefined()
    if (!preset) return

    expect(preset.version).toBe(1)
    expect(preset.slug).toBe("revue-compte-client")
    expect(preset.label.trim()).not.toBe("")
    expect(preset.description.trim()).not.toBe("")
    expect(preset.intent.preset.trim()).not.toBe("")
    expect(preset.promptTemplate.trim()).not.toBe("")
    expect(preset.constraints.rules.length).toBeGreaterThan(0)
    expect(preset.corpus.budget.maxTotalChars).toBe(120_000)
    expect(preset.corpus.budget.maxCharsPerItem).toBe(2_000)
    expect(preset.corpus.budget.maxItems).toBe(200)
    expect(preset.corpus.requiredAtLaunch).toEqual(["account_context", "account_delivery"])
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

  it("impose les règles anti-recalcul et de confidentialité salariale dans revue-compte-client", () => {
    const preset = MISSION_CATALOG[4]
    expect(preset).toBeDefined()
    if (!preset) return

    const hasAntiRecalculation = preset.constraints.rules.some((rule) =>
      rule.includes("Ne recalcule aucun ratio ni écart"),
    )
    expect(hasAntiRecalculation).toBe(true)

    const hasSalaryRule = preset.constraints.rules.some((rule) =>
      rule.includes("Ne divulgue aucun chiffre de rémunération individuelle"),
    )
    expect(hasSalaryRule).toBe(true)

    expect(preset.promptTemplate).toContain("tranchant explicitement sur la santé globale du compte")
    expect(preset.promptTemplate).toContain("croiser la dimension relationnelle")
  })

  it("porte un preset complet et sans statistiques en pourcentage pour post-mortem-commercial", () => {
    const preset = MISSION_CATALOG[5]

    expect(preset).toBeDefined()
    if (!preset) return

    expect(preset.version).toBe(1)
    expect(preset.slug).toBe("post-mortem-commercial")
    expect(preset.label.trim()).not.toBe("")
    expect(preset.description.trim()).not.toBe("")
    expect(preset.intent.preset.trim()).not.toBe("")
    expect(preset.promptTemplate.trim()).not.toBe("")
    expect(preset.constraints.rules.length).toBeGreaterThan(0)
    expect(preset.corpus.budget.maxTotalChars).toBe(120_000)
    expect(preset.corpus.budget.maxCharsPerItem).toBe(2_000)
    expect(preset.corpus.budget.maxItems).toBe(200)
    expect(preset.corpus.requiredAtLaunch).toEqual(["pipeline_period"])
    expect(preset.corpus.base).toEqual([])
    expect(preset.corpus.userAddition.allowed).toBe(false)
    expect(preset.corpus.userAddition.kinds).toEqual([])
    expect(preset.model.provider).toBe("anthropic")
    expect(preset.model.model.trim()).not.toBe("")
    expect(preset.model.maxOutputTokens).toBe(16_000)

    const hasAntiStatRule = preset.constraints.rules.some((rule) =>
      rule.includes("N'énonce aucune statistique en pourcentage sur l'ensemble des affaires"),
    )
    expect(hasAntiStatRule).toBe(true)

    expect(preset.promptTemplate).toContain("sans jamais employer de pourcentage global")
    expect(preset.promptTemplate).toContain("chaque constat dans findings doit obligatoirement désigner une affaire précise et nommée")
    expect(preset.promptTemplate).toContain("au moins un motif récurrent de perte doit être identifié et distingué explicitement d'un motif de gain")
  })

  it("porte un preset complet avec seuil d'abstention et règle anti-recalcul pour funnel-recrutement", () => {
    const preset = MISSION_CATALOG[6]

    expect(preset).toBeDefined()
    if (!preset) return

    expect(preset.version).toBe(1)
    expect(preset.slug).toBe("funnel-recrutement")
    expect(preset.label.trim()).not.toBe("")
    expect(preset.description.trim()).not.toBe("")
    expect(preset.intent.preset.trim()).not.toBe("")
    expect(preset.promptTemplate.trim()).not.toBe("")
    expect(preset.constraints.rules.length).toBeGreaterThan(0)
    expect(preset.corpus.budget.maxTotalChars).toBe(120_000)
    expect(preset.corpus.budget.maxCharsPerItem).toBe(2_000)
    expect(preset.corpus.budget.maxItems).toBe(200)
    expect(preset.corpus.requiredAtLaunch).toEqual(["hiring_period"])
    expect(preset.corpus.base).toEqual([])
    expect(preset.corpus.userAddition.allowed).toBe(false)
    expect(preset.corpus.userAddition.kinds).toEqual([])
    expect(preset.model.provider).toBe("anthropic")
    expect(preset.model.model.trim()).not.toBe("")
    expect(preset.model.maxOutputTokens).toBe(16_000)

    const hasAbstentionRule = preset.constraints.rules.some((rule) =>
      rule.includes("Si moins de 5 process de recrutement recoupent la fenêtre analysée"),
    )
    expect(hasAbstentionRule).toBe(true)

    const hasAntiRecalculRule = preset.constraints.rules.some((rule) =>
      rule.includes("Ne recalcule aucun délai"),
    )
    expect(hasAntiRecalculRule).toBe(true)

    expect(preset.promptTemplate).toContain("désignant explicitement l'étape où le funnel perd le plus de candidats")
    expect(preset.promptTemplate).toContain("au moins un délai anormal entre jalons doit être cité avec sa source précise")
    expect(preset.promptTemplate).toContain("si le corpus comporte moins de 5 processus de recrutement sur la fenêtre analysée")
  })
})

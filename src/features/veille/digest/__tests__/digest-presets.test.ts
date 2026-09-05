import { describe, expect, it } from "vitest"

import {
  DIGEST_PRESETS,
  GLOBAL_DIGEST_TOPIC_KEY,
  buildSectorDigestPreset,
  findDigestPreset,
  listDigestPresets,
} from "../domain/digest-presets"

describe("DIGEST_PRESETS", () => {
  it("expose le sujet global, celui du cron hebdomadaire", () => {
    expect(DIGEST_PRESETS[GLOBAL_DIGEST_TOPIC_KEY]).toBeDefined()
    expect(GLOBAL_DIGEST_TOPIC_KEY).toBe("global")
  })

  it("indexe chaque preset sous sa propre cle", () => {
    for (const [key, preset] of Object.entries(DIGEST_PRESETS)) {
      expect(preset.key).toBe(key)
    }
  })

  it("ne declare jamais un cadrage vide : un sujet sans criteres ne filtrerait rien", () => {
    for (const preset of listDigestPresets()) {
      expect(preset.relevant.length).toBeGreaterThan(0)
      expect(preset.irrelevant.length).toBeGreaterThan(0)
      expect(preset.intent.trim().length).toBeGreaterThan(0)
      expect(preset.version).toBeGreaterThanOrEqual(1)
    }
  })

  it("porte des cles de forme compatible avec veille_digests.topic_key", () => {
    for (const preset of listDigestPresets()) {
      expect(preset.key).toMatch(/^[a-z0-9][a-z0-9-]{0,80}$/)
    }
  })

  it("n'utilise jamais la valeur litterale « segment » comme cle (collision de cle d'unicite)", () => {
    expect(Object.keys(DIGEST_PRESETS)).not.toContain("segment")
  })

  it("rend null pour une cle inconnue, sans jamais remonter le prototype", () => {
    expect(findDigestPreset("inconnu")).toBeNull()
    expect(findDigestPreset("constructor")).toBeNull()
    expect(findDigestPreset("toString")).toBeNull()
  })

  it("rend le preset demande pour une cle connue", () => {
    expect(findDigestPreset("ia")?.label).toBe(DIGEST_PRESETS.ia.label)
  })
})

describe("buildSectorDigestPreset", () => {
  it("prend LE SLUG du segment comme cle de sujet", () => {
    const preset = buildSectorDigestPreset({ slug: "seg-parfumerie-compositions-b2b", name: "Compositions B2B" })

    expect(preset.key).toBe("seg-parfumerie-compositions-b2b")
    expect(preset.label).toBe("Compositions B2B")
  })

  it("nomme le segment dans son cadrage, sinon le sujet ne filtre rien de sectoriel", () => {
    const preset = buildSectorDigestPreset({ slug: "seg-demo", name: "Voyage & Séjours" })

    expect(preset.relevant.join(" ")).toContain("Voyage & Séjours")
    expect(preset.irrelevant.length).toBeGreaterThan(0)
  })

  it("n'impose aucun corpus par defaut quand le segment n'en a pas", () => {
    expect(buildSectorDigestPreset({ slug: "seg-demo", name: "Demo" }).defaultCorpusSlug).toBeNull()
  })
})

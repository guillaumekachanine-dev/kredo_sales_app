import { describe, expect, it } from "vitest"

import {
  arkopharmaAccountIntelligenceFixture,
  arkopharmaSourceCorpusFixture,
} from "../fixtures/work"
import { detectWorkBundleRoles } from "./work-study-detection"

describe("Détection structurelle du bundle Work (detectWorkBundleRoles)", () => {
  it("détecte correctement les rôles lorsque AI est le premier fichier et Corpus le second", () => {
    const result = detectWorkBundleRoles(
      arkopharmaAccountIntelligenceFixture,
      arkopharmaSourceCorpusFixture,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.accountIntelligence.slot).toBe("file_a")
    expect(result.sourceCorpus.slot).toBe("file_b")
    expect(result.accountIntelligence.data.entity_resolution.legal_name).toContain("Arkopharma")
    expect(result.sourceCorpus.data.sources.length).toBeGreaterThan(0)
  })

  it("détecte correctement les rôles lorsque l'ordre est inversé (Corpus d'abord, AI ensuite)", () => {
    const result = detectWorkBundleRoles(
      arkopharmaSourceCorpusFixture,
      arkopharmaAccountIntelligenceFixture,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.accountIntelligence.slot).toBe("file_b")
    expect(result.sourceCorpus.slot).toBe("file_a")
    expect(result.accountIntelligence.data.entity_resolution.legal_name).toContain("Arkopharma")
  })

  it("rejette deux fichiers Account Intelligence", () => {
    const result = detectWorkBundleRoles(
      arkopharmaAccountIntelligenceFixture,
      arkopharmaAccountIntelligenceFixture,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("Deux fichiers Account Intelligence ont été sélectionnés")
  })

  it("rejette deux fichiers Source Corpus", () => {
    const result = detectWorkBundleRoles(
      arkopharmaSourceCorpusFixture,
      arkopharmaSourceCorpusFixture,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("Deux fichiers Source Corpus ont été sélectionnés")
  })

  it("rejette des fichiers non reconnus", () => {
    const result = detectWorkBundleRoles(
      { test: "invalide" },
      { autre: "invalide" },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("Aucun des deux fichiers")
  })
})

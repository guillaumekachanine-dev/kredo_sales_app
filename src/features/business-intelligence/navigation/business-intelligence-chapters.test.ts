import { describe, expect, it } from "vitest"
import { BI_CHAPTERS, buildBusinessIntelligenceHref, replaceBiChapterInHref, resolveBiChapter } from "./business-intelligence-chapters"

const SEGMENT = "20000000-0000-4000-8000-000000000000"

describe("Business Intelligence canonical chapter navigation", () => {
  it("expose les six chapitres dans l’ordre attendu avec leurs identifiants immuables", () => {
    expect(BI_CHAPTERS.map((chapter) => chapter.id)).toEqual([
      "home",
      "sector-analysis",
      "competitive-environment",
      "regulatory-calendar",
      "value-chain",
      "sector-news",
    ])
  })

  it("garantit les libellés Desktop canoniques cibles de la Phase 7", () => {
    expect(BI_CHAPTERS.map((chapter) => chapter.label)).toEqual([
      "Accueil",
      "Analyse sectorielle",
      "Environnement concurrentiel",
      "Calendrier Réglementaire",
      "Chaîne de Valeur",
      "Actualité sectorielle",
    ])
  })

  it("garantit les libellés Mobile distincts sans dérive indirecte", () => {
    expect(BI_CHAPTERS.map((chapter) => chapter.mobileLabel)).toEqual([
      "Terrain",
      "Analyse",
      "Concurrence",
      "Réglementation",
      "Chaîne",
      "Actualités",
    ])
  })

  it("résout les anciens identifiants sans les rendre canoniques", () => {
    expect(resolveBiChapter("priorities")).toBe("home")
    expect(resolveBiChapter("sectors")).toBe("sector-analysis")
    expect(resolveBiChapter("competitive_env")).toBe("competitive-environment")
    expect(resolveBiChapter("windows")).toBe("regulatory-calendar")
    expect(resolveBiChapter("value_chain")).toBe("value-chain")
  })

  it("conserve le segment pendant un changement de chapitre et génère les bons hrefs", () => {
    expect(replaceBiChapterInHref(`/intelligence?segment=${SEGMENT}&tab=home`, SEGMENT, "sector-news")).toBe(`/intelligence?segment=${SEGMENT}&tab=sector-news`)
    expect(replaceBiChapterInHref(`/intelligence?segment=${SEGMENT}&tab=home`, SEGMENT, "value-chain")).toBe(`/intelligence?segment=${SEGMENT}&tab=value-chain`)
    expect(buildBusinessIntelligenceHref(SEGMENT, "regulatory-calendar")).toBe(`/intelligence?segment=${SEGMENT}&tab=regulatory-calendar`)
    expect(buildBusinessIntelligenceHref(SEGMENT, "value-chain")).toBe(`/intelligence?segment=${SEGMENT}&tab=value-chain`)
    expect(buildBusinessIntelligenceHref(SEGMENT, "sector-news")).toBe(`/intelligence?segment=${SEGMENT}&tab=sector-news`)
  })
})

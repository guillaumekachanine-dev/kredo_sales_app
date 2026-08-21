import { describe, expect, it } from "vitest"
import { BI_CHAPTERS, buildBusinessIntelligenceHref, replaceBiChapterInHref, resolveBiChapter } from "./business-intelligence-chapters"

const SEGMENT = "20000000-0000-4000-8000-000000000000"

describe("Business Intelligence canonical chapter navigation", () => {
  it("expose les six chapitres dans l’ordre attendu", () => {
    expect(BI_CHAPTERS.map((chapter) => chapter.id)).toEqual([
      "home",
      "sector-analysis",
      "competitive-environment",
      "regulatory-calendar",
      "value-chain",
      "sector-news",
    ])
  })

  it("résout les anciens identifiants sans les rendre canoniques", () => {
    expect(resolveBiChapter("priorities")).toBe("home")
    expect(resolveBiChapter("competitive_env")).toBe("competitive-environment")
    expect(resolveBiChapter("value_chain")).toBe("value-chain")
  })

  it("conserve le segment pendant un changement de chapitre", () => {
    expect(replaceBiChapterInHref(`/intelligence?segment=${SEGMENT}&tab=home`, SEGMENT, "sector-news")).toBe(`/intelligence?segment=${SEGMENT}&tab=sector-news`)
    expect(buildBusinessIntelligenceHref(SEGMENT, "regulatory-calendar")).toBe(`/intelligence?segment=${SEGMENT}&tab=regulatory-calendar`)
  })
})

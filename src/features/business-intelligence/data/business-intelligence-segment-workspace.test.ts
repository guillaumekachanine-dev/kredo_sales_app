import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Business Intelligence segment workspace contracts", () => {
  it("branche la page sans appeler les loaders portefeuille-wide", () => {
    const page = read("src/app/(app)/intelligence/page.tsx")
    expect(page).toContain("resolveBusinessIntelligenceRoute")
    expect(page).toContain("getBusinessIntelligenceCatalog()")
    expect(page).toContain("getBusinessIntelligenceSegmentWorkspace(route.segmentId)")
    expect(page).not.toContain("getBusinessIntelligenceSnapshot()")
    expect(page).not.toContain("getCompetitiveMapWorkspace(")
    expect(page).not.toContain("getSectorMapCatalog()")
  })

  it("scope les comptes et leurs dépendances au segment actif", () => {
    const source = read("src/features/business-intelligence/data/get-segment-portfolio-snapshot.ts")
    expect(source).toContain('.eq("segment_id", segmentId)')
    expect(source).toContain('depth_level.is.null,depth_level.neq.mapped')
    expect(source).toContain('.in("company_id", companyIds)')
    expect(source).not.toContain(["score", "run", "id"].join("_"))
    expect(source).not.toContain(["account", "score"].join("_"))
  })

  it("charge une cartographie concurrentielle exacte sans fallback", () => {
    const source = read("src/features/competitive-map/data/get-competitive-map-snapshot.ts")
    expect(source).toContain('.eq("segment_id", segmentId)')
    expect(source).not.toContain("catalog[0]")
    expect(source).not.toContain("sector_intelligence!sector_intelligence_parent_id_fkey")
  })

  it("réutilise la macro résolue sans embed de relation Supabase", () => {
    const source = read("src/features/business-intelligence/data/get-business-intelligence-segment-workspace.ts")
    expect(source).toContain("knowledge.macroId")
    expect(source).toContain("knowledge.macroName")
    expect(source).not.toContain("sector_intelligence!sector_intelligence_parent_id_fkey")
  })

  it("centralise le fallback chaîne de valeur segment puis macro", () => {
    const source = read("src/features/sector-mapping/data/get-segment-value-chain-read-model.ts")
    expect(source).toContain("hasChain(segment.id) ? segment.id : hasChain(segment.parent_id)")
    expect(source).toContain('level = sourceSectorId === segment.id ? "segment" : "macro"')
  })
})

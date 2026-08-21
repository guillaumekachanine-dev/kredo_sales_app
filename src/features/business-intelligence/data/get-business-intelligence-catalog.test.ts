import { describe, expect, it } from "vitest"
import { buildBusinessIntelligenceCatalog, type BusinessIntelligenceCatalogRows } from "./get-business-intelligence-catalog"

const MACRO = "10000000-0000-4000-8000-000000000000"
const SEGMENT = "20000000-0000-4000-8000-000000000000"
const COMPANY = "30000000-0000-4000-8000-000000000000"

function rows(overrides: Partial<BusinessIntelligenceCatalogRows> = {}): BusinessIntelligenceCatalogRows {
  return {
    sectors: [
      { id: MACRO, name: "Industrie", slug: "industrie", status: "active", level: "macro", parent_id: null },
      { id: SEGMENT, name: "Spatial", slug: "spatial", status: "active", level: "segment", parent_id: MACRO },
    ],
    companies: [{ id: COMPANY, sector_id: MACRO, segment_id: SEGMENT }],
    knowledge: [{ segment_id: SEGMENT, source_run_id: "run", study_snapshot_date: "2026-08-20", has_segment_knowledge: false }],
    playbooks: [{ segment_id: SEGMENT, playbook_level: "macro", study_snapshot_date: "2026-08-20" }],
    items: [
      { segment_id: SEGMENT, item_kind: "regulatory", resolved_level: "macro", published_at: null, updated_at: "2026-08-19" },
      { segment_id: SEGMENT, item_kind: "news", resolved_level: "segment", published_at: "2026-08-21", updated_at: null },
    ],
    competitiveEntries: [{ segment_id: SEGMENT, study_snapshot_date: "2026-08-18" }],
    valueChainNodes: [{ sector_id: MACRO, couche: "chaine", maillon: 1, updated_at: "2026-08-17" }],
    signals: [{ company_id: COMPANY, detected_at: "2026-08-21T09:00:00Z" }],
    ...overrides,
  }
}

describe("Business Intelligence catalog", () => {
  it("agrège les compteurs et dérive la couverture sans contenu métier", () => {
    const catalog = buildBusinessIntelligenceCatalog(rows(), "2026-08-21T10:00:00Z")
    const macro = catalog.macros[0]
    const segment = macro?.segments[0]

    expect(catalog.state).toBe("ready")
    expect(macro?.accountCount).toBe(1)
    expect(segment?.accountCount).toBe(1)
    expect(segment?.coverage.study).toMatchObject({ available: true, level: "macro" })
    expect(segment?.coverage.playbook).toMatchObject({ available: true, level: "macro" })
    expect(segment?.coverage.competitiveMap.available).toBe(true)
    expect(segment?.coverage.valueChain).toMatchObject({ available: true, level: "macro" })
    expect(segment?.coverage.regulatory).toMatchObject({ available: true, level: "macro" })
    expect(segment?.coverage.news).toMatchObject({ available: true, level: "segment" })
    expect(segment).not.toHaveProperty("knowledge")
    expect(segment).not.toHaveProperty("playbook")
  })

  it("préfère une chaîne de valeur exacte au fallback macro", () => {
    const catalog = buildBusinessIntelligenceCatalog(rows({
      valueChainNodes: [
        { sector_id: MACRO, couche: "chaine", maillon: 1, updated_at: "2026-08-20" },
        { sector_id: SEGMENT, couche: "chaine", maillon: 1, updated_at: "2026-08-19" },
      ],
    }))
    expect(catalog.macros[0]?.segments[0]?.coverage.valueChain).toMatchObject({ available: true, level: "segment", updatedAt: "2026-08-19" })
  })
})

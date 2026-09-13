import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import type { BusinessIntelligenceCatalog, SegmentResourceCoverage } from "../data/business-intelligence-workspace-types"
import { splitCatalogSegmentsByAvailability } from "./flatten-catalog-segments"

const read = (path: string) => readFileSync(path, "utf8")

function coverage(studyAvailable: boolean): SegmentResourceCoverage {
  const unavailable = { available: false, level: null, updatedAt: null }
  return {
    study: { ...unavailable, available: studyAvailable },
    playbook: unavailable,
    competitiveMap: unavailable,
    valueChain: unavailable,
    regulatory: unavailable,
    news: unavailable,
  }
}

describe("SegmentCatalogLandingMobile", () => {
  it("est la seule landing mobile BI qui adopte MobileOverviewShell", () => {
    const landing = read("src/features/business-intelligence/catalog/SegmentCatalogLandingMobile.tsx")
    const workspace = read("src/features/business-intelligence/mobile/BusinessIntelligenceMobile.tsx")

    expect(landing).toContain('<MobileOverviewShell\n        tone="business-intelligence"')
    expect(landing).toContain('src="/illustrations/business-intelligence-mobile-line-art.png"')
    expect(landing).toContain("Choisir un segment")
    expect(landing).toContain("<AppDrawer")
    expect(workspace).toContain("<TerrainHomeDashboardMobile workspace={workspace} />")
    expect(workspace).not.toContain("MobileOverviewShell")
  })

  it("classe les segments étudiés avant les autres avec coverage.study.available", () => {
    const catalog: BusinessIntelligenceCatalog = {
      state: "ready",
      generatedAt: "2026-09-13T00:00:00.000Z",
      error: null,
      macros: [{
        id: "macro-1",
        name: "Industrie",
        slug: "industrie",
        status: "active",
        accountCount: 3,
        segments: [
          { id: "other", name: "Autre", slug: "autre", status: "active", accountCount: 1, coverage: coverage(false) },
          { id: "studied", name: "Étudié", slug: "etudie", status: "active", accountCount: 2, coverage: coverage(true) },
        ],
      }],
    }

    const { available, upcoming } = splitCatalogSegmentsByAvailability(catalog)
    expect(available.map((entry) => entry.segment.id)).toEqual(["studied"])
    expect(upcoming.map((entry) => entry.segment.id)).toEqual(["other"])
  })
})

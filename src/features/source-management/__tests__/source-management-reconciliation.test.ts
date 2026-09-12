import { describe, expect, it } from "vitest"
import type {
  SourceCatalogEntry,
  SourceCorpusItemView,
  SourceCorpusView,
  SourceManagementSnapshot,
} from "../domain/source-management-contracts"
import {
  deleteManualSourceInSnapshot,
  removeSourceFromCorpusInSnapshot,
  setCorpusAccountWatchEnabledInSnapshot,
  setCorpusActivationInSnapshot,
  setCorpusItemEnabledInSnapshot,
  setCorpusNewsEnabledInSnapshot,
  setManualSourceActiveInSnapshot,
  updateCorpusEditorialInSnapshot,
  updateSourceNameInSnapshot,
} from "../domain/source-management-reconciliation"

function createMockSource(id: string, name: string, score: number | null = 80): SourceCatalogEntry {
  return {
    id,
    sourceKey: `key-${id}`,
    name,
    publisher: "Test Publisher",
    domain: "example.com",
    searchDomain: "example.com",
    collectionUrl: null,
    collectionMode: "site_search",
    homepageUrl: "https://example.com",
    family: "Presse",
    kredoCategory: "marche-esn",
    origin: "manual",
    contentTemporality: "continuous",
    usageScopes: ["news", "account_watch"],
    validationStatus: "valid",
    isActive: true,
    isLocked: false,
    lastVerifiedAt: null,
    lastError: null,
    effectiveness:
      score !== null
        ? {
            observations: 5,
            successfulObservations: 5,
            productiveObservations: 4,
            itemsCollected: 20,
            itemsAfterDedup: 18,
            itemsRetained: 15,
            reliabilityRate: 1,
            productiveRunRate: 0.8,
            retentionRate: 0.75,
            effectivenessScore: score,
          }
        : null,
  }
}

function createMockItem(
  id: string,
  source: SourceCatalogEntry,
  isEnabled = true,
  isCollectable = true,
): SourceCorpusItemView {
  return {
    id,
    sourceId: source.id,
    source,
    externalSrcId: `ext-${id}`,
    pack: "minimal",
    tier: "T1",
    utilityScore: 85,
    automationFit: "high",
    newsEligible: true,
    accountWatchEligible: true,
    isEnabled,
    exclusionReason: null,
    isCollectable,
  }
}

function createMockCorpus(
  id: string,
  name: string,
  items: SourceCorpusItemView[],
  scopeKind: "sector" | "thematic" = "sector",
): SourceCorpusView {
  const evaluatedItems = items.filter((i) => i.source?.effectiveness?.effectivenessScore != null)
  const evaluatedSourcesCount = evaluatedItems.length
  const averageEffectivenessScore =
    evaluatedSourcesCount > 0
      ? Math.round(
          evaluatedItems.reduce(
            (acc, i) => acc + (i.source?.effectiveness?.effectivenessScore ?? 0),
            0,
          ) / evaluatedSourcesCount,
        )
      : null

  return {
    id,
    slug: `slug-${id}`,
    version: "1.0",
    snapshotDate: "2026-09-01",
    scopeKind,
    name,
    description: "Description originale",
    sectorId: "sec-1",
    sectorName: "Secteur Test",
    qualityVerdict: "production_ready",
    activationState: "active",
    enabledForNews: true,
    enabledForAccountWatch: true,
    totalSources: items.length,
    collectableSources: items.filter((i) => i.isCollectable).length,
    activeSources: items.filter((i) => i.isEnabled).length,
    accountsFed: 3,
    evaluatedSourcesCount,
    averageEffectivenessScore,
    items,
  }
}

describe("source-management-reconciliation — Pure Local Snapshot Updates", () => {
  const src1 = createMockSource("s1", "Le Monde Informatique", 90)
  const src2 = createMockSource("s2", "ZDNet France", 70)
  const src3 = createMockSource("s3", "L'Usine Digitale", null)

  const item1A = createMockItem("item-1", src1, true, true)
  const item2A = createMockItem("item-2", src2, true, true)
  const item3A = createMockItem("item-3", src3, false, false)

  // Shared source 1 in another corpus
  const item1B = createMockItem("item-4", src1, true, true)

  const corpusA = createMockCorpus("corpus-a", "Corpus Sectoriel A", [item1A, item2A, item3A], "sector")
  const corpusB = createMockCorpus("corpus-b", "Corpus Thématique B", [item1B], "thematic")

  const initialSnapshot: SourceManagementSnapshot = {
    systemSources: [],
    manualSources: [src1, src2, src3],
    sectorCorpora: [corpusA],
    thematicCorpora: [corpusB],
    activeNewsSourceCount: 3,
    canManage: true,
  }

  it("updateCorpusEditorialInSnapshot updates name and description immediately", () => {
    const updated = updateCorpusEditorialInSnapshot(initialSnapshot, "corpus-a", {
      name: "Nouveau Titre Corpus A",
      description: "Nouvelle description enrichie",
    })

    expect(updated.sectorCorpora[0].name).toBe("Nouveau Titre Corpus A")
    expect(updated.sectorCorpora[0].description).toBe("Nouvelle description enrichie")
    // Thematic corpus is untouched
    expect(updated.thematicCorpora[0].name).toBe("Corpus Thématique B")
    expect(updated.thematicCorpora[0].description).toBe("Description originale")
  })

  it("updateSourceNameInSnapshot propagates new name across all corpora and catalog entries", () => {
    const updated = updateSourceNameInSnapshot(initialSnapshot, "s1", "LMI Actualités")

    // In catalog
    expect(updated.manualSources.find((s) => s.id === "s1")?.name).toBe("LMI Actualités")
    // In corpus A items
    expect(updated.sectorCorpora[0].items.find((i) => i.sourceId === "s1")?.source?.name).toBe("LMI Actualités")
    // In corpus B items (shared source)
    expect(updated.thematicCorpora[0].items.find((i) => i.sourceId === "s1")?.source?.name).toBe("LMI Actualités")
    // Other sources remain untouched
    expect(updated.manualSources.find((s) => s.id === "s2")?.name).toBe("ZDNet France")
  })

  it("removeSourceFromCorpusInSnapshot removes item from targeted corpus and recalculates all counters", () => {
    // Before removal: corpus A has 3 items:
    // - item 1 (s1): score 90, enabled, collectable
    // - item 2 (s2): score 70, enabled, collectable
    // - item 3 (s3): score null, disabled, not collectable
    // totalSources = 3, collectable = 2, active = 2, evaluated = 2, avg = (90 + 70)/2 = 80
    expect(initialSnapshot.sectorCorpora[0].totalSources).toBe(3)
    expect(initialSnapshot.sectorCorpora[0].averageEffectivenessScore).toBe(80)

    // Remove item-2 (s2 with score 70)
    const updated = removeSourceFromCorpusInSnapshot(initialSnapshot, "item-2")

    const nextCorpusA = updated.sectorCorpora[0]
    expect(nextCorpusA.items.length).toBe(2)
    expect(nextCorpusA.items.map((i) => i.id)).toEqual(["item-1", "item-3"])

    // Recalculated counters:
    expect(nextCorpusA.totalSources).toBe(2)
    expect(nextCorpusA.collectableSources).toBe(1) // only item-1 is collectable
    expect(nextCorpusA.activeSources).toBe(1) // only item-1 is enabled
    expect(nextCorpusA.evaluatedSourcesCount).toBe(1) // only item-1 has score
    expect(nextCorpusA.averageEffectivenessScore).toBe(90) // 90 / 1 = 90

    // Source catalog is NOT modified
    expect(updated.manualSources.some((s) => s.id === "s2")).toBe(true)

    // Other corpora are NOT modified
    expect(updated.thematicCorpora[0].items.length).toBe(1)
  })

  it("setCorpusItemEnabledInSnapshot toggles item isEnabled and updates activeSources counter", () => {
    // Initially item-3 is disabled
    expect(initialSnapshot.sectorCorpora[0].items.find((i) => i.id === "item-3")?.isEnabled).toBe(false)
    expect(initialSnapshot.sectorCorpora[0].activeSources).toBe(2)

    const updated = setCorpusItemEnabledInSnapshot(initialSnapshot, "item-3", true)
    const nextCorpusA = updated.sectorCorpora[0]

    expect(nextCorpusA.items.find((i) => i.id === "item-3")?.isEnabled).toBe(true)
    expect(nextCorpusA.activeSources).toBe(3)
  })

  it("setCorpusActivationInSnapshot toggles activation state", () => {
    const updated = setCorpusActivationInSnapshot(initialSnapshot, "corpus-a", "draft")
    expect(updated.sectorCorpora[0].activationState).toBe("draft")
  })

  it("setCorpusNewsEnabledInSnapshot and setCorpusAccountWatchEnabledInSnapshot toggle scope flags", () => {
    let updated = setCorpusNewsEnabledInSnapshot(initialSnapshot, "corpus-a", false)
    expect(updated.sectorCorpora[0].enabledForNews).toBe(false)

    updated = setCorpusAccountWatchEnabledInSnapshot(updated, "corpus-a", false)
    expect(updated.sectorCorpora[0].enabledForAccountWatch).toBe(false)
  })

  it("setManualSourceActiveInSnapshot and deleteManualSourceInSnapshot maintain activeNewsSourceCount", () => {
    // Toggle s1 inactive
    const updated = setManualSourceActiveInSnapshot(initialSnapshot, "s1", false)
    expect(updated.manualSources.find((s) => s.id === "s1")?.isActive).toBe(false)
    expect(updated.activeNewsSourceCount).toBe(2)

    // Delete s3
    const afterDelete = deleteManualSourceInSnapshot(updated, "s3")
    expect(afterDelete.manualSources.find((s) => s.id === "s3")).toBeUndefined()
    expect(afterDelete.manualSources.length).toBe(2)
  })
})

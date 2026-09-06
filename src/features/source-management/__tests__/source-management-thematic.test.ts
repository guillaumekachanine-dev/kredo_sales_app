import { describe, expect, it } from "vitest"
import {
  EMPTY_SOURCE_MANAGEMENT_SNAPSHOT,
  type SourceCorpusView,
  type SourceManagementSnapshot,
} from "../domain/source-management-contracts"
import { buildSourceManagementOverview } from "../domain/source-management-overview"

function makeCorpus(partial: Partial<SourceCorpusView> & { id: string; slug: string }): SourceCorpusView {
  return {
    version: "1.0",
    snapshotDate: "2026-09-06",
    scopeKind: "sector",
    name: null,
    sectorId: "sec-1",
    sectorName: "Banque",
    qualityVerdict: "production_ready",
    activationState: "draft",
    enabledForNews: true,
    enabledForAccountWatch: true,
    totalSources: 5,
    collectableSources: 4,
    activeSources: 4,
    accountsFed: 2,
    evaluatedSourcesCount: 0,
    averageEffectivenessScore: null,
    items: [],
    ...partial,
  }
}

describe("Thematic corpora domain and overview contracts", () => {
  it("EMPTY_SOURCE_MANAGEMENT_SNAPSHOT exposes empty thematicCorpora alongside sectorCorpora", () => {
    expect(EMPTY_SOURCE_MANAGEMENT_SNAPSHOT.thematicCorpora).toEqual([])
    expect(EMPTY_SOURCE_MANAGEMENT_SNAPSHOT.sectorCorpora).toEqual([])
  })

  it("buildSourceManagementOverview accounts for thematicCorpora in global metrics", () => {
    const sectorCorpus = makeCorpus({
      id: "corpus-sector-1",
      slug: "sources-banque",
      scopeKind: "sector",
      activationState: "active",
      totalSources: 10,
      activeSources: 8,
      items: [
        {
          id: "item-s1",
          sourceId: "src-1",
          externalSrcId: "SRC_01",
          pack: "minimal",
          tier: "1",
          utilityScore: 90,
          automationFit: "high",
          newsEligible: true,
          accountWatchEligible: true,
          isEnabled: true,
          exclusionReason: null,
          isCollectable: true,
          source: {
            id: "src-1",
            sourceKey: "corpus:lemondeinformatique.fr",
            name: "Le Monde Informatique",
            publisher: "LMI",
            domain: "lemondeinformatique.fr",
            searchDomain: "lemondeinformatique.fr",
            collectionUrl: "https://lemondeinformatique.fr/rss",
            collectionMode: "rss",
            homepageUrl: "https://lemondeinformatique.fr",
            family: "Tech",
            kredoCategory: "marche-esn",
            origin: "corpus",
            contentTemporality: "continuous",
            usageScopes: ["news"],
            validationStatus: "valid",
            isActive: true,
            isLocked: false,
            lastVerifiedAt: null,
            lastError: null,
          },
        },
      ],
    })

    const thematicCorpus = makeCorpus({
      id: "corpus-thematic-1",
      slug: "folio-ai-tech",
      scopeKind: "thematic",
      name: "Folio AI Tech",
      sectorId: null,
      sectorName: null,
      activationState: "draft",
      enabledForNews: false,
      enabledForAccountWatch: false,
      totalSources: 11,
      activeSources: 8,
      items: [
        {
          id: "item-t1",
          sourceId: "src-2",
          externalSrcId: "TH_01",
          pack: "minimal",
          tier: null,
          utilityScore: null,
          automationFit: "high",
          newsEligible: true,
          accountWatchEligible: false,
          isEnabled: true,
          exclusionReason: null,
          isCollectable: true,
          source: {
            id: "src-2",
            sourceKey: "corpus:openai.com",
            name: "OpenAI Blog",
            publisher: "OpenAI",
            domain: "openai.com",
            searchDomain: "openai.com",
            collectionUrl: "https://openai.com/news/rss.xml",
            collectionMode: "rss",
            homepageUrl: "https://openai.com",
            family: "AI",
            kredoCategory: "frontier",
            origin: "corpus",
            contentTemporality: "continuous",
            usageScopes: ["news"],
            validationStatus: "valid",
            isActive: true,
            isLocked: false,
            lastVerifiedAt: null,
            lastError: null,
          },
        },
      ],
    })

    const snapshot: SourceManagementSnapshot = {
      systemSources: [],
      manualSources: [],
      sectorCorpora: [sectorCorpus],
      thematicCorpora: [thematicCorpus],
      activeNewsSourceCount: 0,
      canManage: true,
    }

    const overview = buildSourceManagementOverview(snapshot)

    // Total corpora count combines sector + thematic
    expect(overview.corpusCount).toBe(2)
    // Only sector corpus is active, thematic is draft
    expect(overview.activeCorpusCount).toBe(1)
    // Unique domains seen from both corpora
    expect(overview.uniqueSourceCount).toBe(2)
    // Corpus activity includes both with proper names
    expect(overview.corpusActivity).toHaveLength(2)
    expect(overview.corpusActivity[0]?.name).toBe("Banque")
    expect(overview.corpusActivity[1]?.name).toBe("Folio AI Tech")
    expect(overview.corpusActivity[1]?.slug).toBe("folio-ai-tech")
  })

  it("differentiates sector and thematic corpora without collision", () => {
    const sector = makeCorpus({ id: "1", slug: "sector-1", scopeKind: "sector" })
    const thematic = makeCorpus({ id: "2", slug: "thematic-1", scopeKind: "thematic", name: "Folio Tech" })

    const snapshot: SourceManagementSnapshot = {
      ...EMPTY_SOURCE_MANAGEMENT_SNAPSHOT,
      sectorCorpora: [sector],
      thematicCorpora: [thematic],
    }

    expect(snapshot.sectorCorpora.every((c) => c.scopeKind === "sector")).toBe(true)
    expect(snapshot.thematicCorpora.every((c) => c.scopeKind === "thematic")).toBe(true)
  })
})

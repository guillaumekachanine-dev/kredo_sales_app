import { describe, expect, it } from "vitest"
import {
  buildDigestInputSnapshot,
  buildDigestRunEnvelope,
} from "../data/build-digest-launch"
import type { DigestLaunchInputV2 } from "../domain/digest-launch-contracts"
import type { ResolvedDigestLaunch } from "../data/resolve-digest-launch"

const MOCK_SOURCES: ResolvedDigestLaunch["sources"] = [
  {
    sourceId: "src-1",
    sourceKey: "techcrunch-ai",
    sourceName: "TechCrunch AI",
    publisher: "TechCrunch",
    domain: "techcrunch.com",
    searchDomain: "techcrunch.com",
    collectionUrl: "https://techcrunch.com/category/artificial-intelligence/feed/",
    collectionMode: "rss",
    family: "press",
    kredoCategory: "tech",
    origin: "corpus",
    corpusId: "corpus-folio-1",
  },
  {
    sourceId: "src-2",
    sourceKey: "usine-digitale-ia",
    sourceName: "L'Usine Digitale IA",
    publisher: "L'Usine Digitale",
    domain: "usine-digitale.fr",
    searchDomain: "usine-digitale.fr",
    collectionUrl: null,
    collectionMode: "site_search",
    family: "press",
    kredoCategory: "industry",
    origin: "system",
    corpusId: null,
  },
]

const MOCK_RESOLVED_LAUNCH: ResolvedDigestLaunch = {
  topic: {
    topicKey: "ia",
    label: "Intelligence Artificielle & Automatisation",
    sectorId: null,
    presetVersion: 1,
  },
  corpus: {
    id: "corpus-folio-1",
    slug: "folio-ai-tech",
    scopeKind: "thematic",
  },
  framing: "# CONTEXTE — Veille commerciale KREDO\n\n## Sujet de ce digest\nIntelligence Artificielle...",
  sources: MOCK_SOURCES,
  stats: {
    sourcesCount: 2,
    rssCount: 1,
    siteSearchCount: 1,
  },
}

describe("buildDigestRunEnvelope", () => {
  it("construit l'enveloppe d'exécution n8n V2 conforme", () => {
    const validatedInput: DigestLaunchInputV2 = {
      schemaVersion: 2,
      triggerMode: "manual",
      topicKey: "ia",
      corpusId: "corpus-folio-1",
    }

    const envelope = buildDigestRunEnvelope(validatedInput, MOCK_RESOLVED_LAUNCH)

    expect(envelope).toEqual({
      schemaVersion: 2,
      triggerMode: "manual",
      topicKey: "ia",
      topicSectorId: null,
      corpusId: "corpus-folio-1",
      framing: MOCK_RESOLVED_LAUNCH.framing,
      sources: MOCK_SOURCES,
      stats: {
        sourcesCount: 2,
        rssCount: 1,
        siteSearchCount: 1,
      },
    })
  })

  it("gère corpusId null (socle par défaut) et topicSectorId pour un segment", () => {
    const validatedInput: DigestLaunchInputV2 = {
      schemaVersion: 2,
      triggerMode: "manual",
      topicKey: "seg-cyber-b2b",
      corpusId: null,
    }

    const resolvedSector: ResolvedDigestLaunch = {
      ...MOCK_RESOLVED_LAUNCH,
      topic: {
        topicKey: "seg-cyber-b2b",
        label: "Cybersécurité B2B",
        sectorId: "sector-uuid-123",
        presetVersion: 1,
      },
      corpus: null,
    }

    const envelope = buildDigestRunEnvelope(validatedInput, resolvedSector)

    expect(envelope.topicKey).toBe("seg-cyber-b2b")
    expect(envelope.topicSectorId).toBe("sector-uuid-123")
    expect(envelope.corpusId).toBeNull()
  })

  it("n'émet ni sourceCorpusId ni generationMode (n8n les dérive lui-même)", () => {
    const validatedInput: DigestLaunchInputV2 = {
      schemaVersion: 2,
      triggerMode: "manual",
      topicKey: "ia",
      corpusId: "corpus-folio-1",
    }

    const envelope = buildDigestRunEnvelope(validatedInput, MOCK_RESOLVED_LAUNCH)
    const raw = envelope as Record<string, unknown>

    expect(raw).not.toHaveProperty("sourceCorpusId")
    expect(raw).not.toHaveProperty("generationMode")
  })
})

describe("buildDigestInputSnapshot", () => {
  it("construit un snapshot de traçabilité compact", () => {
    const validatedInput: DigestLaunchInputV2 = {
      schemaVersion: 2,
      triggerMode: "manual",
      topicKey: "ia",
      corpusId: "corpus-folio-1",
    }

    const snapshot = buildDigestInputSnapshot(validatedInput, MOCK_RESOLVED_LAUNCH)

    expect(snapshot).toEqual({
      schemaVersion: 2,
      triggerMode: "manual",
      requested: {
        topicKey: "ia",
        corpusId: "corpus-folio-1",
      },
      resolved: {
        topicKey: "ia",
        topicLabel: "Intelligence Artificielle & Automatisation",
        topicSectorId: null,
        presetVersion: 1,
        corpus: {
          id: "corpus-folio-1",
          slug: "folio-ai-tech",
          scopeKind: "thematic",
        },
        stats: {
          sourcesCount: 2,
          rssCount: 1,
          siteSearchCount: 1,
        },
        sources: [
          {
            sourceId: "src-1",
            sourceKey: "techcrunch-ai",
            sourceName: "TechCrunch AI",
            corpusId: "corpus-folio-1",
          },
          {
            sourceId: "src-2",
            sourceKey: "usine-digitale-ia",
            sourceName: "L'Usine Digitale IA",
            corpusId: null,
          },
        ],
      },
    })
  })

  it("ne contient aucun texte complet de framing ni URLs superflues", () => {
    const validatedInput: DigestLaunchInputV2 = {
      schemaVersion: 2,
      triggerMode: "manual",
      topicKey: "ia",
      corpusId: "corpus-folio-1",
    }

    const snapshot = buildDigestInputSnapshot(validatedInput, MOCK_RESOLVED_LAUNCH)
    const raw = snapshot as Record<string, unknown>

    expect(raw).not.toHaveProperty("framing")
    expect(JSON.stringify(snapshot)).not.toContain("https://techcrunch.com/category/artificial-intelligence/feed/")
  })

  it("gère un corpus null dans le snapshot", () => {
    const validatedInput: DigestLaunchInputV2 = {
      schemaVersion: 2,
      triggerMode: "manual",
      topicKey: "global",
      corpusId: null,
    }

    const snapshot = buildDigestInputSnapshot(validatedInput, {
      ...MOCK_RESOLVED_LAUNCH,
      corpus: null,
    })

    expect(snapshot.requested.corpusId).toBeNull()
    expect(snapshot.resolved.corpus).toBeNull()
  })
})

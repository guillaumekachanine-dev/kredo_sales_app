import { describe, expect, it } from "vitest"
import type { WatchAnalysisInputV2 } from "@/lib/n8n/types"
import type { ResolvedWatchAnalysisSources } from "../data/resolve-watch-analysis-sources"
import {
  buildWatchAnalysisInputSnapshot,
  buildWatchAnalysisRunEnvelope,
} from "../data/build-watch-analysis-launch"

describe("build-watch-analysis-launch", () => {
  const validatedInput: WatchAnalysisInputV2 = {
    schemaVersion: 2,
    triggerMode: "manual_custom",
    intention: "Analyse sur les opportunités IA en assurance",
    requestedAt: "2026-08-19T10:00:00.000Z",
    sources: [
      {
        kind: "digest",
        digestId: "digest-111",
        articleIds: ["art-1", "art-2"],
      },
      {
        kind: "account_signals",
        signalIds: ["sig-1"],
      },
    ],
  }

  const resolvedSources: ResolvedWatchAnalysisSources = {
    refs: [
      { kind: "veille_digest", id: "digest-111", articleIds: ["art-1", "art-2"] },
      { kind: "account_signal", id: "sig-1" },
    ],
    stats: {
      sourceGroups: 2,
      resolvedRefs: 2,
    },
  }

  it("construit une enveloppe n8n V2 valide sans contenu textuel métier", () => {
    const envelope = buildWatchAnalysisRunEnvelope(validatedInput, resolvedSources)
    expect(envelope).toEqual({
      schemaVersion: 2,
      triggerMode: "manual_custom",
      intention: "Analyse sur les opportunités IA en assurance",
      requestedAt: "2026-08-19T10:00:00.000Z",
      refs: [
        { kind: "veille_digest", id: "digest-111", articleIds: ["art-1", "art-2"] },
        { kind: "account_signal", id: "sig-1" },
      ],
      stats: {
        sourceGroups: 2,
        resolvedRefs: 2,
      },
    })
    expect(envelope).not.toHaveProperty("articles")
    expect(envelope).not.toHaveProperty("content")
  })

  it("construit un inputSnapshot de traçabilité sans contenu métier lourd", () => {
    const snapshot = buildWatchAnalysisInputSnapshot(validatedInput, resolvedSources)
    expect(snapshot).toEqual({
      schemaVersion: 2,
      triggerMode: "manual_custom",
      intention: "Analyse sur les opportunités IA en assurance",
      requestedAt: "2026-08-19T10:00:00.000Z",
      sources: validatedInput.sources,
      resolvedRefs: resolvedSources.refs,
      resolutionStats: resolvedSources.stats,
    })
    expect(snapshot).not.toHaveProperty("articleText")
    expect(snapshot).not.toHaveProperty("prompt")
  })
})

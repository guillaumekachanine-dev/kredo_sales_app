import { describe, expect, it } from "vitest"
import { resolveWatchAnalysisSources } from "../data/resolve-watch-analysis-sources"
import { createFakeSupabase, type FakeDataset } from "./fake-supabase"
import type { WatchAnalysisInputV2 } from "@/lib/n8n/types"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const OTHER_WORKSPACE = "22222222-2222-2222-2222-222222222222"

const DIGEST_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const DIGEST_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
const DIGEST_FOREIGN = "cccccccc-cccc-cccc-cccc-cccccccccccc"

const ARTICLE_IN_DIGEST_A = "d1111111-1111-1111-1111-111111111111"
const ARTICLE_IN_DIGEST_B = "d2222222-2222-2222-2222-222222222222"
const ARTICLE_MISSING = "d9999999-9999-9999-9999-999999999999"

const SIGNAL_1 = "e1111111-1111-1111-1111-111111111111"
const SIGNAL_MISSING = "e9999999-9999-9999-9999-999999999999"

const DOC_1 = "f1111111-1111-1111-1111-111111111111"
const DOC_MISSING = "f9999999-9999-9999-9999-999999999999"

const COLLECTION_1 = "11111111-2222-3333-4444-555555555555"

const CONFIDENTIAL_MARKER = "CONFIDENTIEL_NE_DOIT_JAMAIS_FUITER"

const DATASET: FakeDataset = {
  veille_digests: [
    { id: DIGEST_A, workspace_id: WORKSPACE, resume_hebdo: CONFIDENTIAL_MARKER },
    { id: DIGEST_B, workspace_id: WORKSPACE, resume_hebdo: CONFIDENTIAL_MARKER },
    { id: DIGEST_FOREIGN, workspace_id: OTHER_WORKSPACE, resume_hebdo: CONFIDENTIAL_MARKER },
  ],
  veille_articles: [
    { id: ARTICLE_IN_DIGEST_A, workspace_id: WORKSPACE, digest_id: DIGEST_A, resume: CONFIDENTIAL_MARKER },
    { id: ARTICLE_IN_DIGEST_B, workspace_id: WORKSPACE, digest_id: DIGEST_B, resume: CONFIDENTIAL_MARKER },
  ],
  account_signals: [{ id: SIGNAL_1, workspace_id: WORKSPACE, summary: CONFIDENTIAL_MARKER }],
  intelligence_documents: [
    { id: DOC_1, workspace_id: WORKSPACE, current_content_text: CONFIDENTIAL_MARKER },
  ],
  content_collections: [{ id: COLLECTION_1, kind: "list", name: "Ma liste" }],
  content_collection_items: [
    { collection_id: COLLECTION_1, content_type: "intelligence_document", content_id: DOC_1 },
    { collection_id: COLLECTION_1, content_type: "veille_article", content_id: ARTICLE_IN_DIGEST_A },
  ],
}

function input(sources: WatchAnalysisInputV2["sources"]): WatchAnalysisInputV2 {
  return {
    schemaVersion: 2,
    triggerMode: "manual_custom",
    intention: "Analyse de test",
    requestedAt: "2026-08-19T09:00:00.000Z",
    sources,
  }
}

describe("resolveWatchAnalysisSources", () => {
  it("résout un digest accessible", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(fake.supabase, WORKSPACE, input([{ kind: "digest", digestId: DIGEST_A }]))
    expect(result).toEqual({
      refs: [{ kind: "veille_digest", id: DIGEST_A }],
      stats: { sourceGroups: 1, resolvedRefs: 1 },
    })
  })

  it("refuse un digest introuvable ou d'un autre workspace", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([{ kind: "digest", digestId: DIGEST_FOREIGN }]),
    )
    expect("error" in result).toBe(true)
  })

  it("accepte un article appartenant au digest sélectionné", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([{ kind: "digest", digestId: DIGEST_A, articleIds: [ARTICLE_IN_DIGEST_A] }]),
    )
    expect(result).toEqual({
      refs: [{ kind: "veille_digest", id: DIGEST_A, articleIds: [ARTICLE_IN_DIGEST_A] }],
      stats: { sourceGroups: 1, resolvedRefs: 1 },
    })
  })

  it("refuse un article hors du digest sélectionné", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([{ kind: "digest", digestId: DIGEST_A, articleIds: [ARTICLE_IN_DIGEST_B] }]),
    )
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toContain("hors du digest")
  })

  it("refuse un article introuvable", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([{ kind: "digest", digestId: DIGEST_A, articleIds: [ARTICLE_MISSING] }]),
    )
    expect("error" in result).toBe(true)
  })

  it("résout un signal compte accessible", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([{ kind: "account_signals", signalIds: [SIGNAL_1] }]),
    )
    expect(result).toEqual({
      refs: [{ kind: "account_signal", id: SIGNAL_1 }],
      stats: { sourceGroups: 1, resolvedRefs: 1 },
    })
  })

  it("refuse un signal compte inaccessible", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([{ kind: "account_signals", signalIds: [SIGNAL_MISSING] }]),
    )
    expect("error" in result).toBe(true)
  })

  it("résout un document d'intelligence accessible", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([{ kind: "intelligence_documents", documentIds: [DOC_1] }]),
    )
    expect(result).toEqual({
      refs: [{ kind: "intelligence_document", id: DOC_1 }],
      stats: { sourceGroups: 1, resolvedRefs: 1 },
    })
  })

  it("refuse un document d'intelligence inaccessible", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([{ kind: "intelligence_documents", documentIds: [DOC_MISSING] }]),
    )
    expect("error" in result).toBe(true)
  })

  it("développe une Liste/Corpus via resolveKnowledgeScope()", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([{ kind: "knowledge_collection", collectionId: COLLECTION_1 }]),
    )
    expect("error" in result).toBe(false)
    if (!("error" in result)) {
      expect(result.refs).toEqual(
        expect.arrayContaining([
          { kind: "intelligence_document", id: DOC_1 },
          { kind: "veille_article", id: ARTICLE_IN_DIGEST_A },
        ]),
      )
      expect(result.stats.resolvedRefs).toBe(2)
    }
  })

  it("déduplique une même référence choisie directement ET via une Liste/Corpus", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([
        { kind: "intelligence_documents", documentIds: [DOC_1] },
        { kind: "knowledge_collection", collectionId: COLLECTION_1 },
      ]),
    )
    expect("error" in result).toBe(false)
    if (!("error" in result)) {
      expect(result.stats.sourceGroups).toBe(2)
      expect(result.stats.resolvedRefs).toBe(2)
      const docRefs = result.refs.filter((ref) => ref.kind === "intelligence_document")
      expect(docRefs).toHaveLength(1)
    }
  })

  it("ne recopie jamais le contenu métier complet dans le résultat", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([
        { kind: "digest", digestId: DIGEST_A, articleIds: [ARTICLE_IN_DIGEST_A] },
        { kind: "account_signals", signalIds: [SIGNAL_1] },
      ]),
    )
    expect(JSON.stringify(result)).not.toContain(CONFIDENTIAL_MARKER)
  })

  it("filtre explicitement sur le workspace pour chaque famille de source", async () => {
    const fake = createFakeSupabase(DATASET)
    await resolveWatchAnalysisSources(
      fake.supabase,
      WORKSPACE,
      input([{ kind: "account_signals", signalIds: [SIGNAL_1] }]),
    )
    expect(fake.calls.some((call) => call.table === "account_signals" && call.eq.some(([column, value]) => column === "workspace_id" && value === WORKSPACE))).toBe(true)
  })
})

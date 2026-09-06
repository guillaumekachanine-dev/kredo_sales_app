import { beforeEach, describe, expect, it, vi } from "vitest"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const ATTACKER_WORKSPACE = "22222222-2222-2222-2222-222222222222"
const USER = "33333333-3333-3333-3333-333333333333"

const CORPUS_FOLIO_ID = "44444444-4444-4444-4444-444444444444"
const CORPUS_DRAFT_ID = "55555555-5555-5555-5555-555555555555"
const CORPUS_EMPTY_ID = "66666666-6666-6666-6666-666666666666"
const CORPUS_OTHER_WS = "77777777-7777-7777-7777-777777777777"
const SECTOR_SEGMENT_ID = "88888888-8888-8888-8888-888888888888"

const mocks = vi.hoisted(() => ({
  triggerN8nRun: vi.fn<(...args: [Record<string, unknown>]) => Promise<{ ok: true; runId: string }>>(
    async () => ({ ok: true as const, runId: "run-test-123" }),
  ),
  rows: {} as Record<string, Array<Record<string, unknown>>>,
}))

vi.mock("@/lib/n8n/trigger-run", () => ({
  triggerN8nRun: mocks.triggerN8nRun,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: USER } }, error: null }) },
    from(table: string) {
      let rows = [...(mocks.rows[table] ?? [])]
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] === value)
          return builder
        },
        in: (column: string, values: unknown[]) => {
          rows = rows.filter((row) => values.includes(row[column]))
          return builder
        },
        gte: (column: string, value: unknown) => {
          rows = rows.filter((row) => String(row[column]) >= String(value))
          return builder
        },
        lte: (column: string, value: unknown) => {
          rows = rows.filter((row) => String(row[column]) <= String(value))
          return builder
        },
        is: (column: string, value: unknown) => {
          rows = rows.filter((row) => (value === null ? row[column] === null || row[column] === undefined : row[column] === value))
          return builder
        },
        order: () => builder,
        limit: (count: number) => {
          rows = rows.slice(0, count)
          return builder
        },
        single: async () => ({ data: rows[0] ?? null, error: null }),
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (onOk: (value: unknown) => unknown, onErr?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(onOk, onErr),
      }
      return builder
    },
  }),
}))

import { POST } from "./route"

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/n8n/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mocks.triggerN8nRun.mockClear()
  mocks.rows = {
    profiles: [{ id: USER, workspace_id: WORKSPACE }],
    sector_intelligence: [
      { id: "sec-macro-1", workspace_id: WORKSPACE, name: "Banque & Assurance", level: "macro" },
      { id: "sec-macro-2", workspace_id: WORKSPACE, name: "Santé & Pharma", level: "macro" },
      { id: SECTOR_SEGMENT_ID, workspace_id: WORKSPACE, slug: "seg-cyber-b2b", name: "Cybersécurité B2B", level: "segment" },
      { id: "sec-macro-invalid", workspace_id: WORKSPACE, slug: "macro-industrie", name: "Industrie", level: "macro" },
    ],
    v_effective_watch_sources: [
      {
        source_id: "src-eff-1",
        source_key: "eff-rss-1",
        source_name: "Source Effective 1",
        publisher: "Pub 1",
        domain: "domain1.com",
        search_domain: "domain1.com",
        collection_url: "https://domain1.com/rss",
        collection_mode: "rss",
        family: "press",
        kredo_category: "tech",
        origin: "system",
        corpus_id: null,
        usage_scope: "news",
        priority: 1,
        utility_score: 90,
      },
      {
        source_id: "src-eff-2",
        source_key: "eff-search-2",
        source_name: "Source Effective 2",
        publisher: "Pub 2",
        domain: "domain2.com",
        search_domain: "domain2.com",
        collection_url: null,
        collection_mode: "site_search",
        family: "press",
        kredo_category: "business",
        origin: "system",
        corpus_id: null,
        usage_scope: "news",
        priority: 2,
        utility_score: 80,
      },
    ],
    source_corpora: [
      {
        id: CORPUS_FOLIO_ID,
        workspace_id: WORKSPACE,
        slug: "folio-ai-tech",
        scope_kind: "thematic",
        activation_state: "active",
        is_current: true,
      },
      {
        id: CORPUS_DRAFT_ID,
        workspace_id: WORKSPACE,
        slug: "folio-draft",
        scope_kind: "thematic",
        activation_state: "draft",
        is_current: true,
      },
      {
        id: CORPUS_EMPTY_ID,
        workspace_id: WORKSPACE,
        slug: "folio-empty",
        scope_kind: "thematic",
        activation_state: "active",
        is_current: true,
      },
      {
        id: CORPUS_OTHER_WS,
        workspace_id: ATTACKER_WORKSPACE,
        slug: "folio-other",
        scope_kind: "thematic",
        activation_state: "active",
        is_current: true,
      },
    ],
    v_corpus_news_sources: [
      {
        source_id: "src-corpus-1",
        source_key: "folio-ai-1",
        source_name: "Folio AI Tech 1",
        publisher: "AI News",
        domain: "ainews.com",
        search_domain: "ainews.com",
        collection_url: "https://ainews.com/feed",
        collection_mode: "rss",
        family: "specialized",
        kredo_category: "ai",
        origin: "corpus",
        corpus_id: CORPUS_FOLIO_ID,
        priority: 1,
        utility_score: 95,
      },
    ],
    veille_digests: [
      {
        id: "digest-1",
        workspace_id: WORKSPACE,
        titre_digest: "Semaine du 7 juillet",
        resume_hebdo: "Consolidation du marché cyber.",
        digest_date: "2026-07-07",
        topic_key: "global",
      },
    ],
    veille_articles: [
      {
        id: "art-1",
        workspace_id: WORKSPACE,
        digest_id: "digest-1",
        titre_fr: "NIS2",
        resume: "Entrée en application.",
        analyse_kredo: "",
        action_commerciale: "",
        published_at: "2026-07-09",
        source_name: "Les Echos",
      },
    ],
  }
})

describe("POST /api/n8n/trigger — Veille Digest Sujet × Corpus V2 (ADR-0022 Lot 2B)", () => {
  // 1. V1 digest continue de passer dans le chemin historique
  it("1. V1 digest continue de passer dans le chemin historique sans résolution V2", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 1,
          triggerMode: "manual",
        },
      }),
    )

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ runId: "run-test-123", status: "queued" })
    expect(mocks.triggerN8nRun).toHaveBeenCalledTimes(1)
    const call = mocks.triggerN8nRun.mock.calls[0]![0] as Record<string, unknown>
    expect(call.workflowId).toBe("veille-ia-marche-on-demand")
    expect(call.entityType).toBe("workspace")
    expect(call.entityId).toBe(WORKSPACE)
    expect(call.input).toEqual({ schemaVersion: 1, triggerMode: "manual" })
    expect(call.inputSnapshot).toBeUndefined()
  })

  // 2. V2 appelle parseDigestLaunchInput
  it("2. V2 valide la forme de l'entrée via parseDigestLaunchInput", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "ia",
          corpusId: CORPUS_FOLIO_ID,
        },
      }),
    )

    expect(response.status).toBe(202)
    expect(mocks.triggerN8nRun).toHaveBeenCalledTimes(1)
  })

  // 3. Payload V2 invalide → HTTP 400
  it("3. payload V2 invalide (topicKey manquant ou triggerMode invalide) → 400", async () => {
    const resNoTopic = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
        },
      }),
    )
    expect(resNoTopic.status).toBe(400)
    await expect(resNoTopic.json()).resolves.toMatchObject({
      error: expect.stringContaining("topicKey est requis"),
    })

    const resBadMode = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "scheduled",
          topicKey: "ia",
        },
      }),
    )
    expect(resBadMode.status).toBe(400)
    await expect(resBadMode.json()).resolves.toMatchObject({
      error: expect.stringContaining("triggerMode"),
    })
  })

  // 4. Topic inconnu → 400
  it("4. topic inconnu (hors registre et hors segments workspace) → 400", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "sujet-inconnu-999",
        },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Sujet inconnu"),
    })
  })

  // Segment invalide (secteur macro au lieu de segment) → 400
  it("4bis. secteur macro fourni au lieu d'un segment → 400", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "macro-industrie",
        },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("est un secteur macro, pas un segment"),
    })
  })

  // 5. Corpus inaccessible → 400
  it("5. corpus inaccessible ou d'un autre workspace → 400", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "ia",
          corpusId: CORPUS_OTHER_WS,
        },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Corpus introuvable ou inaccessible"),
    })
  })

  // 6. Corpus draft → 400
  it("6. corpus en état brouillon (draft) → 400", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "ia",
          corpusId: CORPUS_DRAFT_ID,
        },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("est en brouillon"),
    })
  })

  // 7. Corpus vide → 400
  it("7. corpus sans source collectable → 400", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "ia",
          corpusId: CORPUS_EMPTY_ID,
        },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("ne contient aucune source collectable"),
    })
  })

  // 8. Aucun run créé sur erreur de validation/résolution
  it("8. aucun run créé sur erreur de validation ou de résolution", async () => {
    await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "ia",
          corpusId: CORPUS_DRAFT_ID,
        },
      }),
    )

    expect(mocks.triggerN8nRun).not.toHaveBeenCalled()
  })

  // 9. V2 avec corpus=null résout le socle global
  it("9. V2 avec corpus=null résout le socle global (v_effective_watch_sources)", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "ia",
          corpusId: null,
        },
      }),
    )

    expect(response.status).toBe(202)
    const call = mocks.triggerN8nRun.mock.calls[0]![0] as Record<string, unknown>
    const envelope = call.input as Record<string, unknown>
    expect(envelope.corpusId).toBeNull()
    const sources = envelope.sources as Array<{ sourceKey: string }>
    expect(sources.map((s) => s.sourceKey)).toEqual(["eff-rss-1", "eff-search-2"])
  })

  // 10. V2 avec corpus sélectionné utilise le résultat de v_corpus_news_sources
  it("10. V2 avec corpus sélectionné utilise les sources de v_corpus_news_sources", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "ia",
          corpusId: CORPUS_FOLIO_ID,
        },
      }),
    )

    expect(response.status).toBe(202)
    const call = mocks.triggerN8nRun.mock.calls[0]![0] as Record<string, unknown>
    const envelope = call.input as Record<string, unknown>
    expect(envelope.corpusId).toBe(CORPUS_FOLIO_ID)
    const sources = envelope.sources as Array<{ sourceKey: string }>
    expect(sources.map((s) => s.sourceKey)).toEqual(["folio-ai-1"])
  })

  // 11. Envelope n8n ne contient que les données serveur-résolues
  // 12. Framing envoyé à n8n = framing résolu serveur
  // 13. Sources envoyées = sources résolues serveur
  // 14. topicSectorId provient du résolveur
  // 15. corpusId envoyé à n8n provient du corpus résolu
  // 16. generationMode n'est pas contrôlable par le navigateur
  it("11-16. L'enveloppe n8n est strictement serveur-résolue et protège contre les injections navigateur", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "seg-cyber-b2b",
          corpusId: CORPUS_FOLIO_ID,
          // Attributs injectés par un client malveillant : doivent être ignorés ou écrasés
          generationMode: "hacked",
          sourceCorpusId: "fake-id",
          framing: "Framing pirate !",
          sources: [{ sourceId: "fake", sourceName: "Fake", searchDomain: "fake.com", collectionMode: "rss" }],
          topicSectorId: "hacked-sector-id",
        },
      }),
    )

    expect(response.status).toBe(202)
    const call = mocks.triggerN8nRun.mock.calls[0]![0] as Record<string, unknown>
    const envelope = call.input as Record<string, unknown>

    // 11. Données serveur-résolues
    expect(envelope.schemaVersion).toBe(2)
    expect(envelope.triggerMode).toBe("manual")

    // 12. Framing serveur
    expect(envelope.framing).toContain("# CONTEXTE — Veille commerciale KREDO")
    expect(envelope.framing).toContain("Cybersécurité B2B")
    expect(envelope.framing).not.toContain("Framing pirate !")

    // 13. Sources serveur
    const sources = envelope.sources as Array<{ sourceKey: string }>
    expect(sources.map((s) => s.sourceKey)).toEqual(["folio-ai-1"])

    // 14. topicSectorId provient de la table sector_intelligence
    expect(envelope.topicSectorId).toBe(SECTOR_SEGMENT_ID)

    // 15. corpusId provient du corpus résolu
    expect(envelope.corpusId).toBe(CORPUS_FOLIO_ID)

    // 16. generationMode non présent / non contrôlable
    expect(envelope).not.toHaveProperty("generationMode")
    expect(envelope).not.toHaveProperty("sourceCorpusId")
  })

  // 17. input_snapshot ne contient pas le framing complet
  // 18. input_snapshot contient topic/corpus/stats/source IDs
  it("17-18. input_snapshot est compact, sans framing complet, et trace topic/corpus/stats/sources", async () => {
    await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "ia",
          corpusId: CORPUS_FOLIO_ID,
        },
      }),
    )

    const call = mocks.triggerN8nRun.mock.calls[0]![0] as Record<string, unknown>
    const snapshot = call.inputSnapshot as Record<string, unknown>

    // 17. Pas de framing complet
    expect(snapshot).not.toHaveProperty("framing")

    // 18. Clés requises
    expect(snapshot.schemaVersion).toBe(2)
    expect(snapshot.triggerMode).toBe("manual")
    expect(snapshot.requested).toEqual({
      topicKey: "ia",
      corpusId: CORPUS_FOLIO_ID,
    })
    const resolved = snapshot.resolved as Record<string, unknown>
    expect(resolved.topicKey).toBe("ia")
    expect(resolved.topicLabel).toBe("Intelligence artificielle")
    expect(resolved.corpus).toEqual({
      id: CORPUS_FOLIO_ID,
      slug: "folio-ai-tech",
      scopeKind: "thematic",
    })
    expect(resolved.stats).toEqual({
      sourcesCount: 1,
      rssCount: 1,
      siteSearchCount: 0,
    })
    expect(resolved.sources).toEqual([
      {
        sourceId: "src-corpus-1",
        sourceKey: "folio-ai-1",
        sourceName: "Folio AI Tech 1",
        corpusId: CORPUS_FOLIO_ID,
      },
    ])
  })

  // 19. Run créé avec entityType=workspace
  // 20. Réponse succès = 202 + runId
  it("19-20. Run créé avec entityType=workspace et réponse 202 + runId", async () => {
    const response = await POST(
      createRequest({
        workflowId: "veille-ia-marche-on-demand",
        input: {
          schemaVersion: 2,
          triggerMode: "manual",
          topicKey: "ia",
          corpusId: null,
        },
      }),
    )

    expect(response.status).toBe(202)
    const json = await response.json()
    expect(json).toEqual({ runId: "run-test-123", status: "queued" })

    const call = mocks.triggerN8nRun.mock.calls[0]![0] as Record<string, unknown>
    expect(call.entityType).toBe("workspace")
    expect(call.entityId).toBe(WORKSPACE)
    expect(call.companyId).toBeNull()
    expect(call.workspaceId).toBe(WORKSPACE)
    expect(call.userId).toBe(USER)
  })

  // 21. Chemin INTEL-021 V2 inchangé
  it("21. Le chemin INTEL-021 V2 reste pleinement fonctionnel", async () => {
    const response = await POST(
      createRequest({
        workflowId: "intel-021-monthly-watch-analysis",
        input: {
          schemaVersion: 2,
          triggerMode: "manual_custom",
          intention: "Analyse d'opportunités",
          requestedAt: "2026-08-19T12:00:00.000Z",
          sources: [
            { kind: "digest", digestId: "digest-1", articleIds: ["art-1"] },
          ],
        },
      }),
    )

    expect(response.status).toBe(202)
    const call = mocks.triggerN8nRun.mock.calls[0]![0] as Record<string, unknown>
    expect(call.workflowId).toBe("intel-021-monthly-watch-analysis")
    expect(call.entityType).toBe("workspace")
  })

  // 22. Missions ADR-0020 inchangées
  it("22. Le lancement des missions d'intelligence ADR-0020 reste intact", async () => {
    const response = await POST(
      createRequest({
        missionSlug: "veille-analyse-mensuelle",
        selectors: [{ kind: "veille_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" }],
      }),
    )

    expect(response.status).toBe(202)
    const call = mocks.triggerN8nRun.mock.calls[0]![0] as Record<string, unknown>
    expect(call.workflowId).toBe("mission-001-run")
  })

  // 23. Aucun changement V1 pour les autres workflows
  it("23. Aucun changement pour les autres workflows (ex. intel-022-campaign)", async () => {
    const response = await POST(
      createRequest({
        workflowId: "intel-022-campaign",
        companyId: "33333333-0000-0000-0000-000000000000",
        input: { campaignType: "outbound" },
      }),
    )

    expect(response.status).toBe(202)
    const call = mocks.triggerN8nRun.mock.calls[0]![0] as Record<string, unknown>
    expect(call.workflowId).toBe("intel-022-campaign")
    expect(call.entityType).toBe("company")
    expect(call.companyId).toBe("33333333-0000-0000-0000-000000000000")
  })
})

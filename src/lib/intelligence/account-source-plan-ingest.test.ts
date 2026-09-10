import { describe, expect, it, vi } from "vitest"
import {
  buildPlanEntries,
  computeCoverage,
  dedupeByContentHash,
  ingestAccountSourcePlan,
  type IncomingSourceDocument,
} from "./account-source-plan-ingest"

const RUN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const WORKSPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const COMPANY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

function doc(over: Partial<IncomingSourceDocument> = {}): IncomingSourceDocument {
  return {
    url: "https://tournaire.fr/metiers",
    domain: "tournaire.fr",
    kind: "company_official",
    origin: "discovered",
    status: "retrieved",
    serves_modules: ["business_and_offering"],
    reason: "Présentation officielle des activités",
    fetched_at: "2026-09-10T10:00:00.000Z",
    content_hash: "hash-a",
    extracted_text: "Tournaire conçoit et fabrique des emballages barrière.",
    ...over,
  }
}

/** Client Supabase minimal : capture les lignes insérées, rend des ids déterministes. */
function fakeSupabase(options: { failWith?: string } = {}) {
  const inserted: Record<string, unknown>[] = []
  const client = {
    from: vi.fn(() => ({
      insert: (rows: Record<string, unknown>[]) => {
        inserted.push(...rows)
        return {
          select: async () =>
            options.failWith
              ? { data: null, error: { message: options.failWith } }
              : {
                  data: rows.map((row, index) => ({ id: `doc-${index}`, url: row.url })),
                  error: null,
                },
        }
      },
    })),
  }
  return { client: client as never, inserted }
}

function input(documents: IncomingSourceDocument[]) {
  return {
    runId: RUN,
    workspaceId: WORKSPACE,
    companyId: COMPANY,
    targetLevel: 2 as const,
    requestedModules: ["business_and_offering", "competition"] as never,
    entityResolution: { siren: "415550110" },
    documents,
  }
}

describe("normalisation des documents entrants", () => {
  it("écrit un document réellement lu", async () => {
    const { client, inserted } = fakeSupabase()
    const result = await ingestAccountSourcePlan(client, input([doc()]))
    expect(result.ok).toBe(true)
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({ status: "retrieved", extracted_chars: 54 })
  })

  it("refuse un `retrieved` sans texte, avec un motif lisible", async () => {
    const { client, inserted } = fakeSupabase()
    const result = await ingestAccountSourcePlan(
      client,
      input([doc({ extracted_text: null })])
    )
    expect(result.ok).toBe(false)
    expect(inserted).toHaveLength(0)
    expect(result.rejected[0].reason).toMatch(/sans texte/)
  })

  it("refuse un `unreachable` sans motif — un échec s'explique", async () => {
    const { client } = fakeSupabase()
    const result = await ingestAccountSourcePlan(
      client,
      input([doc({ status: "unreachable", extracted_text: null, content_hash: null, fetched_at: null })])
    )
    expect(result.ok).toBe(false)
    expect(result.rejected[0].reason).toMatch(/sans motif/)
  })

  it("conserve un `unreachable` motivé : il doit être VU, pas caché", async () => {
    const { client, inserted } = fakeSupabase()
    const result = await ingestAccountSourcePlan(
      client,
      input([
        doc(),
        doc({
          url: "https://usinenouvelle.fr/article",
          status: "unreachable",
          extracted_text: null,
          content_hash: null,
          fetched_at: null,
          failure_reason: "403 — accès refusé",
          http_status: 403,
        }),
      ])
    )
    expect(result.ok).toBe(true)
    expect(inserted).toHaveLength(2)
    if (result.ok) {
      const unreachable = result.content.entries.find((entry) => entry.status === "unreachable")
      expect(unreachable?.failure_reason).toBe("403 — accès refusé")
    }
  })

  it("ignore les libellés d'interface et ne garde que les modules canoniques", async () => {
    const { client, inserted } = fakeSupabase()
    await ingestAccountSourcePlan(
      client,
      input([doc({ serves_modules: ["business_and_offering", "Fiche d’identité", "competition"] })])
    )
    expect(inserted[0].serves_modules).toEqual(["business_and_offering", "competition"])
  })

  it("rejette un type de source ou une origine hors contrat", async () => {
    const { client } = fakeSupabase()
    const result = await ingestAccountSourcePlan(
      client,
      input([doc({ kind: "blog_perso" }), doc({ url: "https://x.fr/b", origin: "magique" })])
    )
    expect(result.ok).toBe(false)
    expect(result.rejected.map((r) => r.reason).join(" ")).toMatch(/Type de source inconnu/)
    expect(result.rejected.map((r) => r.reason).join(" ")).toMatch(/Origine inconnue/)
  })

  it("déduit le domaine quand il manque", async () => {
    const { client, inserted } = fakeSupabase()
    await ingestAccountSourcePlan(client, input([doc({ domain: null, url: "https://www.Tournaire.fr/a" })]))
    expect(inserted[0].domain).toBe("tournaire.fr")
  })

  it("borne le texte extrait", async () => {
    const { client, inserted } = fakeSupabase()
    await ingestAccountSourcePlan(client, input([doc({ extracted_text: "x".repeat(50_000) })]))
    expect(inserted[0].extracted_chars).toBe(20_000)
  })
})

describe("frontière tenant", () => {
  it("reparente systématiquement sur le workspace et le compte du run", async () => {
    const { client, inserted } = fakeSupabase()
    await ingestAccountSourcePlan(
      client,
      // Le payload tente de désigner un autre tenant : il est ignoré.
      input([doc({ ...(({ workspace_id: "autre", company_id: "autre" }) as object) })])
    )
    expect(inserted[0]).toMatchObject({ workspace_id: WORKSPACE, company_id: COMPANY, run_id: RUN })
  })
})

describe("déduplication", () => {
  it("garde la première occurrence d'un contenu identique", () => {
    const rows = [
      { url: "https://a.fr", content_hash: "h1" },
      { url: "https://b.fr", content_hash: "h1" },
      { url: "https://c.fr", content_hash: "h2" },
    ] as never
    const { kept, duplicates } = dedupeByContentHash(rows)
    expect(kept).toHaveLength(2)
    expect(duplicates[0].reason).toMatch(/Contenu identique/)
  })

  it("écarte une URL répétée dans le même plan", () => {
    const rows = [
      { url: "https://a.fr", content_hash: "h1" },
      { url: "https://a.fr", content_hash: "h2" },
    ] as never
    const { kept, duplicates } = dedupeByContentHash(rows)
    expect(kept).toHaveLength(1)
    expect(duplicates[0].reason).toMatch(/déjà présente/)
  })

  it("ne déduplique pas deux échecs, qui n'ont pas de hash", () => {
    const rows = [
      { url: "https://a.fr", content_hash: null },
      { url: "https://b.fr", content_hash: null },
    ] as never
    expect(dedupeByContentHash(rows).kept).toHaveLength(2)
  })
})

describe("couverture", () => {
  it("ne compte jamais un document injoignable comme matière", () => {
    const entries = buildPlanEntries([
      { id: "1", url: "u", status: "unreachable", serves_modules: ["competition"], canonical_url: null, domain: "d", title: null, published_at: null, kind: "press", reason: null, origin: "discovered", fetched_at: null, content_hash: null, extracted_chars: null, failure_reason: "403" },
    ] as never)
    const coverage = computeCoverage(entries, ["competition"] as never)
    expect(coverage.modules_without_material).toEqual(["competition"])
    expect(coverage.modules_with_material).toEqual([])
  })

  it("signale précisément les modules demandés sans matière", async () => {
    const { client } = fakeSupabase()
    const result = await ingestAccountSourcePlan(client, input([doc()]))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.content.coverage.modules_with_material).toEqual(["business_and_offering"])
      expect(result.content.coverage.modules_without_material).toEqual(["competition"])
    }
  })

  it("un document injoignable n'arrive jamais au statut `recommended`", async () => {
    const { client } = fakeSupabase()
    const result = await ingestAccountSourcePlan(
      client,
      input([
        doc(),
        doc({ url: "https://ko.fr", status: "unreachable", extracted_text: null, content_hash: null, fetched_at: null, failure_reason: "timeout" }),
      ])
    )
    if (result.ok) {
      expect(result.content.entries.every((e) => e.status !== "approved")).toBe(true)
      expect(result.content.entries.find((e) => e.url === "https://ko.fr")?.status).toBe("unreachable")
    }
  })
})

describe("échecs d'écriture", () => {
  it("remonte l'erreur Supabase sans publier de plan", async () => {
    const { client } = fakeSupabase({ failWith: "violation de contrainte" })
    const result = await ingestAccountSourcePlan(client, input([doc()]))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/violation de contrainte/)
  })

  it("ne publie pas de plan quand tout est rejeté", async () => {
    const { client } = fakeSupabase()
    const result = await ingestAccountSourcePlan(client, input([doc({ url: null })]))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Aucun document exploitable/)
  })
})

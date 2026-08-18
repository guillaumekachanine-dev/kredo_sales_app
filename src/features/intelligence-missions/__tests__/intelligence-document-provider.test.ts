import { describe, expect, it } from "vitest"
import { intelligenceDocumentProvider } from "../data/corpus/intelligence-document-provider"
import { createFakeSupabase, type FakeDataset } from "./fake-supabase"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const OTHER_WORKSPACE = "22222222-2222-2222-2222-222222222222"

const LIVE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const ARCHIVED_BY_DATE = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
const ARCHIVED_BY_STATUS = "cccccccc-cccc-cccc-cccc-cccccccccccc"
const JSON_ONLY = "dddddddd-dddd-dddd-dddd-dddddddddddd"
const EMPTY = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
const FOREIGN = "ffffffff-ffff-ffff-ffff-ffffffffffff"
const MISSING = "99999999-9999-9999-9999-999999999999"

const DATASET: FakeDataset = {
  intelligence_documents: [
    {
      id: LIVE,
      workspace_id: WORKSPACE,
      title: "Stratégie commerciale Q3",
      document_type: "commercial_strategy",
      status: "ready",
      archived_at: null,
      updated_at: "2026-08-01T09:00:00Z",
      current_content_text: "  Trois axes prioritaires.  ",
      current_content_json: { ignored: true },
    },
    {
      id: ARCHIVED_BY_DATE,
      workspace_id: WORKSPACE,
      title: "Note obsolète",
      document_type: "internal_note",
      status: "ready",
      archived_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      current_content_text: "Contenu périmé.",
      current_content_json: {},
    },
    {
      id: ARCHIVED_BY_STATUS,
      workspace_id: WORKSPACE,
      title: "Note retirée",
      document_type: "internal_note",
      status: "archived",
      archived_at: null,
      updated_at: "2026-05-02T00:00:00Z",
      current_content_text: "Contenu retiré.",
      current_content_json: {},
    },
    {
      id: JSON_ONLY,
      workspace_id: WORKSPACE,
      title: "Diagnostic structuré",
      document_type: "workspace_diagnostic",
      status: "draft",
      archived_at: null,
      updated_at: "2026-07-15T00:00:00Z",
      current_content_text: null,
      current_content_json: { synthese: "Marge sous pression" },
    },
    {
      id: EMPTY,
      workspace_id: WORKSPACE,
      title: "Coquille vide",
      document_type: "internal_note",
      status: "draft",
      archived_at: null,
      updated_at: "2026-07-16T00:00:00Z",
      current_content_text: "   ",
      current_content_json: {},
    },
    {
      id: FOREIGN,
      workspace_id: OTHER_WORKSPACE,
      title: "Document du workspace voisin",
      document_type: "internal_note",
      status: "ready",
      archived_at: null,
      updated_at: "2026-07-20T00:00:00Z",
      current_content_text: "Ne doit jamais sortir.",
      current_content_json: {},
    },
  ],
}

describe("intelligenceDocumentProvider", () => {
  it("déclare une exécution sous RLS utilisateur", () => {
    expect(intelligenceDocumentProvider.execution).toBe("user_rls")
  })

  it("hydrate le texte courant, coupé de ses espaces", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await intelligenceDocumentProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      { kind: "intelligence_document", ids: [LIVE] },
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      title: "Stratégie commerciale Q3",
      provenance: "intelligence_documents · commercial_strategy",
      content: "Trois axes prioritaires.",
      date: "2026-08-01T09:00:00Z",
    })
  })

  it("retombe sur le contenu JSON quand le texte est absent", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await intelligenceDocumentProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      { kind: "intelligence_document", ids: [JSON_ONLY] },
    )
    expect(result.items[0].content).toContain("Marge sous pression")
  })

  it("ignore les documents archivés ET le dit dans la trace", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await intelligenceDocumentProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      { kind: "intelligence_document", ids: [ARCHIVED_BY_DATE, ARCHIVED_BY_STATUS] },
    )

    expect(result.items).toEqual([])
    expect(result.exclusions.map((exclusion) => exclusion.reason)).toEqual(["archived", "archived"])
    expect(result.exclusions[0].title).toBe("Note obsolète")
    expect(JSON.stringify(result)).not.toContain("Contenu périmé")
  })

  it("trace un identifiant illisible sans dire s'il existe ailleurs", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await intelligenceDocumentProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      { kind: "intelligence_document", ids: [FOREIGN, MISSING] },
    )

    expect(result.items).toEqual([])
    expect(result.exclusions).toHaveLength(2)
    for (const exclusion of result.exclusions) {
      expect(exclusion.reason).toBe("not_found")
      expect(exclusion.title).toBe("Document introuvable")
    }
    expect(JSON.stringify(result)).not.toContain("Ne doit jamais sortir")
  })

  it("trace aussi un document vide de contenu", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await intelligenceDocumentProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      { kind: "intelligence_document", ids: [EMPTY] },
    )
    expect(result.items).toEqual([])
    expect(result.exclusions[0].reason).toBe("not_found")
    expect(result.exclusions[0].title).toBe("Coquille vide")
  })

  it("suit l'ordre des identifiants demandés, pas celui de la base", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await intelligenceDocumentProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      { kind: "intelligence_document", ids: [JSON_ONLY, LIVE] },
    )
    expect(result.items.map((item) => item.ref.id)).toEqual([JSON_ONLY, LIVE])
  })

  it("filtre explicitement sur le workspace et n'interroge rien pour une liste vide", async () => {
    const fake = createFakeSupabase(DATASET)
    await intelligenceDocumentProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      { kind: "intelligence_document", ids: [LIVE] },
    )
    expect(fake.calls[0].eq).toContainEqual(["workspace_id", WORKSPACE])

    const empty = createFakeSupabase(DATASET)
    const result = await intelligenceDocumentProvider.resolve(
      { workspaceId: WORKSPACE, supabase: empty.supabase },
      { kind: "intelligence_document", ids: [] },
    )
    expect(result).toEqual({ items: [], exclusions: [] })
    expect(empty.tablesRead()).toEqual([])
  })
})

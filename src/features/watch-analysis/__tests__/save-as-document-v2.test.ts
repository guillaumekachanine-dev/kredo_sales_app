import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/(app)/reports/_data/reports-actions", () => ({
  createReportsServiceClient: vi.fn(),
  saveAsDocumentWithClient: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { saveAsDocumentWithClient } from "@/app/(app)/reports/_data/reports-actions"
import { isManualCustomWatchAnalysisSnapshot, saveResultAsDocumentWithSupabaseClient } from "@/components/accounts-contacts/intelligence/save-as-document"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const mockedSaveAsDocumentWithClient = vi.mocked(saveAsDocumentWithClient)

function createPersistenceFakeSupabase(dataset: {
  ai_intelligence_results?: Record<string, unknown>[]
  ai_intelligence_runs?: Record<string, unknown>[]
  intelligence_documents?: Record<string, unknown>[]
}) {
  const calls: { table?: string; rpc?: string; args?: unknown }[] = []
  const insertedDocuments: Record<string, unknown>[] = []
  const insertedVersions: Record<string, unknown>[] = []

  const client = {
    from(table: string) {
      calls.push({ table })
      let rows = dataset[table as keyof typeof dataset] ? [...(dataset[table as keyof typeof dataset]!)] : []
      if (table === "intelligence_documents") {
        rows = [...rows, ...insertedDocuments]
      }
      if (table === "intelligence_document_versions") {
        rows = [...rows, ...insertedVersions]
      }

      const builder = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          rows = rows.filter((r) => r[col] === val)
          return builder
        },
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        single: async () => ({ data: rows[0] ?? null, error: rows[0] ? null : { message: "Not found" } }),
        insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => {
          const payloadRows = Array.isArray(payload) ? payload : [payload]
          if (table === "intelligence_documents") {
            for (const r of payloadRows) {
              const doc = { id: `doc-${insertedDocuments.length + 1}`, ...r }
              insertedDocuments.push(doc)
            }
            return {
              select: () => ({
                single: async () => ({ data: insertedDocuments[insertedDocuments.length - 1], error: null }),
              }),
              data: insertedDocuments[insertedDocuments.length - 1],
              error: null,
            }
          }
          if (table === "intelligence_document_versions") {
            for (const r of payloadRows) {
              insertedVersions.push({ id: `ver-${insertedVersions.length + 1}`, ...r })
            }
            return { data: insertedVersions[insertedVersions.length - 1], error: null }
          }
          if (table === "intelligence_document_links") {
            return { data: null, error: null }
          }
          return { data: null, error: null }
        },
      }
      return builder
    },
    rpc(fnName: string, args: Record<string, unknown>) {
      calls.push({ rpc: fnName, args })
      if (fnName === "upsert_strategic_watch_document") {
        return Promise.resolve({ data: "doc-rpc-v1-id", error: null })
      }
      return Promise.resolve({ data: null, error: { message: `RPC ${fnName} unknown` } })
    },
  }

  return {
    calls,
    insertedDocuments,
    insertedVersions,
    supabase: client as unknown as SupabaseClient<Database>,
  }
}

describe("saveResultAsDocumentWithSupabaseClient — V1 & V2 Watch Analysis", () => {
  it("isManualCustomWatchAnalysisSnapshot identifie strictement le V2 manual_custom", async () => {
    expect(await isManualCustomWatchAnalysisSnapshot({ schemaVersion: 2, triggerMode: "manual_custom" })).toBe(true)
    expect(await isManualCustomWatchAnalysisSnapshot({ schemaVersion: 1, triggerMode: "manual" })).toBe(false)
    expect(await isManualCustomWatchAnalysisSnapshot({ schemaVersion: 2, triggerMode: "scheduled" })).toBe(false)
    expect(await isManualCustomWatchAnalysisSnapshot(null)).toBe(false)
    expect(await isManualCustomWatchAnalysisSnapshot("Analyse à la demande")).toBe(false)
  })

  it("exécute la RPC mensuelle pour une analyse V1 avec période", async () => {
    const fake = createPersistenceFakeSupabase({
      ai_intelligence_results: [
        {
          id: "res-v1",
          run_id: "run-v1",
          status: "succeeded",
          result_type: "strategic_watch_analysis",
          title: "Analyse mensuelle de 2026-07",
          content_json: {
            schemaVersion: 1,
            period: { start: "2026-07-01", end: "2026-07-31", label: "juillet 2026" },
            executiveSummary: "Synthèse V1",
            coverage: { digestsCount: 4, articlesCount: 20, sourcesCount: 5 },
          },
          workspace_id: "ws-1",
          source_refs: [],
          qa_flags: [],
        },
      ],
      ai_intelligence_runs: [
        {
          id: "run-v1",
          workspace_id: "ws-1",
          input_snapshot: { schemaVersion: 1, periodStart: "2026-07-01", periodEnd: "2026-07-31" },
        },
      ],
    })

    const res = await saveResultAsDocumentWithSupabaseClient(fake.supabase, "res-v1")
    expect(res.success).toBe(true)
    expect(res.documentId).toBe("doc-rpc-v1-id")

    const rpcCall = fake.calls.find((c) => c.rpc === "upsert_strategic_watch_document")
    expect(rpcCall).toBeDefined()
    expect((rpcCall?.args as Record<string, unknown>).p_period_start).toBe("2026-07-01")
  })

  it("retourne une erreur pour V1 sans période", async () => {
    const fake = createPersistenceFakeSupabase({
      ai_intelligence_results: [
        {
          id: "res-v1-bad",
          run_id: "run-v1-bad",
          status: "succeeded",
          result_type: "strategic_watch_analysis",
          title: "Analyse mensuelle malformée",
          content_json: { schemaVersion: 1, executiveSummary: "Sans période" },
          workspace_id: "ws-1",
        },
      ],
      ai_intelligence_runs: [
        { id: "run-v1-bad", workspace_id: "ws-1", input_snapshot: { schemaVersion: 1 } },
      ],
    })

    const res = await saveResultAsDocumentWithSupabaseClient(fake.supabase, "res-v1-bad")
    expect(res.error).toBe("Période mensuelle absente du résultat d’analyse stratégique")
  })

  it("sauvegarde une analyse V2 manual_custom comme document autonome sans appeler la RPC mensuelle", async () => {
    mockedSaveAsDocumentWithClient.mockReset()
    mockedSaveAsDocumentWithClient.mockResolvedValueOnce({ success: true, documentId: "doc-1" })
    const fake = createPersistenceFakeSupabase({
      ai_intelligence_results: [
        {
          id: "res-v2-123",
          run_id: "run-v2-123",
          status: "succeeded",
          result_type: "strategic_watch_analysis",
          title: "Impact du règlement IA sur la santé",
          content_json: {
            schemaVersion: 2,
            analysisKind: "manual_custom",
            title: "Impact du règlement IA sur la santé",
            executiveSummary: "Synthèse à la demande",
            coverage: {
              sourceGroups: 2,
              resolvedRefs: 3,
              articlesCount: 5,
              signalsCount: 2,
              documentsCount: 1,
              totalItems: 8,
            },
            majorTrends: [],
            weakSignals: [],
            regulatoryDevelopments: [],
            commercialOpportunities: [],
            risksAndWatchpoints: [],
            priorityActions: [],
          },
          workspace_id: "ws-1",
          source_refs: [{ kind: "veille_article", id: "art-1" }],
          qa_flags: [{ check: "evidence_traceability", passed: true }],
        },
      ],
      ai_intelligence_runs: [
        {
          id: "run-v2-123",
          workspace_id: "ws-1",
          input_snapshot: {
            schemaVersion: 2,
            triggerMode: "manual_custom",
            intention: "Impact santé",
            resolutionStats: { sourceGroups: 2, resolvedRefs: 3 },
          },
        },
      ],
    })

    const res = await saveResultAsDocumentWithSupabaseClient(fake.supabase, "res-v2-123")
    expect(res.success).toBe(true)
    expect(res.documentId).toBe("doc-1")

    const rpcCall = fake.calls.find((c) => c.rpc === "upsert_strategic_watch_document")
    expect(rpcCall).toBeUndefined()

    expect(mockedSaveAsDocumentWithClient).toHaveBeenCalled()
    const callArgs = mockedSaveAsDocumentWithClient.mock.calls[0]
    expect(callArgs[2]).toBeDefined()
    const payload = callArgs[2] as Record<string, unknown>
    expect(payload.periodStart).toBeNull()
    expect(payload.periodEnd).toBeNull()
    expect(payload.documentType).toBe("strategic_watch_analysis")
    expect((payload.scopeJson as Record<string, unknown>).analysisKind).toBe("manual_custom")
  })

  it("garantit l'idempotence si le même resultId V2 est appelé deux fois", async () => {
    const fake = createPersistenceFakeSupabase({
      intelligence_documents: [
        { id: "existing-doc-v2", source_result_id: "res-v2-dup" },
      ],
      ai_intelligence_results: [
        {
          id: "res-v2-dup",
          run_id: "run-v2-dup",
          status: "succeeded",
          result_type: "strategic_watch_analysis",
          title: "Analyse V2 existante",
          content_json: { schemaVersion: 2, analysisKind: "manual_custom", title: "Existante" },
        },
      ],
      ai_intelligence_runs: [
        {
          id: "run-v2-dup",
          workspace_id: "ws-1",
          input_snapshot: { schemaVersion: 2, triggerMode: "manual_custom" },
        },
      ],
    })

    const res = await saveResultAsDocumentWithSupabaseClient(fake.supabase, "res-v2-dup")
    expect(res.success).toBe(true)
    expect(res.alreadyExists).toBe(true)
    expect(res.documentId).toBe("existing-doc-v2")
  })
})

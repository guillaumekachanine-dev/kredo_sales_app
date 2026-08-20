import { describe, expect, it, vi } from "vitest"
import { ingestMasterStudyE4 } from "./ingest-master-study"
import type { MasterStudyE4RpcPayload } from "../domain/e4-contracts"

describe("ingestMasterStudyE4", () => {
  const dummyPayload: MasterStudyE4RpcPayload = {
    segment_id: "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6",
    study_snapshot_date: "2026-08-14",
    run: {
      input_snapshot: {},
      config: { source: "test" },
    },
    document: {
      title: "Master Study Test",
      content_text: null,
      content_json: {},
      scope_json: {},
    },
    sector_patch: {
      description: "Test description",
      market_size_eur_bn: null,
      market_growth_pct: null,
      resolution_locks: {},
      playbook_patch: {},
      caveats_patch: {},
    },
    events: [],
    pain_points: [],
    regulatory_items: [],
    value_chain_nodes: [],
  }

  it("appelle la RPC ingest_master_study_e4 avec le payload formaté et retourne run_id / document_id", async () => {
    const mockRpc = vi.fn(async () => ({
      data: {
        run_id: "run-uuid-123",
        document_id: "doc-uuid-456",
        segment_id: "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6",
      },
      error: null,
    }))

    const mockSupabase = {
      rpc: mockRpc,
    } as unknown as NonNullable<Parameters<typeof ingestMasterStudyE4>[1]>["supabase"]

    const result = await ingestMasterStudyE4(dummyPayload, { supabase: mockSupabase })

    expect(mockRpc).toHaveBeenCalledWith("ingest_master_study_e4", {
      p_payload: dummyPayload,
    })
    expect(result.success).toBe(true)
    expect(result.runId).toBe("run-uuid-123")
    expect(result.documentId).toBe("doc-uuid-456")
    expect(result.segmentId).toBe("db34f8a0-9d9e-4585-acd6-2fbbdd1baad6")
    expect(result.error).toBeNull()
  })

  it("gère une erreur de la RPC et renvoie success: false avec le message d'erreur", async () => {
    const mockRpc = vi.fn(async () => ({
      data: null,
      error: {
        message: "Segment introuvable ou hors workspace",
        details: "Détail technique",
        hint: "",
        code: "P0001",
      },
    }))

    const mockSupabase = {
      rpc: mockRpc,
    } as unknown as NonNullable<Parameters<typeof ingestMasterStudyE4>[1]>["supabase"]

    const result = await ingestMasterStudyE4(dummyPayload, { supabase: mockSupabase })

    expect(result.success).toBe(false)
    expect(result.runId).toBeNull()
    expect(result.documentId).toBeNull()
    expect(result.error).toBe("Segment introuvable ou hors workspace")
  })
})

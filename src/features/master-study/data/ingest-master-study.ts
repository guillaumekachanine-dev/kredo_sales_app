import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/types/database"
import type { MasterStudyE4RpcPayload } from "../domain/e4-contracts"

export type IngestMasterStudyE4Result = {
  success: boolean
  runId: string | null
  documentId: string | null
  segmentId: string | null
  error: string | null
}

/**
 * Exécute la RPC transactionnelle `public.ingest_master_study_e4`.
 * Tout entre (run, document, version, sector_patch, items), ou rien n'entre.
 */
export async function ingestMasterStudyE4(
  payload: MasterStudyE4RpcPayload,
  options?: {
    supabase?: SupabaseClient<Database>
  },
): Promise<IngestMasterStudyE4Result> {
  const supabase = options?.supabase ?? (await createClient())

  const { data, error } = await supabase.rpc("ingest_master_study_e4", {
    p_payload: payload as unknown as Json,
  })

  if (error) {
    return {
      success: false,
      runId: null,
      documentId: null,
      segmentId: null,
      error: error.message || error.details || "Échec de l'ingestion Master Study",
    }
  }

  const result = (data ?? {}) as {
    run_id?: string
    document_id?: string
    segment_id?: string
  }

  return {
    success: true,
    runId: result.run_id ?? null,
    documentId: result.document_id ?? null,
    segmentId: result.segment_id ?? null,
    error: null,
  }
}

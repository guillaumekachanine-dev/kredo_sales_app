import "server-only"

import { createClient } from "@/lib/supabase/server"
import { parseWorkspaceDiagnostic } from "./parse-diagnostic-content"
import type { WorkspaceDiagnosticSnapshot } from "./workspace-diagnostic-types"

type DiagnosticDocumentRow = {
  id: string
  created_at: string
  current_content_json: unknown
}

export async function getWorkspaceDiagnostic(): Promise<WorkspaceDiagnosticSnapshot | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.workspace_id) return null

  const { data, error } = await supabase
    .from("intelligence_documents")
    .select("id,created_at,current_content_json")
    .eq("workspace_id", profile.workspace_id)
    .eq("document_type", "workspace_diagnostic")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[workspace-diagnostic] latest document query failed", error.message)
    return null
  }
  if (!data) return null

  const row = data as DiagnosticDocumentRow
  const parsed = parseWorkspaceDiagnostic(row.current_content_json, {
    allowMonoAxisCorrelations: true,
  })
  if (!parsed.ok) {
    console.error("[workspace-diagnostic] invalid persisted content", {
      documentId: row.id,
      error: parsed.error,
    })
    return null
  }

  return {
    documentId: row.id,
    createdAt: row.created_at,
    diagnostic: parsed.value,
  }
}

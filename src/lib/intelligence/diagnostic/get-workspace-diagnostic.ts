import "server-only"

import { createClient } from "@/lib/supabase/server"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { parseWorkspaceDiagnostic } from "./parse-diagnostic-content"
import type { WorkspaceDiagnosticSnapshot } from "./workspace-diagnostic-types"

type DiagnosticDocumentRow = {
  id: string
  created_at: string
  current_content_json: unknown
}

export async function getWorkspaceDiagnostic(): Promise<WorkspaceDiagnosticSnapshot | null> {
  const workspaceId = await resolveCurrentWorkspaceId()
  if (!workspaceId) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("intelligence_documents")
    .select("id,created_at,current_content_json")
    .eq("workspace_id", workspaceId)
    .eq("document_type", "workspace_diagnostic")
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    console.error("[workspace-diagnostic] latest document query failed", error.message)
    return null
  }
  if (!data || data.length === 0) return null

  const rows = data as DiagnosticDocumentRow[]
  for (const row of rows) {
    const parsed = parseWorkspaceDiagnostic(row.current_content_json, {
      allowMonoAxisCorrelations: true,
    })
    if (parsed.ok) {
      return {
        documentId: row.id,
        createdAt: row.created_at,
        diagnostic: parsed.value,
      }
    }
  }

  const latestRow = rows[0]
  const firstParsed = parseWorkspaceDiagnostic(latestRow.current_content_json, {
    allowMonoAxisCorrelations: true,
  })
  if (!firstParsed.ok) {
    console.error(
      `[workspace-diagnostic] invalid persisted content (document ${latestRow.id}): ${firstParsed.error}`
    )
  }

  return null
}

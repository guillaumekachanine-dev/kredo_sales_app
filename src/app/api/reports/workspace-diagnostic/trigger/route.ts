import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { triggerN8nRun } from "@/lib/n8n/trigger-run"
import type { WorkspaceDiagnosticTriggerInput } from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"
import type { TriggerErrorResponse, TriggerResponse } from "@/lib/n8n/types"

type TriggerBody = {
  asOfDate?: string
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function POST(request: Request) {
  console.info("[workspace-diagnostic/trigger] request received")
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json<TriggerErrorResponse>({ error: "Non authentifié" }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.workspace_id) {
    console.error("[workspace-diagnostic/trigger] workspace resolution failed", profileError?.message)
    return NextResponse.json<TriggerErrorResponse>({ error: "Workspace introuvable" }, { status: 403 })
  }

  let body: TriggerBody = {}
  try {
    body = await request.json() as TriggerBody
  } catch {
    // Body optionnel : un POST sans JSON cible la date courante.
  }

  const asOfDate = body.asOfDate ?? toDateKey(new Date())
  if (!isDateKey(asOfDate)) {
    return NextResponse.json<TriggerErrorResponse>({ error: "asOfDate invalide" }, { status: 400 })
  }

  const input: WorkspaceDiagnosticTriggerInput = {
    diagnosticType: "workspace_diagnostic",
    asOfDate,
  }

  const result = await triggerN8nRun({
    workflowId: "intel-040-workspace-diagnostic",
    entityType: "workspace",
    entityId: profile.workspace_id,
    companyId: null,
    workspaceId: profile.workspace_id,
    userId: user.id,
    input: { ...input },
  })

  if (!result.ok) {
    console.error("[workspace-diagnostic/trigger] workflow trigger failed", {
      runId: result.runId,
      error: result.error,
    })
    return NextResponse.json<TriggerErrorResponse>(
      { error: result.error },
      { status: result.runId ? 502 : 500 },
    )
  }

  console.info("[workspace-diagnostic/trigger] workflow queued", {
    runId: result.runId,
    workspaceId: profile.workspace_id,
    asOfDate,
  })
  return NextResponse.json<TriggerResponse>({ runId: result.runId, status: "queued" }, { status: 202 })
}

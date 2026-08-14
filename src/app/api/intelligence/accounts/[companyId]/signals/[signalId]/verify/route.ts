import "server-only"

import { NextResponse } from "next/server"

import { triggerN8nRun } from "@/lib/n8n/trigger-run"
import { createClient } from "@/lib/supabase/server"

const SIGNAL_VERIFICATION_WORKFLOW_ID = "intel-034-account-signal-verification" as const

export async function POST(
  _request: Request,
  context: { params: Promise<{ companyId: string; signalId: string }> },
) {
  const { companyId, signalId } = await context.params
  if (!companyId || !signalId) {
    return NextResponse.json({ error: "Compte ou signal introuvable" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.workspace_id) {
    return NextResponse.json({ error: "Workspace introuvable" }, { status: 403 })
  }

  const { data: signal, error: signalError } = await supabase
    .from("account_signals")
    .select("id,company_id,title,summary,detected_at,primary_source_id,intelligence_sources(source_name,source_url)")
    .eq("id", signalId)
    .eq("company_id", companyId)
    .eq("workspace_id", profile.workspace_id)
    .maybeSingle()

  if (signalError) {
    return NextResponse.json({ error: signalError.message }, { status: 500 })
  }
  if (!signal) {
    return NextResponse.json({ error: "Signal introuvable ou inaccessible" }, { status: 404 })
  }

  const source = Array.isArray(signal.intelligence_sources)
    ? signal.intelligence_sources[0]
    : signal.intelligence_sources

  const result = await triggerN8nRun({
    workflowId: SIGNAL_VERIFICATION_WORKFLOW_ID,
    entityType: "account_signal",
    entityId: signal.id,
    companyId,
    workspaceId: profile.workspace_id,
    userId: user.id,
    triggerSource: "manual",
    input: {
      schemaVersion: 1,
      signal: {
        id: signal.id,
        title: signal.title,
        summary: signal.summary,
        detectedAt: signal.detected_at,
      },
      companyId,
      initialSource: {
        id: signal.primary_source_id,
        name: source?.source_name ?? null,
        url: source?.source_url ?? null,
      },
    },
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.runId ? 502 : 500 },
    )
  }

  return NextResponse.json({ runId: result.runId, status: "queued" }, { status: 202 })
}

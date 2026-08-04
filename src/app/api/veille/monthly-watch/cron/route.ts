import "server-only"

import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { createReportsServiceClient } from "@/app/(app)/reports/_data/reports-actions"
import { triggerN8nRun } from "@/lib/n8n/trigger-run"
import { previousCalendarMonth, MONTHLY_WATCH_WORKFLOW_ID } from "@/components/veille/veille-desktop-contracts"
import type { MonthlyWatchAnalysisInput } from "@/lib/n8n/types"

function validSecret(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false
  const left = Buffer.from(received)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  if (!validSecret(request.headers.get("x-kredo-cron-secret"), process.env.N8N_CRON_SECRET)) {
    return NextResponse.json({ error: "Secret cron invalide" }, { status: 401 })
  }

  const supabase = await createReportsServiceClient()
  const { data: workspaces, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, owner_id")
    .not("owner_id", "is", null)
  if (workspaceError) return NextResponse.json({ error: workspaceError.message }, { status: 500 })

  const period = previousCalendarMonth()
  const runs: Array<{ workspaceId: string; runId?: string; skipped?: string; error?: string }> = []

  for (const workspace of workspaces ?? []) {
    if (!workspace.owner_id) continue
    const [existingDocumentResult, activeRunResult] = await Promise.all([
      supabase
        .from("intelligence_documents")
        .select("id")
        .eq("workspace_id", workspace.id)
        .eq("document_type", "strategic_watch_analysis")
        .eq("period_start", period.start)
        .eq("period_end", period.end)
        .neq("status", "archived")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ai_intelligence_runs")
        .select("id")
        .eq("workspace_id", workspace.id)
        .eq("run_type", MONTHLY_WATCH_WORKFLOW_ID)
        .in("status", ["queued", "running"])
        .eq("input_snapshot->>periodStart", period.start)
        .limit(1)
        .maybeSingle(),
    ])
    if (existingDocumentResult.error || activeRunResult.error) {
      runs.push({ workspaceId: workspace.id, error: existingDocumentResult.error?.message ?? activeRunResult.error?.message })
      continue
    }
    if (existingDocumentResult.data) {
      runs.push({ workspaceId: workspace.id, skipped: "Analyse déjà disponible pour la période" })
      continue
    }
    if (activeRunResult.data) {
      runs.push({ workspaceId: workspace.id, runId: activeRunResult.data.id, skipped: "Analyse déjà en cours" })
      continue
    }

    const { data: digests, error: digestError } = await supabase
      .from("veille_digests")
      .select("id")
      .eq("workspace_id", workspace.id)
      .gte("digest_date", period.start)
      .lte("digest_date", period.end)
      .order("digest_date", { ascending: true })
    if (digestError) {
      runs.push({ workspaceId: workspace.id, error: digestError.message })
      continue
    }
    const digestIds = (digests ?? []).map((row) => row.id)
    if (digestIds.length === 0) {
      runs.push({ workspaceId: workspace.id, skipped: "Aucun digest sur la période" })
      continue
    }
    const { data: articles, error: articleError } = await supabase
      .from("veille_articles")
      .select("id")
      .eq("workspace_id", workspace.id)
      .in("digest_id", digestIds)
      .order("selection_rank", { ascending: true })
    if (articleError) {
      runs.push({ workspaceId: workspace.id, error: articleError.message })
      continue
    }
    const articleIds = (articles ?? []).map((row) => row.id)
    if (articleIds.length === 0) {
      runs.push({ workspaceId: workspace.id, skipped: "Aucun article sur la période" })
      continue
    }

    const input: MonthlyWatchAnalysisInput = {
      schemaVersion: 1,
      periodStart: period.start,
      periodEnd: period.end,
      digestIds,
      articleIds,
      requestedAt: new Date().toISOString(),
      triggerMode: "scheduled",
    }
    const result = await triggerN8nRun({
      workflowId: MONTHLY_WATCH_WORKFLOW_ID,
      entityType: "workspace",
      entityId: workspace.id,
      companyId: null,
      workspaceId: workspace.id,
      userId: workspace.owner_id,
      input,
      triggerSource: "cron",
    })
    runs.push(result.ok
      ? { workspaceId: workspace.id, runId: result.runId }
      : { workspaceId: workspace.id, runId: result.runId, error: result.error })
  }

  return NextResponse.json({ period, runs }, { status: 202 })
}

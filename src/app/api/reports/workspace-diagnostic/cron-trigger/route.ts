import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { verifyHmac } from "@/lib/n8n/hmac"
import { triggerN8nRun } from "@/lib/n8n/trigger-run"
import type { Database } from "@/types/database"
import type { WorkspaceDiagnosticTriggerInput } from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "workspace_id" | "role" | "created_at"
>

type CronResult = {
  workspaceId: string
  ownerId: string
  ok: boolean
  skipped?: boolean
  runId?: string
  error?: string
}

const ROLE_PRIORITY: Record<string, number> = {
  owner: 0,
  admin: 1,
  sales: 2,
  recruiter: 3,
  viewer: 4,
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service-role env vars missing")
  return createClient<Database>(url, key)
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function pickWorkspaceOwners(profiles: ProfileRow[]): ProfileRow[] {
  const byWorkspace = new Map<string, ProfileRow>()
  for (const profile of profiles) {
    if (!profile.workspace_id) continue
    const current = byWorkspace.get(profile.workspace_id)
    if (!current) {
      byWorkspace.set(profile.workspace_id, profile)
      continue
    }
    const candidatePriority = ROLE_PRIORITY[profile.role] ?? 99
    const currentPriority = ROLE_PRIORITY[current.role] ?? 99
    if (
      candidatePriority < currentPriority
      || (candidatePriority === currentPriority && profile.created_at < current.created_at)
    ) {
      byWorkspace.set(profile.workspace_id, profile)
    }
  }
  return [...byWorkspace.values()]
}

export async function POST(request: Request) {
  console.info("[workspace-diagnostic/cron-trigger] request received")
  const rawBody = await request.text()
  const signature = request.headers.get("x-kredo-signature") ?? ""
  if (!verifyHmac(rawBody, signature)) {
    console.warn("[workspace-diagnostic/cron-trigger] invalid HMAC")
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 })
  }

  let supabase: ReturnType<typeof getServiceClient>
  try {
    supabase = getServiceClient()
  } catch (error) {
    console.error("[workspace-diagnostic/cron-trigger] service client unavailable", error)
    return NextResponse.json({ error: "Configuration Supabase absente" }, { status: 500 })
  }

  const { data, error: profilesError } = await supabase
    .from("profiles")
    .select("id,workspace_id,role,created_at")
    .not("workspace_id", "is", null)
    .order("created_at", { ascending: true })

  if (profilesError || !data) {
    console.error("[workspace-diagnostic/cron-trigger] profiles query failed", profilesError?.message)
    return NextResponse.json({ error: "Impossible de lister les workspaces" }, { status: 500 })
  }

  const asOfDate = toDateKey(new Date())
  const startOfDay = `${asOfDate}T00:00:00.000Z`
  const input: WorkspaceDiagnosticTriggerInput = {
    diagnosticType: "workspace_diagnostic",
    asOfDate,
  }
  const results: CronResult[] = []

  for (const owner of pickWorkspaceOwners(data as ProfileRow[])) {
    const workspaceId = owner.workspace_id
    if (!workspaceId) continue

    try {
      const { data: existing } = await supabase
        .from("ai_intelligence_runs")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("run_type", "intel-040-workspace-diagnostic")
        .eq("trigger_source", "cron")
        .gte("created_at", startOfDay)
        .in("status", ["queued", "running", "succeeded"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        results.push({
          workspaceId,
          ownerId: owner.id,
          ok: true,
          skipped: true,
          runId: existing.id,
        })
        continue
      }

      const trigger = await triggerN8nRun({
        workflowId: "intel-040-workspace-diagnostic",
        entityType: "workspace",
        entityId: workspaceId,
        companyId: null,
        workspaceId,
        userId: owner.id,
        input: { ...input },
        triggerSource: "cron",
      })

      results.push(
        trigger.ok
          ? { workspaceId, ownerId: owner.id, ok: true, runId: trigger.runId }
          : { workspaceId, ownerId: owner.id, ok: false, error: trigger.error },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inattendue"
      console.error("[workspace-diagnostic/cron-trigger] workspace failed", {
        workspaceId,
        ownerId: owner.id,
        error: message,
      })
      results.push({ workspaceId, ownerId: owner.id, ok: false, error: message })
    }
  }

  console.info("[workspace-diagnostic/cron-trigger] batch completed", {
    workspaces: results.length,
    triggered: results.filter((result) => result.ok && !result.skipped).length,
    skipped: results.filter((result) => result.skipped).length,
    failed: results.filter((result) => !result.ok).length,
  })
  return NextResponse.json({
    asOfDate,
    triggered: results.filter((result) => result.ok && !result.skipped).length,
    skipped: results.filter((result) => result.skipped).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  })
}

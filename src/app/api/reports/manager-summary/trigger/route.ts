import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { triggerN8nRun } from "@/lib/n8n/trigger-run"
import { getWeeklyManagerBrief } from "@/lib/reports/weekly-manager/get-weekly-manager-brief"
import { getWeekStartDateKey } from "@/lib/agenda/agenda-temporal"
import type { Database } from "@/types/database"
import type { ManagerSummaryTriggerInput } from "@/app/(app)/reports/_data/reports-types"
import type { TriggerErrorResponse, TriggerResponse } from "@/lib/n8n/types"

type TriggerBody = {
  periodStart?: string
  declaredDifficulties?: string
  specificRequests?: string
  strategicFocus?: string
}

function addDaysToDateKey(dateKey: string, offset: number) {
  const [year, month, day] = dateKey.split("-").map((part) => Number.parseInt(part, 10))
  const next = new Date(Date.UTC(year, month - 1, day + offset))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`
}

function toDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

export async function POST(request: Request) {
  // ── 1. Authentification ────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json<TriggerErrorResponse>({ error: "Non authentifié" }, { status: 401 })
  }

  // ── 2. Résolution du profil ─────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, full_name")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) {
    return NextResponse.json<TriggerErrorResponse>({ error: "Workspace introuvable" }, { status: 403 })
  }

  // ── 3. Parsing du body ─────────────────────────────────────────────────────
  let body: TriggerBody
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const todayKey = toDateKey(new Date())
  const periodStart = body.periodStart ?? getWeekStartDateKey(todayKey)
  const periodEnd = addDaysToDateKey(periodStart, 6)
  
  // manager_summary est toujours adressé au manager pour une équipe ou soi-même,
  // dans ce cas on suppose que c'est pour owner_id (soi-même).
  const ownerId = user.id

  // ── 4. Pré-calcul des faits ────────────────────────────────────────────────
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceUrl || !serviceKey) {
    return NextResponse.json<TriggerErrorResponse>({ error: "Configuration serveur manquante" }, { status: 500 })
  }
  const serviceClient = createServiceClient<Database>(serviceUrl, serviceKey)

  let factsJson
  try {
    const { data, error } = await serviceClient.rpc("get_manager_summary_facts", {
      p_workspace_id: profile.workspace_id,
      p_owner_id: ownerId,
      p_start_date: periodStart,
      p_end_date: periodEnd,
    })
    if (error) throw error
    factsJson = data as unknown as ManagerSummaryTriggerInput["facts"]
  } catch (err) {
    console.error("[manager-summary/trigger] get_manager_summary_facts failed:", err)
    return NextResponse.json<TriggerErrorResponse>(
      { error: "Impossible de calculer les faits du rapport" },
      { status: 500 }
    )
  }

  // Persistance / récupération du strategic_focus dans performance_plans
  let activeStrategicFocus: string | null = body.strategicFocus?.trim() || null
  if (body.strategicFocus !== undefined && body.strategicFocus.trim().length > 0) {
    await serviceClient
      .from("performance_plans")
      .update({ strategic_focus: body.strategicFocus.trim(), updated_at: new Date().toISOString() })
      .eq("workspace_id", profile.workspace_id)
      .eq("owner_profile_id", user.id)
      .eq("status", "active")
  } else {
    const { data: activePlan } = await serviceClient
      .from("performance_plans")
      .select("strategic_focus")
      .eq("workspace_id", profile.workspace_id)
      .eq("owner_profile_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    activeStrategicFocus = (activePlan as { strategic_focus?: string | null } | null)?.strategic_focus ?? null
  }

  // Calcul des priorités semaine +1 en réutilisant l'algo Weekly Manager
  const nextWeekStart = addDaysToDateKey(periodStart, 7)
  const nextWeekEnd = addDaysToDateKey(nextWeekStart, 6)
  let nextWeekBrief
  try {
    nextWeekBrief = await getWeeklyManagerBrief({
      workspaceId: profile.workspace_id,
      ownerId: ownerId,
      isWorkspaceWide: false,
      period: { startDate: nextWeekStart, endDate: nextWeekEnd, asOfDate: todayKey },
    })
  } catch (err) {
    console.error("[manager-summary/trigger] getWeeklyManagerBrief failed:", err)
    // On continue même sans les priorités S+1 si ça échoue, pour ne pas tout bloquer
  }

  const nextWeekPriorities = (nextWeekBrief?.priorities ?? []).slice(0, 3).map(p => ({
    title: p.title,
    description: p.reason,
    nextAction: p.recommendedAction
  }))

  const input: ManagerSummaryTriggerInput = {
    reportType: "manager_summary",
    period: { startDate: periodStart, endDate: periodEnd, asOfDate: todayKey },
    scope: { ownerId, isWorkspaceWide: false },
    facts: {
      period: { startDate: periodStart, endDate: periodEnd, asOfDate: todayKey },
      owner: { id: user.id, name: profile.full_name || "Manager" },
      commercial: {
        meetingsCompletedCount: factsJson.commercial.meetingsCompletedCount || 0,
        meetingsDistribution: factsJson.commercial.meetingsDistribution || {},
        topActiveClients: factsJson.commercial.topActiveClients || [],
        staffingNeedsOpenedCount: factsJson.commercial.staffingNeedsOpenedCount || 0,
        treatedNeedsCount: factsJson.commercial.treatedNeedsCount || 0,
        topRequestedSkills: factsJson.commercial.topRequestedSkills || [],
        candidatesProposedCount: factsJson.commercial.candidatesProposedCount || 0,
        newOpportunitiesCount: factsJson.commercial.newOpportunitiesCount || 0,
        signatureConviction: factsJson.commercial.signatureConviction || null,
      },
      recruitment: {
        interviewsCompletedCount: factsJson.recruitment.interviewsCompletedCount || 0,
        topCandidatesToKeep: factsJson.recruitment.topCandidatesToKeep || [],
        jobOffersMadeCount: factsJson.recruitment.jobOffersMadeCount || 0,
      },
      nextWeek: {
        priorities: nextWeekPriorities,
      },
      declared: {
        difficulties: body.declaredDifficulties,
        specificRequests: body.specificRequests,
      },
      strategy: {
        strategicFocus: activeStrategicFocus,
      },
      dataCutoffAt: new Date().toISOString(),
      caveats: [],
    },
  }

  // ── 5. Création du run + déclenchement n8n ──────────────────────────────────
  const result = await triggerN8nRun({
    workflowId: "report-manager-summary",
    entityType: "workspace",
    entityId: profile.workspace_id,
    companyId: null,
    workspaceId: profile.workspace_id,
    userId: user.id,
    input: input as unknown as Record<string, unknown>,
  })

  if (!result.ok) {
    console.error("[manager-summary/trigger] triggerN8nRun failed:", result.error)
    return NextResponse.json<TriggerErrorResponse>({ error: result.error }, { status: result.runId ? 502 : 500 })
  }

  return NextResponse.json<TriggerResponse>({ runId: result.runId, status: "queued" }, { status: 202 })
}

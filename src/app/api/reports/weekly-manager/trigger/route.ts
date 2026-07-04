// ADR-0010 Lot 2 — Déclenchement du brief hebdomadaire.
//
// Contrairement à /api/n8n/trigger (utilisé tel quel par activity_commercial/
// activity_recruitment/account_summary), cette route pré-calcule TOUS les
// faits côté Next.js avant d'appeler n8n :
//   1. loadAgendaSnapshot() — source unique de vérité "quoi cette semaine",
//      jamais dupliquée en SQL (voir src/lib/agenda/aggregate-agenda-snapshot.ts)
//   2. get_weekly_business_facts (RPC service-role) — faits que l'agenda ne
//      peut pas produire (montants, comptes silencieux, indicateurs CRA)
//   3. computeWeeklyBrief() — assemble les deux + scoring déterministe
//      weekly-scoring-v1
// Le workflow n8n report-weekly-manager reçoit donc des facts déjà complets
// et n'a plus qu'à rédiger la narrative (pas de nœud "Hydrate Facts").

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { triggerN8nRun } from "@/lib/n8n/trigger-run"
import { getWeeklyManagerBrief } from "@/lib/reports/weekly-manager/get-weekly-manager-brief"
import { getIsoWeekLabel } from "@/lib/reports/weekly-manager/iso-week"
import { getWeekStartDateKey } from "@/lib/agenda/agenda-temporal"
import type { WeeklyManagerTriggerInput } from "@/app/(app)/reports/_data/reports-types"
import type { TriggerErrorResponse, TriggerResponse } from "@/lib/n8n/types"

type TriggerBody = {
  periodStart?: string
  periodEnd?: string
  isWorkspaceWide?: boolean
  additionalInstructions?: string
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

  // ── 2. Résolution du workspace ─────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) {
    return NextResponse.json<TriggerErrorResponse>({ error: "Workspace introuvable" }, { status: 403 })
  }

  // ── 3. Parsing du body (période optionnelle → défaut : semaine ISO en cours) ─
  let body: TriggerBody
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const todayKey = toDateKey(new Date())
  const periodStart = body.periodStart ?? getWeekStartDateKey(todayKey)
  const periodEnd = body.periodEnd ?? addDaysToDateKey(periodStart, 6)
  const isWorkspaceWide = body.isWorkspaceWide ?? false // V1 : périmètre perso par défaut (ADR-0010)

  // ── 4. Pré-calcul des faits (agenda + business + scoring) ───────────────────
  let facts
  try {
    facts = await getWeeklyManagerBrief({
      workspaceId: profile.workspace_id,
      ownerId: user.id,
      isWorkspaceWide,
      period: { startDate: periodStart, endDate: periodEnd, asOfDate: todayKey },
    })
  } catch (err) {
    console.error("[weekly-manager/trigger] getWeeklyManagerBrief failed:", err)
    return NextResponse.json<TriggerErrorResponse>(
      { error: "Impossible de calculer les faits du brief hebdomadaire" },
      { status: 500 }
    )
  }

  const input: WeeklyManagerTriggerInput = {
    reportType: "weekly_manager",
    period: { startDate: periodStart, endDate: periodEnd, asOfDate: todayKey, weekIso: getIsoWeekLabel(periodStart) },
    scope: { ownerId: isWorkspaceWide ? null : user.id, isWorkspaceWide },
    facts,
    additionalInstructions: body.additionalInstructions?.trim() || undefined,
  }

  // ── 5. Création du run + déclenchement n8n ──────────────────────────────────
  const result = await triggerN8nRun({
    workflowId: "report-weekly-manager",
    entityType: "workspace",
    entityId: profile.workspace_id,
    companyId: null,
    workspaceId: profile.workspace_id,
    userId: user.id,
    input,
  })

  if (!result.ok) {
    console.error("[weekly-manager/trigger] triggerN8nRun failed:", result.error)
    return NextResponse.json<TriggerErrorResponse>({ error: result.error }, { status: result.runId ? 502 : 500 })
  }

  return NextResponse.json<TriggerResponse>({ runId: result.runId, status: "queued" }, { status: 202 })
}

// ADR-0010 Lot 4 — Déclenchement batch du brief hebdomadaire (cron n8n).
//
// Contrairement à /api/reports/weekly-manager/trigger (session utilisateur,
// un seul brief), cette route est appelée par le workflow n8n
// report-weekly-manager-cron (Schedule Trigger, lundi 07:00 Europe/Paris,
// sans navigateur ni cookies) — l'authentification passe donc par HMAC
// (même secret N8N_WEBHOOK_SECRET, même mécanisme que /api/n8n/callback),
// pas par une session Supabase. Elle boucle sur tous les profils du
// workspace et déclenche un brief personnel pour chacun.
//
// Gestion d'erreur : l'échec d'un profil n'interrompt jamais la boucle
// (gestion silencieuse — ADR-0010 §Lot 4). Le détail par profil est renvoyé
// dans la réponse pour inspection dans les Executions n8n, mais rien n'est
// notifié individuellement à l'utilisateur en cas d'échec (pas de canal pour
// ça en V1 — le prochain cron du lundi suivant retentera naturellement).

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyHmac } from "@/lib/n8n/hmac"
import { triggerN8nRun } from "@/lib/n8n/trigger-run"
import { getWeeklyManagerBrief } from "@/lib/reports/weekly-manager/get-weekly-manager-brief"
import { getIsoWeekLabel } from "@/lib/reports/weekly-manager/iso-week"
import { getWeekStartDateKey } from "@/lib/agenda/agenda-temporal"
import type { Database } from "@/types/database"
import type { WeeklyManagerTriggerInput } from "@/app/(app)/reports/_data/reports-types"

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function addDaysToDateKey(dateKey: string, offset: number) {
  const [year, month, day] = dateKey.split("-").map((part) => Number.parseInt(part, 10))
  const next = new Date(Date.UTC(year, month - 1, day + offset))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`
}

function toDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

type ProfileResult = { profileId: string; ok: boolean; runId?: string; error?: string }

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-kredo-signature") ?? ""

  if (!verifyHmac(rawBody, signature)) {
    console.warn("[weekly-manager/cron-trigger] HMAC invalide — requête rejetée")
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 })
  }

  const supabase = getServiceClient()
  const { data: allProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, workspace_id")

  if (profilesError || !allProfiles) {
    console.error("[weekly-manager/cron-trigger] Impossible de lister les profils:", profilesError?.message)
    return NextResponse.json({ error: "Impossible de lister les profils" }, { status: 500 })
  }

  // profiles.workspace_id est nullable en base (compte créé avant handle_new_user
  // ou orphelin) — un profil sans workspace ne peut pas avoir de brief.
  const profiles = allProfiles.filter(
    (profile): profile is { id: string; workspace_id: string } => profile.workspace_id !== null,
  )

  const todayKey = toDateKey(new Date())
  const periodStart = getWeekStartDateKey(todayKey)
  const periodEnd = addDaysToDateKey(periodStart, 6)
  const period = { startDate: periodStart, endDate: periodEnd, asOfDate: todayKey }

  const results: ProfileResult[] = []

  for (const profile of profiles) {
    try {
      const facts = await getWeeklyManagerBrief({
        workspaceId: profile.workspace_id,
        ownerId: profile.id,
        isWorkspaceWide: false,
        period,
      })

      const input: WeeklyManagerTriggerInput = {
        reportType: "weekly_manager",
        period: { ...period, weekIso: getIsoWeekLabel(periodStart) },
        scope: { ownerId: profile.id, isWorkspaceWide: false },
        facts,
      }

      const triggerResult = await triggerN8nRun({
        workflowId: "report-weekly-manager",
        entityType: "workspace",
        entityId: profile.workspace_id,
        companyId: null,
        workspaceId: profile.workspace_id,
        userId: profile.id,
        input,
        triggerSource: "cron",
      })

      results.push(
        triggerResult.ok
          ? { profileId: profile.id, ok: true, runId: triggerResult.runId }
          : { profileId: profile.id, ok: false, error: triggerResult.error },
      )
    } catch (err) {
      console.error(`[weekly-manager/cron-trigger] Échec pour le profil ${profile.id}:`, err)
      results.push({
        profileId: profile.id,
        ok: false,
        error: err instanceof Error ? err.message : "Erreur inattendue",
      })
    }
  }

  return NextResponse.json({
    period,
    triggered: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}

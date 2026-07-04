// CORE-002 — Callback de persistance durci n8n → Next
//
// Ce que fait cette route :
//   1. Vérifie la signature HMAC (rejette immédiatement si invalide)
//   2. Parse et valide le payload (champs obligatoires)
//   3. Récupère le run pour retrouver company_id / workspace_id / owner_id
//   4. Upsert idempotent dans ai_intelligence_results (UNIQUE run_id + phase)
//   5. Met à jour le statut du run (succeeded / failed)
//   6. Répond 200 à n8n
//
// Sécurité : service-role key dans runs.ts (hors RLS).
// Idempotence : rejouer le même callback est sans danger.

import { NextResponse } from "next/server"
import { verifyHmac } from "@/lib/n8n/hmac"
import { saveResult, updateRunStatus } from "@/lib/n8n/runs"
import { createClient } from "@supabase/supabase-js"
import { saveResultAsDocumentWithSupabaseClient } from "@/components/accounts-contacts/intelligence/save-as-document"
import type { Database } from "@/types/database"
import type { N8nCallbackPayload } from "@/lib/n8n/types"

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function isEligibleDocumentResult(resultType: string) {
  return [
    "communication",
    "client_summary",
    "commercial_pitch",
    "campaign",
    "pitch",
    "pitch_mail",
    "activity_commercial",
    "activity_recruitment",
    "weekly_manager",
  ].includes(resultType)
}

export async function POST(request: Request) {
  // ── 1. Lecture du body brut (nécessaire pour la vérification HMAC) ─────────
  const rawBody = await request.text()
  const signature = request.headers.get("x-kredo-signature") ?? ""

  // ── 2. Vérification HMAC ───────────────────────────────────────────────────
  if (!verifyHmac(rawBody, signature)) {
    console.warn("[callback] HMAC invalide — requête rejetée")
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 })
  }

  // ── 3. Parse du payload ────────────────────────────────────────────────────
  let payload: N8nCallbackPayload
  try {
    payload = JSON.parse(rawBody) as N8nCallbackPayload
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const { runId, phase, resultType, status, contentJson } = payload

  if (!runId || phase === undefined || !resultType || !status || !contentJson) {
    return NextResponse.json(
      { error: "Champs obligatoires manquants : runId, phase, resultType, status, contentJson" },
      { status: 400 }
    )
  }

  // ── 4. Récupération du run pour company_id / workspace_id / owner_id ───────
  const supabase = getServiceClient()
  const { data: run, error: runError } = await supabase
    .from("ai_intelligence_runs")
    .select("company_id, workspace_id, owner_id, trigger_source")
    .eq("id", runId)
    .single()

  if (runError || !run) {
    console.error("[callback] Run introuvable:", runId, runError?.message)
    return NextResponse.json({ error: "Run introuvable" }, { status: 404 })
  }

  // ── 5. Sauvegarde du résultat (upsert idempotent) ─────────────────────────
  let resultId: string
  try {
    resultId = await saveResult(
      runId,
      run.company_id,
      run.workspace_id,
      run.owner_id,
      payload
    )
  } catch (err) {
    console.error("[callback] saveResult failed:", err)
    return NextResponse.json({ error: "Erreur sauvegarde résultat" }, { status: 500 })
  }

  // ── 6. Mise à jour du statut du run ───────────────────────────────────────
  try {
    const runStatus = status === "succeeded" ? "succeeded" : "failed"
    await updateRunStatus(runId, runStatus, {
      phase,
      errorMessage: payload.errorMessage,
    })
  } catch (err) {
    // Non bloquant : le résultat est déjà sauvé, on log et on continue
    console.error("[callback] updateRunStatus failed:", err)
  }

  if (status === "succeeded" && isEligibleDocumentResult(resultType)) {
    const documentResult = await saveResultAsDocumentWithSupabaseClient(supabase, resultId)
    if (!documentResult.success) {
      console.error("[callback] auto saveResultAsDocument failed:", documentResult.error)
      return NextResponse.json({ error: "Erreur création document" }, { status: 500 })
    }

    // ADR-0010 Lot 4 : uniquement pour les runs déclenchés par le cron du
    // lundi — un run "ui" est déjà visible en Realtime dans le drawer
    // ouvert par l'utilisateur, une notification serait redondante.
    if (resultType === "weekly_manager" && run.trigger_source === "cron") {
      const { error: notificationError } = await supabase.from("user_notifications").insert({
        workspace_id: run.workspace_id,
        user_id: run.owner_id,
        notification_type: "weekly_brief_ready",
        title: "Votre brief hebdomadaire est prêt",
        body: payload.title ?? null,
        deep_link: `/reports?doc=${documentResult.documentId}`,
        related_document_id: documentResult.documentId,
      })
      if (notificationError) {
        // Non bloquant : le document existe déjà, la notification n'est qu'un
        // confort d'accès — on log et on continue.
        console.error("[callback] user_notifications insert failed:", notificationError.message)
      }
    }
  }

  return NextResponse.json({ ok: true, runId, phase })
}

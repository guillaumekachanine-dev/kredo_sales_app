// CORE-001 — Passerelle de déclenchement Next → n8n
//
// Ce que fait cette route :
//   1. Vérifie la session Supabase (user connecté, workspace résolu)
//   2. Valide le body (workflowId, companyId, input)
//   3. Crée un run "queued" dans ai_intelligence_runs
//   4. Lance l'appel vers n8n en background (sans await bloquant)
//   5. Répond 202 + { runId } immédiatement → jamais de timeout Vercel
//
// Le front poll ai_intelligence_runs via Supabase Realtime pour voir le résultat.

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createRun, updateRunStatus } from "@/lib/n8n/runs"
import { callN8nWebhook } from "@/lib/n8n/client"
import type { N8nWorkflowId, N8nTriggerPayload, TriggerResponse, TriggerErrorResponse } from "@/lib/n8n/types"

type TriggerBody = {
  workflowId: N8nWorkflowId
  companyId: string
  input: Record<string, unknown>
}

export async function POST(request: Request) {
  // ── 1. Authentification ────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "Non authentifié" },
      { status: 401 }
    )
  }

  // ── 2. Résolution du workspace ─────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "Workspace introuvable" },
      { status: 403 }
    )
  }

  // ── 3. Validation du body ──────────────────────────────────────────────────
  let body: TriggerBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "Body JSON invalide" },
      { status: 400 }
    )
  }

  const { workflowId, companyId, input } = body

  if (!workflowId || !companyId || typeof input !== "object") {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "workflowId, companyId et input sont requis" },
      { status: 400 }
    )
  }

  // ── 4. Création du run en base (status: queued) ────────────────────────────
  let runId: string
  try {
    runId = await createRun({
      workflowId,
      companyId,
      workspaceId: profile.workspace_id,
      userId: user.id,
      input,
    })
  } catch (err) {
    console.error("[trigger] createRun failed:", err)
    return NextResponse.json<TriggerErrorResponse>(
      { error: "Impossible de créer le run" },
      { status: 500 }
    )
  }

  // ── 5. Appel n8n en background ─────────────────────────────────────────────
  // On ne await PAS ici → réponse 202 immédiate.
  // En cas d'échec, le run reste "queued" et pourra être relancé (OPS-004).
  const appBaseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const payload: N8nTriggerPayload = {
    runId,
    workflowId,
    entityType: "company",
    entityId: companyId,
    workspaceId: profile.workspace_id,
    userId: user.id,
    input,
    callbackUrl: `${appBaseUrl}/api/n8n/callback`,
  }

  void callN8nWebhook(workflowId, payload).catch(async (err) => {
    console.error("[trigger] callN8nWebhook failed:", err)
    // On passe le run en "failed" si n8n n'est pas joignable
    await updateRunStatus(runId, "failed", {
      errorMessage: `Webhook call failed: ${err instanceof Error ? err.message : String(err)}`,
    }).catch(console.error)
  })

  // ── 6. Réponse immédiate ───────────────────────────────────────────────────
  return NextResponse.json<TriggerResponse>(
    { runId, status: "queued" },
    { status: 202 }
  )
}

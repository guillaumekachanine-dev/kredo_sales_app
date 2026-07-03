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
import type {
  N8nEntityType,
  N8nWorkflowId,
  N8nTriggerPayload,
  TriggerResponse,
  TriggerErrorResponse,
} from "@/lib/n8n/types"

// entityType/entityId généralisés (REPORT-001 Lot 0) : companyId reste accepté
// pour compatibilité et n'est utilisé que quand entityType === "company".
// Pour un rapport transverse (ex. activité commerciale du mois), le front
// envoie entityType: "workspace", entityId: workspaceId, companyId omis.
type TriggerBody = {
  workflowId: N8nWorkflowId
  entityType?: N8nEntityType
  entityId?: string
  companyId?: string
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

  if (!workflowId || typeof input !== "object") {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "workflowId et input sont requis" },
      { status: 400 }
    )
  }

  // Rétrocompatibilité : les appelants existants (INTEL-020/021/022) envoient
  // uniquement companyId, sans entityType/entityId — on déduit entityType="company"
  // dans ce cas. Les nouveaux appelants (REPORT-001) envoient entityType/entityId
  // explicitement, y compris entityType="workspace" pour les rapports transverses.
  const entityType: N8nEntityType = body.entityType ?? (companyId ? "company" : "workspace")
  const entityId = body.entityId ?? companyId ?? profile.workspace_id
  const resolvedCompanyId = entityType === "company" ? (companyId ?? entityId) : null

  if (entityType !== "workspace" && !entityId) {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "entityId est requis pour entityType !== \"workspace\"" },
      { status: 400 }
    )
  }

  // ── 4. Création du run en base (status: queued) ────────────────────────────
  let runId: string
  try {
    runId = await createRun({
      workflowId,
      entityType,
      entityId,
      companyId: resolvedCompanyId,
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

  // ── 5. Déclenchement du webhook n8n ─────────────────────────────────────────
  // On attend uniquement l'accusé de réception immédiat de n8n (mode "Immediately",
  // ~100-300ms) — pas la fin du workflow (LLM, etc., 10-20s), qui arrive plus tard
  // via /api/n8n/callback. Sans ce await, Vercel peut geler l'instance serverless
  // juste après le retour de la réponse, avant même que la requête vers n8n parte.
  // VERCEL_URL pointe vers l'URL unique du déploiement (protégée par le SSO Vercel
  // par défaut) — VERCEL_PROJECT_PRODUCTION_URL pointe vers le domaine de prod
  // stable (non protégé), c'est celui qu'il faut utiliser pour que n8n puisse
  // atteindre le callback sans authentification Vercel.
  const appBaseUrl =
    process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")

  const payload: N8nTriggerPayload = {
    runId,
    workflowId,
    entityType,
    entityId,
    workspaceId: profile.workspace_id,
    userId: user.id,
    input,
    callbackUrl: `${appBaseUrl}/api/n8n/callback`,
  }

  try {
    await callN8nWebhook(workflowId, payload)
  } catch (err) {
    console.error("[trigger] callN8nWebhook failed:", err)
    // On passe le run en "failed" si n8n n'est pas joignable
    await updateRunStatus(runId, "failed", {
      errorMessage: `Webhook call failed: ${err instanceof Error ? err.message : String(err)}`,
    }).catch(console.error)

    return NextResponse.json<TriggerErrorResponse>(
      { error: "n8n injoignable — le run a été marqué en échec" },
      { status: 502 }
    )
  }

  // ── 6. Réponse immédiate ───────────────────────────────────────────────────
  return NextResponse.json<TriggerResponse>(
    { runId, status: "queued" },
    { status: 202 }
  )
}

import "server-only"

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
import { triggerN8nRun } from "@/lib/n8n/trigger-run"
import type {
  N8nEntityType,
  N8nWorkflowId,
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

  // ── 3bis. Gate serveur INTEL-010 ───────────────────────────────────────────
  if (workflowId === "intel-010-refresh" && (input as Record<string, unknown>).operation === "account_scan") {
    const isIdentityConfirmed = (input as Record<string, unknown>).identityConfirmed === true
    const selectedSiren = (input as Record<string, unknown>).selectedSiren
    
    if (!isIdentityConfirmed) {
      return NextResponse.json<TriggerErrorResponse>(
        { error: "Confirmation d'identité requise pour ce scan" },
        { status: 400 }
      )
    }

    if (typeof selectedSiren !== "string" || !/^\d{9}$/.test(selectedSiren)) {
      return NextResponse.json<TriggerErrorResponse>(
        { error: "Le SIREN sélectionné doit contenir exactement 9 chiffres" },
        { status: 400 }
      )
    }
  }

  // ── 4. Création du run + déclenchement n8n (factorisé, ADR-0010 Lot 2) ──────
  const result = await triggerN8nRun({
    workflowId,
    entityType,
    entityId,
    companyId: resolvedCompanyId,
    workspaceId: profile.workspace_id,
    userId: user.id,
    input,
  })

  if (!result.ok) {
    console.error("[trigger] triggerN8nRun failed:", result.error)
    return NextResponse.json<TriggerErrorResponse>(
      { error: result.error },
      { status: result.runId ? 502 : 500 }
    )
  }

  // ── 5. Réponse immédiate ───────────────────────────────────────────────────
  return NextResponse.json<TriggerResponse>(
    { runId: result.runId, status: "queued" },
    { status: 202 }
  )
}

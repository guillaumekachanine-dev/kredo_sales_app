// Factorisé depuis /api/n8n/trigger (ADR-0010 Lot 2) : le brief hebdomadaire
// a besoin d'une seconde route de déclenchement (/api/reports/weekly-manager/trigger)
// qui pré-calcule les faits avant d'appeler n8n — mais la mécanique
// "créer le run → appeler le webhook → marquer failed si injoignable" reste
// strictement identique. Centralisée ici pour ne pas dupliquer cette logique
// à un deuxième site d'appel.

import { createRun, updateRunStatus } from "./runs"
import { callN8nWebhook } from "./client"
import type { N8nEntityType, N8nTriggerPayload, N8nWorkflowId } from "./types"

export type TriggerN8nRunInput = {
  workflowId: N8nWorkflowId
  entityType: N8nEntityType
  entityId: string
  companyId?: string | null
  workspaceId: string
  userId: string
  input: Record<string, unknown>
  triggerSource?: string
}

export type TriggerN8nRunResult =
  | { ok: true; runId: string }
  | { ok: false; runId?: string; error: string }

export function resolveAppBaseUrl(): string {
  // VERCEL_URL pointe vers l'URL unique du déploiement (protégée par le SSO
  // Vercel par défaut) — VERCEL_PROJECT_PRODUCTION_URL pointe vers le domaine
  // de prod stable (non protégé), c'est celui qu'il faut utiliser pour que n8n
  // puisse atteindre le callback sans authentification Vercel.
  return process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
}

export async function triggerN8nRun(params: TriggerN8nRunInput): Promise<TriggerN8nRunResult> {
  let runId: string
  try {
    runId = await createRun(params)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Impossible de créer le run" }
  }

  const payload: N8nTriggerPayload = {
    runId,
    workflowId: params.workflowId,
    entityType: params.entityType,
    entityId: params.entityId,
    workspaceId: params.workspaceId,
    userId: params.userId,
    input: params.input,
    callbackUrl: `${resolveAppBaseUrl()}/api/n8n/callback`,
  }

  // On attend uniquement l'accusé de réception immédiat de n8n (mode
  // "Immediately", ~100-300ms) — pas la fin du workflow (LLM, etc., 10-20s),
  // qui arrive plus tard via /api/n8n/callback. Sans ce await, Vercel peut
  // geler l'instance serverless juste après le retour de la réponse.
  try {
    await callN8nWebhook(params.workflowId, payload)
  } catch (err) {
    await updateRunStatus(runId, "failed", {
      errorMessage: `Webhook call failed: ${err instanceof Error ? err.message : String(err)}`,
    }).catch(console.error)

    return { ok: false, runId, error: "n8n injoignable — le run a été marqué en échec" }
  }

  return { ok: true, runId }
}

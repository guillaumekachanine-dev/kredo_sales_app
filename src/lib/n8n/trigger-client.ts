"use client"

// Déclenchement d'un workflow depuis le navigateur. Même appel dans tous les
// écrans, au lieu d'un `fetch` recopié à chaque point de déclenchement avec sa
// propre gestion d'erreur (et ses propres oublis).

import type { N8nEntityType, N8nWorkflowId } from "./types"

export type TriggerWorkflowInput = {
  workflowId: N8nWorkflowId
  entityType: N8nEntityType
  entityId: string
  companyId?: string
  input?: Record<string, unknown>
}

/** Renvoie le `runId` créé, ou lève une erreur au message affichable. */
export async function triggerN8nWorkflow(params: TriggerWorkflowInput): Promise<string> {
  const response = await fetch("/api/n8n/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workflowId: params.workflowId,
      entityType: params.entityType,
      entityId: params.entityId,
      ...(params.companyId ? { companyId: params.companyId } : {}),
      input: params.input ?? {},
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? "Le déclenchement a échoué.")
  }

  const { runId } = (await response.json()) as { runId?: string }
  if (!runId) throw new Error("Le déclenchement n'a pas renvoyé d'identifiant de run.")
  return runId
}

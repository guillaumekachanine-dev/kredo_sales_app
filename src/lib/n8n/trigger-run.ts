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
  // ── ADR-0020 (missions d'intelligence) ──────────────────────────────────────
  // `createRun` portait déjà `runType` (`run_type = runType ?? workflowId`) sans que
  // rien ne le lui passe : les trois champs ci-dessous ne font que le traverser.
  // Tous optionnels — le comportement des appelants existants est inchangé.
  /** `mission:<slug>` pour une mission (M-3), sinon `run_type` retombe sur `workflowId`. */
  runType?: string
  /** Ce qui est persisté dans `input_snapshot` quand il doit différer de `input`. */
  inputSnapshot?: Record<string, unknown>
  /** Clés fusionnées dans `config`, à côté de `workflowId`. */
  extraConfig?: Record<string, unknown>
}

export type TriggerN8nRunResult =
  | { ok: true; runId: string }
  | { ok: false; runId?: string; error: string }

// `callN8nWebhook` lève soit un `n8n webhook error <status>: <detail>` (réponse
// HTTP non-ok), soit l'erreur brute de `fetch` (n8n réellement injoignable).
// On classe le message rendu au front SANS jamais y recopier `<detail>` (corps de
// réponse n8n, potentiellement verbeux). Le message complet reste, lui, écrit
// dans `ai_intelligence_runs.error_message` pour le drill-down /automations.
function classifyWebhookError(raw: string): string {
  const status = raw.match(/n8n webhook error (\d{3})/)?.[1]
  if (status === "404") return "Webhook n8n introuvable ou workflow non activé."
  if (status === "401" || status === "403") return "n8n a refusé la requête (signature ou authentification)."
  if (status && status.startsWith("5")) return "Le workflow n8n a échoué à l'exécution."
  if (status) return `n8n a répondu une erreur ${status}.`
  return "n8n injoignable — le serveur n'a pas répondu."
}

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
    const rawMessage = err instanceof Error ? err.message : String(err)
    await updateRunStatus(runId, "failed", {
      errorMessage: `Webhook call failed: ${rawMessage}`,
    }).catch(console.error)

    return { ok: false, runId, error: `${classifyWebhookError(rawMessage)} Le run a été marqué en échec.` }
  }

  return { ok: true, runId }
}

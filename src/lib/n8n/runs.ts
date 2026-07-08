// ─── Gestion des runs IA dans Supabase ───────────────────────────────────────
// Utilise le service-role key (hors RLS) pour écrire dans ai_intelligence_runs
// et ai_intelligence_results depuis les routes API Next.js.
//
// Pourquoi service-role ici ?
//  - createRun() est appelé depuis /api/n8n/trigger (session user valide, mais
//    on veut garantir l'écriture même si la RLS bloque un edge case)
//  - saveResult() est appelé depuis /api/n8n/callback (appelant = n8n, pas de
//    session user → RLS ne peut pas s'appliquer)

import { createClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/types/database"
import type { N8nCallbackPayload, N8nEntityType, N8nWorkflowId } from "./types"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service-role env vars missing")
  return createClient<Database>(url, key)
}

// ─── createRun ────────────────────────────────────────────────────────────────
// Crée un run "queued" avant de déclencher n8n.
// Retourne l'id du run (uuid) qui sera passé à n8n et affiché au front.

type CreateRunOptions = {
  workflowId: N8nWorkflowId
  runType?: string
  // Entité pivot du run — "workspace" pour les rapports transverses sans compte
  // unique (REPORT-001 Lot 0). companyId reste la dénormalisation historique
  // utilisée par les runs company-centric (INTEL-010/011/020/021/022).
  entityType: N8nEntityType
  entityId: string
  companyId?: string | null
  workspaceId: string
  userId: string
  input: Record<string, unknown>
  // "ui" (défaut) = déclenché par un clic utilisateur · "cron" = déclenché
  // par report-weekly-manager-cron (ADR-0010 Lot 4) — /api/n8n/callback lit
  // cette valeur pour décider de créer ou non une notification in-app (un
  // run "ui" est déjà visible en Realtime dans le drawer, une notification
  // serait redondante ; un run "cron" n'a aucune UI ouverte à prévenir).
  triggerSource?: string
}

export async function createRun(opts: CreateRunOptions): Promise<string> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("ai_intelligence_runs")
    .insert({
      company_id: opts.companyId ?? null,
      primary_entity_type: opts.entityType,
      primary_entity_id: opts.entityId,
      run_type: opts.runType ?? opts.workflowId,
      trigger_source: opts.triggerSource ?? "ui",
      status: "queued",
      input_snapshot: opts.input as Json,
      config: { workflowId: opts.workflowId } as Json,
      owner_id: opts.userId,
      workspace_id: opts.workspaceId,
    })
    .select("id")
    .single()

  if (error || !data) throw new Error(`createRun failed: ${error?.message}`)
  return data.id
}

// ─── updateRunStatus ──────────────────────────────────────────────────────────
// Mise à jour du statut d'un run (queued → running → succeeded/failed).
// Appelé depuis CORE-002 (callback) après avoir sauvé le résultat.

type RunStatus = Database["public"]["Enums"]["ai_run_status"]

export async function updateRunStatus(
  runId: string,
  status: RunStatus,
  opts?: { errorMessage?: string; phase?: number }
): Promise<void> {
  const supabase = getServiceClient()

  const patch: Partial<Database["public"]["Tables"]["ai_intelligence_runs"]["Update"]> = { status }
  if (status === "succeeded") patch.completed_at = new Date().toISOString()
  if (status === "failed") patch.failed_at = new Date().toISOString()
  if (status === "running") patch.started_at = new Date().toISOString()
  if (opts?.errorMessage) patch.error_message = opts.errorMessage
  if (opts?.phase !== undefined) patch.current_phase = opts.phase

  const { error } = await supabase
    .from("ai_intelligence_runs")
    .update(patch)
    .eq("id", runId)

  if (error) throw new Error(`updateRunStatus failed: ${error.message}`)
}

// ─── saveResult ───────────────────────────────────────────────────────────────
// Upsert idempotent du résultat dans ai_intelligence_results.
// UNIQUE(run_id, phase) → rejouer n'écrase pas, c'est un "onConflict: update".
// Appelé depuis /api/n8n/callback.

export async function saveResult(
  runId: string,
  companyId: string | null,
  workspaceId: string,
  ownerId: string,
  payload: N8nCallbackPayload
): Promise<string> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("ai_intelligence_results")
    .upsert(
      {
        run_id: runId,
        company_id: companyId,
        workspace_id: workspaceId,
        owner_id: ownerId,
        phase: payload.phase,
        result_type: payload.resultType,
        status: payload.status === "succeeded" ? "succeeded" : "failed",
        content_json: payload.contentJson as Json,
        content_text: payload.contentText ?? null,
        title: payload.title ?? null,
        model_provider: payload.modelProvider ?? null,
        model_used: payload.modelUsed ?? null,
        tokens_input: payload.tokensInput ?? null,
        tokens_output: payload.tokensOutput ?? null,
        cost_estimate: payload.costEstimate ?? null,
        duration_ms: payload.durationMs ?? null,
        context_snapshot: (payload.contextSnapshot ?? null) as Json,
        source_refs: (payload.sourceRefs ?? []) as Json,
        qa_flags: (payload.qaFlags ?? []) as Json,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "run_id,phase", ignoreDuplicates: false }
    )
    .select("id")
    .single()

  if (error || !data) throw new Error(`saveResult failed: ${error?.message}`)
  return data.id
}

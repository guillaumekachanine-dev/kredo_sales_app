"use server"

// Scan rapide compte (Lot 2) — Server Actions authentifiées.
//
// applyAccountScanProposals() est le SEUL chemin d'écriture CRM de cette feature.
// Le navigateur ne transmet jamais la valeur à écrire, le champ cible librement,
// le workspace ou une source arbitraire — uniquement des ids déjà connus côté
// serveur (runId/companyId/proposalIds). Toute la logique métier d'application
// (comparaison ancienne/nouvelle valeur, écriture réelle) vit dans le RPC batch
// du Lot 0 (public.validate_and_apply_enrichment_proposals), SECURITY DEFINER,
// qui revérifie lui-même l'appartenance workspace. Cette action ajoute la
// vérification supplémentaire compte/run/statut que le RPC ne fait pas (il ne
// connaît que le workspace).

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type ProposalOperationResult = Database["public"]["CompositeTypes"]["proposal_operation_result"]

export type ApplyAccountScanProposalsResult = {
  error: string | null
  results: ProposalOperationResult[]
}

// Statuts d'enrichment_proposals encore "applicables" — un scan répété peut avoir
// déjà supprimé/recréé la ligne (Lot 1 §5), une proposition rejetée ou en conflit
// non résolu nécessite une décision humaine distincte, jamais une ré-application
// aveugle depuis ce chemin.
const APPLICABLE_STATUSES = new Set(["proposed", "needs_review", "validated", "applied"])

export async function applyAccountScanProposals(input: {
  runId: string
  companyId: string
  proposalIds: string[]
  reason?: string | null
}): Promise<ApplyAccountScanProposalsResult> {
  const { runId, companyId, proposalIds, reason } = input

  if (!runId || !companyId || !Array.isArray(proposalIds) || proposalIds.length === 0) {
    return { error: "Paramètres invalides", results: [] }
  }

  const supabase = await createClient()

  // ── 1. Session utilisateur + workspace ─────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié", results: [] }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.workspace_id) {
    return { error: "Workspace introuvable pour l'utilisateur courant", results: [] }
  }

  // ── 2. Vérification d'appartenance workspace/compte/run/statut ─────────────
  // Le RPC ne revérifie que le workspace — le compte et le run sont vérifiés ici
  // pour garantir qu'un proposalId ne peut jamais être appliqué hors du contexte
  // (compte, run) que l'utilisateur a effectivement sous les yeux.
  const { data: candidates, error: fetchError } = await supabase
    .from("enrichment_proposals")
    .select("id, workspace_id, target_type, target_id, run_id, status")
    .in("id", proposalIds)

  if (fetchError) {
    return { error: `Erreur de lecture des propositions : ${fetchError.message}`, results: [] }
  }

  const foundIds = new Set((candidates ?? []).map((c) => c.id))
  const missingIds = proposalIds.filter((id) => !foundIds.has(id))
  if (missingIds.length > 0) {
    return { error: `Proposition(s) introuvable(s) : ${missingIds.join(", ")}`, results: [] }
  }

  const invalid = (candidates ?? []).find((c) =>
    c.workspace_id !== profile.workspace_id ||
    c.target_type !== "company" ||
    c.target_id !== companyId ||
    c.run_id !== runId ||
    !APPLICABLE_STATUSES.has(c.status)
  )

  if (invalid) {
    return {
      error: `La proposition ${invalid.id} n'appartient pas à ce compte/run ou n'est plus dans un statut applicable (${invalid.status}).`,
      results: [],
    }
  }

  // ── 3. Application batch via le RPC du Lot 0 ────────────────────────────────
  const { data: rpcResults, error: rpcError } = await supabase.rpc(
    "validate_and_apply_enrichment_proposals",
    { p_proposal_ids: proposalIds, p_reason: reason ?? undefined },
  )

  if (rpcError) {
    return { error: `Erreur RPC : ${rpcError.message}`, results: [] }
  }

  revalidatePath(`/prospection/accounts/${companyId}`)

  return { error: null, results: (rpcResults ?? []) as ProposalOperationResult[] }
}

// ─── Restauration du dernier run au réouverture de la modale (§6) ───────────

export type LatestAccountScanRun = {
  runId: string
  status: string
  createdAt: string
  errorMessage: string | null
  resultStatus: string | null
  contentJson: Record<string, unknown> | null
}

export async function getLatestAccountScanRun(companyId: string): Promise<LatestAccountScanRun | null> {
  if (!companyId) return null

  const supabase = await createClient()

  const { data: run, error: runError } = await supabase
    .from("ai_intelligence_runs")
    .select("id, status, created_at, error_message, input_snapshot")
    .eq("company_id", companyId)
    .eq("run_type", "intel-010-refresh")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (runError || !run) return null

  const inputSnapshot = run.input_snapshot as { operation?: string } | null
  if (inputSnapshot?.operation !== "account_scan") return null

  if (run.status === "queued" || run.status === "running") {
    return {
      runId: run.id,
      status: run.status,
      createdAt: run.created_at,
      errorMessage: null,
      resultStatus: null,
      contentJson: null,
    }
  }

  if (run.status === "failed" || run.status === "cancelled") {
    return {
      runId: run.id,
      status: run.status,
      createdAt: run.created_at,
      errorMessage: run.error_message,
      resultStatus: null,
      contentJson: null,
    }
  }

  const { data: result } = await supabase
    .from("ai_intelligence_results")
    .select("status, content_json")
    .eq("run_id", run.id)
    .eq("result_type", "account_scan")
    .maybeSingle()

  return {
    runId: run.id,
    status: run.status,
    createdAt: run.created_at,
    errorMessage: run.error_message,
    resultStatus: result?.status ?? null,
    contentJson: (result?.content_json as Record<string, unknown> | null) ?? null,
  }
}

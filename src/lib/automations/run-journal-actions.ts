"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  getLatestRunJournalRows,
  getRunJournalRowsByIds,
  type RunJournalRow,
} from "./automations-data"
import { JOURNAL_LIMIT } from "./run-journal-merge"

// ─────────────────────────────────────────────────────────────────────────────
//  Server Actions du journal d'exécution
//
//  Realtime ne transporte que les colonnes brutes de `ai_intelligence_runs` :
//  ni le nom du compte, ni celui du propriétaire, ni la durée, ni le coût (qui
//  vivent dans `v_ai_run_costs`, dérivée d'`ai_intelligence_results`). Un
//  événement sert donc de SIGNAL, et c'est ce module qui reconstruit la ligne
//  complète — avec exactement la projection du chargement initial.
//
//  Ces actions sont authentifiées comme des routes API (`server-auth-actions`)
//  et lisent en session utilisateur : la RLS workspace s'applique, un id de run
//  forgé côté navigateur ne retourne simplement rien.
// ─────────────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function fetchRunJournalRows(runIds: string[]): Promise<RunJournalRow[]> {
  const { user } = await requireUser()
  if (!user) return []

  const ids = [...new Set(runIds.filter((id) => UUID_RE.test(id)))].slice(0, JOURNAL_LIMIT)
  if (ids.length === 0) return []

  return getRunJournalRowsByIds(ids)
}

export type RefreshRunJournalResult =
  | { ok: true; rows: RunJournalRow[] }
  | { ok: false; error: string }

// Filet manuel si le canal Realtime tombe (onglet longtemps en arrière-plan,
// réseau coupé) : recharge la même liste que le rendu serveur initial.
export async function refreshRunJournal(): Promise<RefreshRunJournalResult> {
  const { user } = await requireUser()
  if (!user) return { ok: false, error: "Session expirée — recharge la page." }

  const rows = await getLatestRunJournalRows()
  if (rows === null) return { ok: false, error: "Rechargement du journal impossible." }

  return { ok: true, rows }
}

export async function fetchFilteredRunJournal(filters: { from: string; to: string; workflow: string; status: string }): Promise<RefreshRunJournalResult> {
  const { user } = await requireUser()
  if (!user) return { ok: false, error: "Session expirée — recharge la page." }

  const { getFilteredRunJournalRows } = await import("./automations-data")
  const rows = await getFilteredRunJournalRows(filters)
  if (rows === null) return { ok: false, error: "Rechargement du journal filtré impossible." }

  return { ok: true, rows }
}

export type RunRetryPayload = {
  workflowId: string
  entityType: string | null
  entityId: string | null
  companyId: string | null
  input: Record<string, unknown>
}

export type RunRetryPayloadResult =
  | { ok: true; payload: RunRetryPayload }
  | { ok: false; error: string }

// `input_snapshot` ne voyage plus avec les 50 lignes du journal (jusqu'à 5,3 ko
// par run pour une donnée utile à une seule relance) : il est relu ici, à la
// demande, pour le run effectivement relancé.
export async function getRunRetryPayload(runId: string): Promise<RunRetryPayloadResult> {
  if (!UUID_RE.test(runId)) return { ok: false, error: "Identifiant de run invalide." }

  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: "Session expirée — reconnecte-toi pour relancer ce run." }

  const { data: run, error } = await supabase
    .from("ai_intelligence_runs")
    .select("status, config, input_snapshot, primary_entity_type, primary_entity_id, company_id")
    .eq("id", runId)
    .maybeSingle()

  if (error) return { ok: false, error: `Lecture du run impossible : ${error.message}` }
  if (!run) return { ok: false, error: "Run introuvable dans ce workspace." }
  if (run.status !== "failed") {
    return { ok: false, error: "Seul un run en échec peut être relancé." }
  }

  const workflowId = (run.config as { workflowId?: string } | null)?.workflowId
  if (!workflowId) {
    return { ok: false, error: "workflowId introuvable dans ce run (config manquante) — relance impossible." }
  }

  return {
    ok: true,
    payload: {
      workflowId,
      entityType: run.primary_entity_type,
      entityId: run.primary_entity_id,
      companyId: run.company_id,
      input: (run.input_snapshot as Record<string, unknown> | null) ?? {},
    },
  }
}

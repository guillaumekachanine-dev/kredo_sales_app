"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  getLatestRunJournalRows,
  getRunJournalRowsByIds,
  getVeilleSimulatorBaseline,
  type RunJournalRow,
} from "./automations-data"
import type { VeilleSimulatorBaseline } from "./veille-cadence"
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

export async function fetchFilteredRunJournal(filters: {
  from: string
  to: string
  workflow: string
  status: string
  limit?: number
}): Promise<RefreshRunJournalResult> {
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

export async function fetchVeilleSimulatorBaseline(): Promise<VeilleSimulatorBaseline | null> {
  const { user } = await requireUser()
  if (!user) return null
  return getVeilleSimulatorBaseline()
}

export type CurrentWorkflowExecutionResult = {
  run: RunJournalRow | null
  userId: string | null
}

const TERMINAL_TTL_MS = 120_000 // 120 secondes

export async function fetchCurrentWorkflowExecution(): Promise<CurrentWorkflowExecutionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { run: null, userId: null }

  // 1. Chercher d'abord un run actif (queued ou running) de l'utilisateur déclenché depuis l'UI
  const activeRunsRes = await supabase
    .from("ai_intelligence_runs")
    .select("id")
    .eq("owner_id", user.id)
    .eq("trigger_source", "ui")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)

  if (activeRunsRes.data && activeRunsRes.data.length > 0) {
    const activeRunId = activeRunsRes.data[0]?.id
    if (activeRunId) {
      const rows = await getRunJournalRowsByIds([activeRunId])
      return { run: rows[0] ?? null, userId: user.id }
    }
  }

  // 2. S'il n'y en a aucun, chercher le dernier run terminal (succeeded, failed, cancelled)
  const terminalRunsRes = await supabase
    .from("ai_intelligence_runs")
    .select("id, status, completed_at, failed_at, created_at, updated_at")
    .eq("owner_id", user.id)
    .eq("trigger_source", "ui")
    .in("status", ["succeeded", "failed", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(1)

  if (terminalRunsRes.data && terminalRunsRes.data.length > 0) {
    const termRun = terminalRunsRes.data[0]
    if (termRun?.id) {
      const terminalTime = termRun.completed_at ?? termRun.failed_at ?? termRun.updated_at ?? termRun.created_at
      if (terminalTime) {
        const elapsedMs = Date.now() - new Date(terminalTime).getTime()
        if (elapsedMs >= 0 && elapsedMs < TERMINAL_TTL_MS) {
          const rows = await getRunJournalRowsByIds([termRun.id])
          return { run: rows[0] ?? null, userId: user.id }
        }
      }
    }
  }

  return { run: null, userId: user.id }
}


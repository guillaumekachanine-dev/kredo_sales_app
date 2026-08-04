"use client"

import { startTransition, useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ensureRealtimeAuth } from "@/lib/supabase/realtime-auth"
import type { RunJournalRow } from "@/lib/automations/automations-data"
import { mergeRunJournalRows } from "@/lib/automations/run-journal-merge"
import { fetchRunJournalRows, refreshRunJournal } from "@/lib/automations/run-journal-actions"

// ─────────────────────────────────────────────────────────────────────────────
//  Journal d'exécution en direct
//
//  Realtime sert de SIGNAL, pas de source de données : l'événement
//  `postgres_changes` ne porte que les colonnes brutes du run (ni nom de
//  compte, ni propriétaire, ni durée, ni coût — ces deux derniers vivent dans
//  `v_ai_run_costs`, dérivée d'`ai_intelligence_results`). À réception, on
//  redemande la ligne complète au serveur.
//
//  Pourquoi ça suffit à voir le coût dès la fin d'exécution : dans
//  /api/n8n/callback, `saveResult()` (étape 5) précède `updateRunStatus()`
//  (étape 6). Quand l'UPDATE `succeeded` nous parvient, la ligne de résultat
//  est déjà en base — inutile de s'abonner en plus à `ai_intelligence_results`.
//
//  Une exécution émet 2 à 3 événements en quelques secondes (INSERT queued →
//  UPDATE running → UPDATE succeeded) : ils sont coalescés dans un Set puis
//  envoyés en un seul aller-retour.
// ─────────────────────────────────────────────────────────────────────────────

const COALESCE_MS = 400

export type RunJournalRealtime = {
  journal: RunJournalRow[]
  lastUpdatedAt: string
  isRefreshing: boolean
  refreshError: string | null
  refresh: () => void
}

export function useRunJournalRealtime(
  initialJournal: RunJournalRow[],
  initialFetchedAt: string,
): RunJournalRealtime {
  const [journal, setJournal] = useState<RunJournalRow[]>(initialJournal)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialFetchedAt)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let disposed = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    // Accumulateur et minuterie vivent dans la portée de l'effet, pas en state :
    // les mettre en state ferait dépendre l'effet de valeurs qu'il produit
    // lui-même, donc détruirait et recréerait le canal à chaque événement reçu
    // (piège corrigé sur AccountScanDialog), avec une fenêtre d'événements
    // perdus entre l'ancien canal et le nouveau.
    const pendingIds = new Set<string>()
    let flushTimer: ReturnType<typeof setTimeout> | null = null

    async function flushPending() {
      flushTimer = null
      const ids = [...pendingIds]
      pendingIds.clear()
      if (ids.length === 0) return

      const rows = await fetchRunJournalRows(ids)
      if (disposed || rows.length === 0) return

      // Mise à jour non urgente : elle ne doit pas préempter une interaction
      // en cours (tri de la table, ouverture du drill-down).
      startTransition(() => {
        setJournal((current) => mergeRunJournalRows(current, rows))
        setLastUpdatedAt(new Date().toISOString())
      })
    }

    function scheduleFetch(runId: string) {
      pendingIds.add(runId)
      if (flushTimer !== null) return
      flushTimer = setTimeout(() => {
        void flushPending()
      }, COALESCE_MS)
    }

    void (async () => {
      // Sans jeton utilisateur, le canal se souscrit « avec succès » puis reste
      // muet à jamais (cf. lib/supabase/realtime-auth.ts).
      await ensureRealtimeAuth(supabase)
      if (disposed) return

      channel = supabase
        .channel("automations-runs-journal")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ai_intelligence_runs" },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const deletedId = (payload.old as { id?: string } | null)?.id
              if (!deletedId) return
              startTransition(() => {
                setJournal((current) => current.filter((row) => row.id !== deletedId))
                setLastUpdatedAt(new Date().toISOString())
              })
              return
            }

            const runId = (payload.new as { id?: string } | null)?.id
            if (runId) scheduleFetch(runId)
          }
        )
        .subscribe()
    })()

    return () => {
      disposed = true
      if (flushTimer !== null) clearTimeout(flushTimer)
      pendingIds.clear()
      if (channel) void supabase.removeChannel(channel)
    }
  }, [])

  const refresh = useCallback(() => {
    setIsRefreshing(true)
    setRefreshError(null)
    void (async () => {
      const result = await refreshRunJournal()
      if (result.ok) {
        // Remplacement complet (pas une fusion) : un rafraîchissement manuel
        // doit aussi refléter ce qui a disparu de la fenêtre des 50 derniers.
        setJournal(result.rows)
        setLastUpdatedAt(new Date().toISOString())
      } else {
        setRefreshError(result.error)
      }
      setIsRefreshing(false)
    })()
  }, [])

  return { journal, lastUpdatedAt, isRefreshing, refreshError, refresh }
}

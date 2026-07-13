"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { parseWorkspaceDiagnostic } from "@/lib/intelligence/diagnostic/parse-diagnostic-content"
import type {
  WorkspaceDiagnostic,
  WorkspaceDiagnosticSnapshot,
} from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

export type WorkspaceDiagnosticRunState = "idle" | "loading" | "error"

type DiagnosticResultRow = {
  status?: string
  result_type?: string
  content_json?: unknown
}

export function useWorkspaceDiagnostic(initialSnapshot: WorkspaceDiagnosticSnapshot | null) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [liveDiagnostic, setLiveDiagnostic] = useState<WorkspaceDiagnostic | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [runState, setRunState] = useState<WorkspaceDiagnosticRunState>("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) return

    let cancelled = false

    function consumeResult(row: DiagnosticResultRow) {
      if (cancelled || row.result_type !== "workspace_diagnostic") return
      if (row.status === "failed") {
        setRunState("error")
        setError("La génération a échoué. Le dernier diagnostic valide reste affiché.")
        setRunId(null)
        return
      }
      if (row.status !== "succeeded") return

      const parsed = parseWorkspaceDiagnostic(row.content_json, {
        allowMonoAxisCorrelations: true,
      })
      if (!parsed.ok) {
        setRunState("error")
        setError("Le diagnostic reçu ne respecte pas le contrat attendu.")
        setRunId(null)
        return
      }

      setLiveDiagnostic(parsed.value)
      setRunState("idle")
      setError(null)
      setRunId(null)
      router.refresh()
    }

    const channel = supabase
      .channel(`workspace-diagnostic-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_intelligence_results",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          consumeResult(payload.new as DiagnosticResultRow)
        },
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return

        // Ferme la fenêtre de course entre la réponse 202 du trigger et
        // l'ouverture effective du canal Realtime.
        void supabase
          .from("ai_intelligence_results")
          .select("status,result_type,content_json")
          .eq("run_id", runId)
          .eq("result_type", "workspace_diagnostic")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => {
            if (data) consumeResult(data as DiagnosticResultRow)
          })
      })

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [router, runId, supabase])

  const refresh = useCallback(async () => {
    setRunState("loading")
    setError(null)
    try {
      const response = await fetch("/api/reports/workspace-diagnostic/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const payload = await response.json().catch(() => ({})) as {
        runId?: string
        error?: string
      }
      if (!response.ok || !payload.runId) {
        throw new Error(payload.error ?? "Impossible de lancer le diagnostic")
      }
      setRunId(payload.runId)
    } catch (refreshError) {
      setRunState("error")
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Impossible de lancer le diagnostic",
      )
    }
  }, [])

  return {
    diagnostic: liveDiagnostic ?? initialSnapshot?.diagnostic ?? null,
    error,
    isRefreshing: runState === "loading",
    refresh,
  }
}

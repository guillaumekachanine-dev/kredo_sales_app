"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import { parseWorkspaceDiagnostic } from "@/lib/intelligence/diagnostic/parse-diagnostic-content"
import type {
  WorkspaceDiagnostic,
  WorkspaceDiagnosticSnapshot,
} from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

export type WorkspaceDiagnosticRunState = "idle" | "loading" | "error"


export function useWorkspaceDiagnostic(initialSnapshot: WorkspaceDiagnosticSnapshot | null) {
  const router = useRouter()
  const [liveDiagnostic, setLiveDiagnostic] = useState<WorkspaceDiagnostic | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [runState, setRunState] = useState<WorkspaceDiagnosticRunState>("idle")
  const [error, setError] = useState<string | null>(null)

  // Suivi unifié (src/lib/n8n/use-run-tracker) : Realtime en accélérateur,
  // relance périodique en garantie. La vérification immédiate au montage ferme
  // aussi la fenêtre de course entre la réponse 202 du trigger et l'ouverture
  // du canal, que ce hook traitait auparavant à la main.
  useRunTracker<unknown>({
    runId,
    resultType: "workspace_diagnostic",
    onSucceeded: (result) => {
      if (!result) {
        setRunState("error")
        setError("Le run a abouti sans diagnostic exploitable.")
        setRunId(null)
        return
      }

      const parsed = parseWorkspaceDiagnostic(result.contentJson, {
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
    },
    onFailed: () => {
      setRunState("error")
      setError("La génération a échoué. Le dernier diagnostic valide reste affiché.")
      setRunId(null)
    },
    onTimeout: () => {
      setRunState("error")
      setError("Le traitement dépasse le délai habituel. Il continue côté serveur : recharge la page dans quelques minutes.")
      setRunId(null)
    },
  })

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

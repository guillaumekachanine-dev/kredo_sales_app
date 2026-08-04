"use client"

// ─── Déclenchement + suivi d'un run « Mettre à jour l'entreprise » ──────────
// Lot 1. Logique partagée par les vues Desktop et Mobile — un hook, pas un
// composant : chaque vue garde son propre rendu, aucun markup lourd n'est
// chargé puis masqué sur l'autre.
//
// Le suivi écoute DEUX tables :
//   - `ai_intelligence_results` : cas nominal (le callback a écrit un résultat) ;
//   - `ai_intelligence_runs`    : filet indispensable pour l'échec sans résultat.
//     Le portail account_knowledge du callback (Lot 1) refuse un artefact
//     invalide AVANT `saveResult` : il bascule le run en `failed` sans jamais
//     écrire de ligne de résultat. Sans cette seconde souscription, l'UI
//     resterait bloquée sur « en cours » indéfiniment.

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { createClient as createBrowserClient } from "@/lib/supabase/client"

export type AccountKnowledgeRunStatus = "idle" | "running" | "done" | "error"

export function useAccountKnowledgeRun(companyId: string) {
  const router = useRouter()
  const [status, setStatus] = useState<AccountKnowledgeRunStatus>("idle")
  const [runId, setRunId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Garde anti-double-déclenchement : `status` ne bascule qu'au prochain rendu,
  // deux clics rapprochés le liraient tous les deux à "idle". Une ref est mise
  // à jour de façon synchrone et ferme la fenêtre.
  const inFlightRef = useRef(false)

  const trigger = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setStatus("running")
    setErrorMessage(null)
    setRunId(null)

    try {
      const response = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "intel-030-account-knowledge",
          entityType: "company",
          entityId: companyId,
          companyId,
          input: {},
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? "Le déclenchement a échoué.")
      }

      const { runId: newRunId } = (await response.json()) as { runId: string }
      setRunId(newRunId)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur inattendue.")
      setStatus("error")
      inFlightRef.current = false
    }
  }, [companyId])

  useEffect(() => {
    if (!runId) return

    const supabase = createBrowserClient()
    let disposed = false

    const finish = (nextStatus: AccountKnowledgeRunStatus, message: string | null) => {
      if (disposed) return
      disposed = true
      inFlightRef.current = false
      setStatus(nextStatus)
      setErrorMessage(message)
      // Rafraîchissement du Server Component uniquement — pas de rechargement
      // complet de la page : l'onglet, le scroll et l'état local sont conservés.
      if (nextStatus === "done") router.refresh()
    }

    const channel = supabase
      .channel(`account-knowledge-run-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_intelligence_results",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const row = payload.new as { status?: string } | null
          if (row?.status === "succeeded") finish("done", null)
          else if (row?.status === "failed") finish("error", "La génération a échoué.")
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ai_intelligence_runs",
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          const row = payload.new as { status?: string; error_message?: string | null } | null
          if (row?.status === "failed") {
            finish("error", row.error_message ?? "La génération a échoué.")
          } else if (row?.status === "succeeded") {
            finish("done", null)
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // `finish` capture volontairement `runId` seul : ré-abonner à chaque
    // changement de statut détruirait puis recréerait le canal qui vient de
    // produire l'événement, avec une fenêtre d'événements perdus entre les deux.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  return { status, errorMessage, isRunning: status === "running", trigger }
}

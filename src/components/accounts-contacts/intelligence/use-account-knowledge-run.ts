"use client"

// ─── Déclenchement + suivi du run « Mettre à jour l'entreprise » ────────────
// Le suivi lui-même est délégué à `useRunTracker` (src/lib/n8n) : Realtime en
// accélérateur, relance périodique en garantie. Ce hook ne porte plus que le
// déclenchement et la traduction en états d'affichage.

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { ACCOUNT_KNOWLEDGE_RESULT_TYPE } from "@/lib/intelligence/account-intelligence-contracts"
import { ACTIVE_ACCOUNT_KNOWLEDGE_SCHEMA_VERSION } from "@/lib/n8n/types"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"

export type AccountKnowledgeRunStatus = "idle" | "running" | "done" | "error"

export function useAccountKnowledgeRun(companyId: string) {
  const router = useRouter()
  const [runId, setRunId] = useState<string | null>(null)
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [isTriggering, setIsTriggering] = useState(false)

  // Garde anti-double-clic : `isTriggering` ne bascule qu'au prochain rendu,
  // deux clics rapprochés le liraient tous les deux à « libre ».
  const inFlightRef = useRef(false)

  const tracker = useRunTracker({
    runId,
    resultType: ACCOUNT_KNOWLEDGE_RESULT_TYPE,
    // Le contenu est relu côté serveur par le loader : inutile de le tirer ici.
    withResult: false,
    onSucceeded: () => {
      inFlightRef.current = false
      // Rafraîchit le Server Component uniquement : l'onglet actif, le scroll
      // et l'état local sont conservés.
      router.refresh()
    },
    onFailed: () => {
      inFlightRef.current = false
    },
    onTimeout: () => {
      inFlightRef.current = false
    },
  })

  const trigger = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setIsTriggering(true)
    setTriggerError(null)
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
          input: { accountKnowledgeSchemaVersion: ACTIVE_ACCOUNT_KNOWLEDGE_SCHEMA_VERSION },
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? "Le déclenchement a échoué.")
      }

      const { runId: newRunId } = (await response.json()) as { runId: string }
      setRunId(newRunId)
    } catch (error) {
      setTriggerError(error instanceof Error ? error.message : "Erreur inattendue.")
      inFlightRef.current = false
    } finally {
      setIsTriggering(false)
    }
  }, [companyId])

  const status: AccountKnowledgeRunStatus = triggerError
    ? "error"
    : isTriggering || tracker.phase === "tracking"
      ? "running"
      : tracker.phase === "succeeded"
        ? "done"
        : tracker.phase === "failed" || tracker.phase === "timeout"
          ? "error"
          : "idle"

  return {
    status,
    errorMessage: triggerError ?? tracker.errorMessage,
    isRunning: status === "running",
    trigger,
  }
}

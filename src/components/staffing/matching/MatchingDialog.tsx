"use client"

import { useState } from "react"
import { createOpportunityStaffing } from "@/app/(app)/missions/_actions/opportunity-staffing"
import { AppDialog } from "@/components/ui/AppDialog"
import { runOpportunityMatching } from "@/lib/staffing-matching/actions"
import type { MatchingResult } from "@/lib/staffing-matching/types"
import { MatchingResultsDesktop } from "./MatchingResultsDesktop"
import { MatchingResultsMobile } from "./MatchingResultsMobile"
import { profileSourceKey } from "./matching-ui-utils"

type Phase = "idle" | "loading" | "results" | "error"

interface PresentState {
  presenting: boolean
  presented: boolean
  error: string | null
}

interface MatchingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: string
  opportunityTitle: string
  isMobile: boolean
  onStaffed?: () => void
}

export function MatchingDialog({
  open,
  onOpenChange,
  opportunityId,
  opportunityTitle,
  isMobile,
  onStaffed,
}: MatchingDialogProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [result, setResult] = useState<MatchingResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedSourceKey, setSelectedSourceKey] = useState<string | null>(null)
  const [presentStateByKey, setPresentStateByKey] = useState<Map<string, PresentState>>(new Map())

  // Le moteur est 100% déterministe et synchrone (aucun LLM, aucun run n8n à
  // attendre) — pas de Realtime nécessaire ici, contrairement à AccountScanDialog.
  // Le composant reste monté entre deux ouvertures (résultat conservé tant que
  // le besoin ne change pas) : le parent remonte ce composant via `key={opportunity.id}`
  // pour réinitialiser l'état si le besoin change sous le dialog (pattern React
  // recommandé plutôt qu'un setState synchrone dans un effet).
  async function handleRun() {
    setPhase("loading")
    setErrorMessage(null)
    const outcome = await runOpportunityMatching(opportunityId)
    if (!outcome.ok) {
      setErrorMessage(outcome.error)
      setPhase("error")
      return
    }
    setResult(outcome.result)
    setPresentStateByKey(new Map())
    setSelectedSourceKey(null)
    setPhase("results")
  }

  async function handlePresent(sourceKey: string) {
    if (!result) return
    const profile = result.rankedProfiles.find((p) => profileSourceKey(p) === sourceKey)
    if (!profile) return

    setPresentStateByKey((prev) => {
      const next = new Map(prev)
      next.set(sourceKey, { presenting: true, presented: false, error: null })
      return next
    })

    const outcome = await createOpportunityStaffing({
      opportunity_id: opportunityId,
      source_type: profile.sourceType,
      source_id: profile.sourceId,
      positioning_origin: "Matching IA",
      initial_status: "identifie",
    })

    setPresentStateByKey((prev) => {
      const next = new Map(prev)
      next.set(sourceKey, outcome.error
        ? { presenting: false, presented: false, error: outcome.error }
        : { presenting: false, presented: true, error: null })
      return next
    })

    if (!outcome.error) onStaffed?.()
  }

  let body: React.ReactNode
  if (phase === "idle") {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-canvas/30 px-6 py-10 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Matching IA — besoin</p>
        <p className="max-w-sm text-[11px] leading-relaxed text-muted">
          Analyse déterministe (compétences, séniorité, TJM, disponibilité, localisation, practice) sur le vivier
          candidats et les collaborateurs disponibles ou bientôt disponibles. Aucune IA générative, aucun envoi de donnée externe.
        </p>
        <button
          type="button"
          onClick={() => void handleRun()}
          className="mt-1 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-fg hover:bg-primary-deep"
        >
          Lancer le matching
        </button>
      </div>
    )
  } else if (phase === "loading") {
    body = (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Calcul en cours…</p>
      </div>
    )
  } else if (phase === "error") {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-danger/20 bg-danger/[0.05] px-6 py-10 text-center">
        <p className="text-xs font-bold text-danger">{errorMessage ?? "Erreur inattendue."}</p>
        <button
          type="button"
          onClick={() => void handleRun()}
          className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-xs font-bold text-body hover:bg-canvas/40"
        >
          Réessayer
        </button>
      </div>
    )
  } else if (result) {
    if (result.rankedProfiles.length === 0) {
      body = (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-xs text-muted">
          Aucun profil disponible ou bientôt disponible ne correspond au périmètre actuel.
        </div>
      )
    } else {
      body = isMobile ? (
        <MatchingResultsMobile
          result={result}
          selectedSourceKey={selectedSourceKey}
          onSelect={setSelectedSourceKey}
          presentStateByKey={presentStateByKey}
          onPresent={(key) => void handlePresent(key)}
        />
      ) : (
        <MatchingResultsDesktop
          result={result}
          selectedSourceKey={selectedSourceKey}
          onSelect={setSelectedSourceKey}
          presentStateByKey={presentStateByKey}
          onPresent={(key) => void handlePresent(key)}
        />
      )
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Matching IA"
      description={`Besoin : ${opportunityTitle}`}
      className={phase === "results" && !isMobile ? "max-w-4xl" : "max-w-lg"}
      bodyClassName={phase === "results" ? undefined : undefined}
      footer={
        phase === "results" ? (
          <button
            type="button"
            onClick={() => void handleRun()}
            className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-bold text-body hover:bg-canvas/40"
          >
            Actualiser le matching
          </button>
        ) : undefined
      }
    >
      {body}
    </AppDialog>
  )
}

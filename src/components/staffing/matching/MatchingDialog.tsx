"use client"

import { useState } from "react"
import { createOpportunityStaffing } from "@/app/(app)/missions/_actions/opportunity-staffing"
import { AppDialog } from "@/components/ui/AppDialog"
import { runOpportunityMatching } from "@/lib/staffing-matching/actions"
import type { MatchingResult, ProfileMatchResult } from "@/lib/staffing-matching/types"
import { MatchingResultsDesktop } from "./MatchingResultsDesktop"
import { MatchingResultsMobile } from "./MatchingResultsMobile"
import { profileSourceKey } from "./matching-ui-utils"

type Phase = "idle" | "loading" | "results" | "error"

interface PresentState {
  presenting: boolean
  presented: boolean
  error: string | null
}

function selectedProfileFor(
  result: MatchingResult,
  selectedSourceKey: string | null,
): ProfileMatchResult {
  return result.rankedProfiles.find((profile) => profileSourceKey(profile) === selectedSourceKey) ?? result.rankedProfiles[0]
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
      const selectedProfile = selectedProfileFor(result, selectedSourceKey)
      const selectedKey = profileSourceKey(selectedProfile)
      const selectedPresentState = presentStateByKey.get(selectedKey)
      const canPresentSelectedProfile = selectedProfile.sourceType === "candidate" || selectedProfile.hasCandidateProfile

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
          onSelect={setSelectedSourceKey}
          presentStateByKey={presentStateByKey}
          selectedProfile={selectedProfile}
        />
      )

      const footer = isMobile ? undefined : (
        <>
          <button
            type="button"
            onClick={() => void handleRun()}
            className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 11a8 8 0 1 0 2 5.3M20 4v7h-7" />
            </svg>
            Relancer le matching
          </button>
          <button
            type="button"
            onClick={() => void handlePresent(selectedKey)}
            disabled={
              !canPresentSelectedProfile ||
              selectedPresentState?.presenting ||
              selectedPresentState?.presented
            }
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-bold text-primary-fg transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {selectedPresentState?.presented
              ? "Profil présenté"
              : selectedPresentState?.presenting
                ? "Présentation…"
                : `Présenter ${selectedProfile.fullName.split(" ")[0] ?? "ce profil"}`}
          </button>
        </>
      )

      return (
        <AppDialog
          open={open}
          onOpenChange={onOpenChange}
          title={
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Matching IA</p>
              <h2 className="mt-1.5 font-heading text-2xl font-bold leading-tight tracking-tight text-heading">
                {isMobile ? "Profils pour le besoin" : "Le meilleur profil pour ce besoin"}
              </h2>
            </div>
          }
          description={`${opportunityTitle} · ${selectedProfile.components.filter((component) => component.applicable).length} critères disponibles`}
          className={
            isMobile
              ? "max-w-lg"
              : "w-[60vw] max-w-[48rem] sm:!w-[60vw] sm:!max-w-[48rem]"
          }
          headerClassName={
            isMobile
              ? undefined
              : "-mx-6 -mt-6 border-b border-border/80 px-6 pb-5 pt-6 [&_button]:size-8 [&_button]:rounded-md [&_button]:text-heading [&_button]:hover:bg-canvas"
          }
          bodyClassName={isMobile ? undefined : "-mx-6 px-0 pr-0"}
          footerClassName={isMobile ? undefined : "-mx-6 -mb-6 grid grid-cols-[auto_minmax(0,1fr)] border-border/80 px-6 pb-6 pt-4"}
          maxHeightClassName={
            isMobile
              ? undefined
              : "max-h-[min(calc(100dvh-2rem),45rem)] sm:max-h-[min(calc(100dvh-4rem),45rem)]"
          }
          footer={footer}
        >
          {body}
        </AppDialog>
      )
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Matching IA"
      description={`Besoin : ${opportunityTitle}`}
      className="max-w-lg"
    >
      {body}
    </AppDialog>
  )
}

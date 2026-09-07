"use client"

import { useCurrentWorkflowExecution } from "./use-current-workflow-execution"
import { RunDrillDownDialog } from "./RunDrillDownDialog"

export function WorkflowExecutionIndicatorDesktop() {
  const { run, status, isActive, isDetailOpen, setIsDetailOpen, openDetail } =
    useCurrentWorkflowExecution()

  if (!run || !status) return null

  return (
    <>
      {isActive ? (
        <div className="kredo-workflow-desktop-active shadow-2xs">
          <button
            type="button"
            onClick={openDetail}
            aria-label="Exécution en cours — Voir le détail"
            className="kredo-workflow-inner-btn relative z-10 flex items-center gap-2 rounded-[calc(0.5rem-3px)] px-3 py-1 text-xs font-bold text-workflow-ink transition-opacity hover:opacity-95 active:scale-95 cursor-pointer"
          >
            <span>Exécution en cours</span>
          </button>
        </div>
      ) : status === "succeeded" ? (
        <button
          type="button"
          onClick={openDetail}
          aria-label="Exécution réussie — Voir le détail"
          className="inline-flex items-center gap-1.5 rounded-lg border border-success bg-success px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs cursor-pointer"
        >
          <svg className="size-3.5 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>Succès exécution</span>
        </button>
      ) : status === "failed" ? (
        <button
          type="button"
          onClick={openDetail}
          aria-label="Échec de l'exécution — Voir le détail"
          className="inline-flex items-center gap-1.5 rounded-lg border border-danger bg-danger px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs cursor-pointer"
        >
          <svg className="size-3.5 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Échec exécution</span>
        </button>
      ) : status === "cancelled" ? (
        <button
          type="button"
          onClick={openDetail}
          aria-label="Exécution annulée — Voir le détail"
          className="inline-flex items-center gap-1.5 rounded-lg border border-workflow-cancelled bg-workflow-cancelled px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs cursor-pointer"
        >
          <svg className="size-3.5 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
          </svg>
          <span>Exécution annulée</span>
        </button>
      ) : null}

      <RunDrillDownDialog
        run={run}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </>
  )
}

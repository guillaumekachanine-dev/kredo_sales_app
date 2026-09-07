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
            className="relative z-10 flex items-center gap-2 rounded-[calc(0.5rem-1.5px)] bg-surface px-3 py-1.5 text-xs font-semibold text-heading transition-colors hover:bg-surface-hover cursor-pointer"
          >
            <span>Exécution en cours</span>
          </button>
        </div>
      ) : status === "succeeded" ? (
        <button
          type="button"
          onClick={openDetail}
          aria-label="Exécution réussie — Voir le détail"
          className="inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/15 shadow-2xs cursor-pointer"
        >
          <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>Succès exécution</span>
        </button>
      ) : status === "failed" ? (
        <button
          type="button"
          onClick={openDetail}
          aria-label="Échec de l'exécution — Voir le détail"
          className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/15 shadow-2xs cursor-pointer"
        >
          <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Échec exécution</span>
        </button>
      ) : status === "cancelled" ? (
        <button
          type="button"
          onClick={openDetail}
          aria-label="Exécution annulée — Voir le détail"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-hover shadow-2xs cursor-pointer"
        >
          <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
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

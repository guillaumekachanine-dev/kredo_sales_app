"use client"

import { useCurrentWorkflowExecution } from "./use-current-workflow-execution"
import { RunDrillDownDialog } from "./RunDrillDownDialog"

function AutomationsIcon() {
  return (
    <svg
      className="size-6 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  )
}

export function WorkflowExecutionIndicatorMobile() {
  const { run, status, isActive, isDetailOpen, setIsDetailOpen, openDetail } =
    useCurrentWorkflowExecution()

  if (!run || !status) return null

  return (
    <>
      {isActive ? (
        <div className="kredo-workflow-mobile-active fixed left-4 bottom-[calc(var(--layout-bottom-nav-height)+0.75rem)] z-[var(--z-fab)] size-14 shadow-[var(--shadow-overlay-sm)]">
          <button
            type="button"
            onClick={openDetail}
            aria-label="Exécution en cours"
            className="relative z-10 flex size-full items-center justify-center rounded-full bg-surface text-primary transition-transform active:scale-90 cursor-pointer"
          >
            <AutomationsIcon />
          </button>
        </div>
      ) : status === "succeeded" ? (
        <button
          type="button"
          onClick={openDetail}
          aria-label="Exécution réussie"
          className="fixed left-4 bottom-[calc(var(--layout-bottom-nav-height)+0.75rem)] z-[var(--z-fab)] inline-flex size-14 items-center justify-center rounded-full border-2 border-success bg-surface text-success shadow-[var(--shadow-overlay-sm)] transition-[transform,background-color,border-color] active:scale-90 cursor-pointer"
        >
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </button>
      ) : status === "failed" ? (
        <button
          type="button"
          onClick={openDetail}
          aria-label="Échec de l'exécution"
          className="fixed left-4 bottom-[calc(var(--layout-bottom-nav-height)+0.75rem)] z-[var(--z-fab)] inline-flex size-14 items-center justify-center rounded-full border-2 border-danger bg-surface text-danger shadow-[var(--shadow-overlay-sm)] transition-[transform,background-color,border-color] active:scale-90 cursor-pointer"
        >
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : status === "cancelled" ? (
        <button
          type="button"
          onClick={openDetail}
          aria-label="Exécution annulée"
          className="fixed left-4 bottom-[calc(var(--layout-bottom-nav-height)+0.75rem)] z-[var(--z-fab)] inline-flex size-14 items-center justify-center rounded-full border-2 border-border bg-surface text-muted shadow-[var(--shadow-overlay-sm)] transition-[transform,background-color,border-color] active:scale-90 cursor-pointer"
        >
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
          </svg>
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

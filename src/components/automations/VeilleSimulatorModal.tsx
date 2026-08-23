"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { fetchCadenceSimulatorWorkflows } from "@/lib/automations/cadence-simulator-actions"
import type {
  CadenceSimulatorWorkflow,
  VeilleSimulatorBaseline,
} from "@/lib/automations/veille-cadence"
import { VeilleSimulatorCard } from "./VeilleSimulatorCard"

interface VeilleSimulatorModalProps {
  open: boolean
  onClose: () => void
  baseline: VeilleSimulatorBaseline
}

export function VeilleSimulatorModal({ open, onClose, baseline }: VeilleSimulatorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [workflows, setWorkflows] = useState<CadenceSimulatorWorkflow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadWorkflows = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    const result = await fetchCadenceSimulatorWorkflows()
    if (result.ok) {
      setWorkflows(result.workflows)
    } else {
      setWorkflows(null)
      setLoadError(result.error)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
      void loadWorkflows()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [loadWorkflows, open])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/40 backdrop:backdrop-blur-xs rounded-xl border border-border bg-surface p-0 shadow-2xl max-w-xl w-full overflow-hidden transition-all text-body"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-canvas/40">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-2 rounded-full bg-brand-brass" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-heading">
            Simulateur de cadence
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-heading transition-colors cursor-pointer"
          aria-label="Fermer la modale"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-5" aria-live="polite">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center border border-border/50 bg-canvas/30 text-sm text-muted rounded-[var(--radius-medium)]">
            Chargement des workflows et des coûts…
          </div>
        ) : loadError ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 border border-danger/20 bg-danger/[0.03] px-6 text-center rounded-[var(--radius-medium)]">
            <p className="text-sm font-semibold text-heading">Données du simulateur indisponibles</p>
            <p className="text-xs text-muted">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadWorkflows()}
              className="min-h-10 border border-border bg-surface px-4 text-xs font-semibold text-heading transition-colors hover:bg-surface-hover rounded-[var(--radius-medium)]"
            >
              Réessayer
            </button>
          </div>
        ) : workflows ? (
          <VeilleSimulatorCard baseline={baseline} workflows={workflows} />
        ) : null}
      </div>
    </dialog>
  )
}

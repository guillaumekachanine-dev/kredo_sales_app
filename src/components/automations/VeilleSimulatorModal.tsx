"use client"

import { useEffect, useRef } from "react"
import type { VeilleSimulatorBaseline } from "@/lib/automations/veille-cadence"
import { VeilleSimulatorCard } from "./VeilleSimulatorCard"

interface VeilleSimulatorModalProps {
  open: boolean
  onClose: () => void
  baseline: VeilleSimulatorBaseline
}

export function VeilleSimulatorModal({ open, onClose, baseline }: VeilleSimulatorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/40 backdrop:backdrop-blur-xs rounded-xl border border-border bg-surface p-0 shadow-2xl max-w-lg w-full overflow-hidden transition-all text-body"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-canvas/40">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-2 rounded-full bg-brand-brass animate-pulse" />
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

      <div className="p-5">
        <VeilleSimulatorCard baseline={baseline} />
      </div>
    </dialog>
  )
}

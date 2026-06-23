import React, { useEffect, useRef } from "react"
import { IconMic, IconTask, IconStage, IconFinance, IconContact, IconChevron } from "./icons"

interface CockpitQuickActionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionSelect: (actionLabel: string) => void
}

export function CockpitQuickActionsSheet({
  open,
  onOpenChange,
  onActionSelect,
}: CockpitQuickActionsSheetProps) {
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

  const actions = [
    { label: "Enregistrer une note vocale", icon: IconMic },
    { label: "Créer ou mettre à jour une tâche", icon: IconTask },
    { label: "Créer ou mettre à jour un besoin", icon: IconStage },
    { label: "Accéder au simulateur financier", icon: IconFinance },
    { label: "Créer ou mettre à jour un contact", icon: IconContact },
  ]

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto w-[90%] max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl backdrop:bg-black/60 outline-none z-50 flex flex-col gap-4 outline-none focus:outline-none"
      onClick={(e) => {
        if (e.target === dialogRef.current) onOpenChange(false)
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted block mb-0.5">
            Commandes transverses
          </span>
          <h2 className="font-heading text-base font-bold text-heading">
            Actions rapides
          </h2>
        </div>
        {/* Close Button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="text-muted hover:text-heading transition-colors p-1"
          aria-label="Fermer"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Actions list */}
      <div className="flex flex-col gap-1.5 mt-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              type="button"
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-canvas/50 active:bg-canvas transition-all text-left group"
              onClick={() => {
                onActionSelect(action.label)
                onOpenChange(false)
              }}
            >
              <span className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon />
                </span>
                <span className="text-xs font-semibold text-heading leading-tight">{action.label}</span>
              </span>
              <IconChevron />
            </button>
          )
        })}
      </div>
    </dialog>
  )
}

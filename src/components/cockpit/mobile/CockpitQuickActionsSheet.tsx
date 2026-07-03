import React, { useEffect, useRef } from "react"
import { IconStage, IconCalendar, IconContact, IconMic } from "./icons"
import { cn } from "@/lib/utils"

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
    { label: "Créer un besoin", icon: IconStage },
    { label: "Créer un contact", icon: IconContact },
    { label: "Créer un événement", icon: IconCalendar },
    { label: "Créer note vocale", icon: IconMic, disabled: true },
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

      {/* Actions list as square cards grid */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        {actions.map((action) => {
          const Icon = action.icon
          const isDisabled = action.disabled
          
          return (
            <button
              key={action.label}
              type="button"
              disabled={isDisabled}
              className={cn(
                "flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-border/60 bg-canvas/30 transition-all aspect-square gap-3 select-none active:scale-95 focus:outline-none",
                isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-canvas/50 hover:border-border active:bg-canvas border-border/40 group"
              )}
              onClick={() => {
                if (!isDisabled) {
                  onActionSelect(action.label)
                  onOpenChange(false)
                }
              }}
            >
              <span className={cn(
                "flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 transition-colors",
                !isDisabled && "group-hover:bg-primary group-hover:text-white"
              )}>
                <Icon />
              </span>
              <span className="text-[11px] font-bold text-heading leading-tight">{action.label}</span>
            </button>
          )
        })}
      </div>
    </dialog>
  )
}

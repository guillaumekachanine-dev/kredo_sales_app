import React, { useEffect, useRef } from "react"
import { IconStage, IconCalendar, IconContact } from "./icons"
import { cn } from "@/lib/utils"

type CockpitQuickAction = "contact" | "event" | "need" | "staffing"

interface CockpitQuickActionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionSelect: (action: CockpitQuickAction) => void
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
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [open])

  const actions = [
    { label: "Contact", action: "contact" as const, icon: IconContact },
    { label: "Événement", action: "event" as const, icon: IconCalendar },
    { label: "Besoin", action: "need" as const, icon: IconStage },
    { label: "Staffing", action: "staffing" as const, icon: IconStage },
  ]

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto w-[90%] max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-2xl backdrop:bg-black/60 outline-none z-50 open:flex focus:outline-none"
      onClick={(e) => {
        if (e.target === dialogRef.current) onOpenChange(false)
      }}
      onCancel={(event) => {
        event.preventDefault()
        onOpenChange(false)
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
          className="flex size-11 items-center justify-center rounded-[var(--radius-small)] text-muted transition-colors hover:text-heading"
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
          return (
            <button
              key={action.label}
              type="button"
              className={cn(
                "flex min-h-28 flex-col items-center justify-center gap-3 rounded-[var(--radius-medium)] border border-border/60 bg-canvas/30 p-4 text-center transition-colors active:scale-[0.98] focus:outline-none hover:bg-canvas/50 hover:border-border group",
              )}
              onClick={() => {
                onActionSelect(action.action)
              }}
            >
              <span className={cn(
                "flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 transition-colors",
                "group-hover:bg-primary group-hover:text-white"
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

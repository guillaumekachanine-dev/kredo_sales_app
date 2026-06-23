import React, { useEffect, useRef } from "react"
import {
  IconStage,
  IconDocument,
  IconTask,
  IconContact,
  IconFinance,
  IconBolt,
  IconRadar,
  IconSparkStack,
  IconChevron,
} from "./icons"

export type ContextSheetKind = "staffing" | "meeting" | "prospect"

interface CockpitContextSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: ContextSheetKind | null
  label: string
  onActionSelect: (actionLabel: string) => void
}

const SHEET_LIBRARY = {
  staffing: {
    title: "Actions staffing",
    eyebrow: "Staffings & besoins",
    actions: [
      { label: "Changer l'étape du staffing", icon: IconStage },
      { label: "Consulter les CV", icon: IconDocument },
      { label: "Créer ou modifier une tâche", icon: IconTask },
      { label: "Contacter le client", icon: IconContact },
      { label: "Ouvrir la simulation financière", icon: IconFinance },
    ],
  },
  meeting: {
    title: "Actions rendez-vous",
    eyebrow: "Rendez-vous clients",
    actions: [
      { label: "Élaborer un pitch", icon: IconBolt },
      { label: "Consulter l'actualité du client", icon: IconRadar },
      { label: "Générer une synthèse des échanges avec Next Steps IA", icon: IconSparkStack },
      { label: "Créer ou modifier une tâche", icon: IconTask },
    ],
  },
  prospect: {
    title: "Actions prospection",
    eyebrow: "Prospection",
    actions: [
      { label: "Créer un pitch ou rédiger un email avec l'IA", icon: IconBolt },
      { label: "Appeler le prospect", icon: IconContact },
      { label: "Consulter ses analyses", icon: IconRadar },
      { label: "Créer ou modifier une tâche", icon: IconTask },
    ],
  },
}

export function CockpitContextSheet({
  open,
  onOpenChange,
  kind,
  label,
  onActionSelect,
}: CockpitContextSheetProps) {
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

  if (!kind) return null
  const definition = SHEET_LIBRARY[kind]
  if (!definition) return null

  // Special meeting summary formatting
  const isMeeting = kind === "meeting"
  const meetingParts = isMeeting ? label.split(" · ") : null
  const meetingClient = meetingParts ? meetingParts[0] ?? "" : ""
  const meetingDate = meetingParts ? meetingParts[1] ?? "" : ""
  const meetingTime = meetingParts ? meetingParts[2] ?? "" : ""

  const displayTitle = isMeeting
    ? `${meetingClient} - ${meetingDate} - ${meetingTime}`
    : definition.title

  const displaySubtitle = isMeeting ? undefined : label

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
            {definition.eyebrow}
          </span>
          <h2 className="font-heading text-base font-bold text-heading">
            {displayTitle}
          </h2>
          {displaySubtitle && (
            <p className="text-xs text-body mt-1 leading-relaxed">{displaySubtitle}</p>
          )}
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
        {definition.actions.map((action) => {
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

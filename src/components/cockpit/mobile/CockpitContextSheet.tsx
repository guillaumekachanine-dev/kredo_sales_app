import React from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
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
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={displayTitle}
      subtitle={displaySubtitle}
      eyebrow={definition.eyebrow}
      side="bottom"
      hideMobileBackBtn={true}
      className="rounded-t-[var(--radius-medium)]"
    >
      <div className="sheet-grabber -mt-2 mb-2" aria-hidden="true" />
      
      <div className="sheet-actions">
        {definition.actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              type="button"
              className="sheet-action"
              onClick={() => {
                onActionSelect(action.label)
                onOpenChange(false)
              }}
            >
              <span className="sheet-action-leading">
                <span className="sheet-action-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span>{action.label}</span>
              </span>
              <IconChevron />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="sheet-close"
        onClick={() => onOpenChange(false)}
      >
        Fermer
      </button>
    </AppDrawer>
  )
}

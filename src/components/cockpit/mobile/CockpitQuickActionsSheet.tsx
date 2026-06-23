import React from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
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
  const actions = [
    { label: "Enregistrer une note vocale", icon: IconMic },
    { label: "Créer ou mettre à jour une tâche", icon: IconTask },
    { label: "Créer ou mettre à jour un besoin", icon: IconStage },
    { label: "Accéder au simulateur financier", icon: IconFinance },
    { label: "Créer ou mettre à jour un contact", icon: IconContact },
  ]

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Actions rapides"
      eyebrow="Commandes transverses"
      side="bottom"
      hideMobileBackBtn={true}
      className="rounded-t-[var(--radius-medium)]"
    >
      <div className="sheet-grabber -mt-2 mb-2" aria-hidden="true" />
      
      <div className="sheet-actions">
        {actions.map((action) => {
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

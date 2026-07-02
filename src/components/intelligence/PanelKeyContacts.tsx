"use client"

import type { PanelContact } from "@/lib/intelligence/account-panel-types"

const ROLE_LABELS: Record<string, string> = {
  decideur: "Décideur",
  dsi: "DSI",
  direction_metier: "Direction métier",
}

interface PanelKeyContactsProps {
  contacts: PanelContact[]
}

export function PanelKeyContacts({ contacts }: PanelKeyContactsProps) {
  if (contacts.length === 0) {
    return (
      <p className="text-[11px] italic text-primary-fg/35">
        Aucun contact clé identifié.
      </p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {contacts.map((contact) => (
        <li
          key={contact.id}
          className="flex items-center gap-3 rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5 transition-colors hover:bg-primary-fg/[0.08]"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/25 text-[10px] font-bold text-primary-fg">
            {contact.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-primary-fg">
              {contact.fullName}
            </p>
            <p className="truncate text-[11px] text-primary-fg/45">
              {contact.jobTitle ?? ROLE_LABELS[contact.relationshipRole] ?? "—"}
            </p>
          </div>
          {contact.isPriority && (
            <span className="shrink-0 rounded-full bg-brand-brass/20 px-1.5 py-px text-[8px] font-bold text-brand-brass">
              Prioritaire
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

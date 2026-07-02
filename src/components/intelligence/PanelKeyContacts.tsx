"use client"

import type { PanelContact } from "@/lib/intelligence/account-panel-types"

const ROLE_LABELS: Record<string, string> = {
  decideur: "Décideur",
  dsi: "DSI",
  direction_metier: "Direction métier",
}

interface PanelKeyContactsProps {
  contacts: PanelContact[]
  tone?: "dark" | "light"
}

export function PanelKeyContacts({ contacts, tone = "dark" }: PanelKeyContactsProps) {
  const isDark = tone === "dark"

  if (contacts.length === 0) {
    return (
      <p className={isDark ? "text-[11px] italic text-primary-fg/35" : "text-[11px] italic text-muted"}>
        Aucun contact clé identifié.
      </p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {contacts.map((contact) => (
        <li
          key={contact.id}
          className={
            isDark
              ? "flex items-center gap-3 rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5 transition-colors hover:bg-primary-fg/[0.08]"
              : "flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5 transition-colors hover:bg-surface-hover"
          }
        >
          <span className={isDark ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/25 text-[10px] font-bold text-primary-fg" : "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"}>
            {contact.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className={isDark ? "truncate text-xs font-semibold text-primary-fg" : "truncate text-xs font-semibold text-heading"}>
              {contact.fullName}
            </p>
            <p className={isDark ? "truncate text-[11px] text-primary-fg/45" : "truncate text-[11px] text-muted"}>
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

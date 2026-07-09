"use client"

import type { ReactNode } from "react"
import { relationshipRoleLabel } from "@/lib/accounts-contacts/contact-constants"
import type { PanelContact } from "@/lib/intelligence/account-panel-types"
import { openContactFromIntelligencePanel } from "@/lib/intelligence/panel-drawer-switch"

interface PanelKeyContactsProps {
  contacts: PanelContact[]
  tone?: "dark" | "light"
}

// Même carte "relief + bordure ambre + shine" que les boutons d'action
// (Section 1) en tone dark — rejouée ici sur les lignes de contacts.
function rowClass(isDark: boolean) {
  return isDark
    ? "kredo-action-card-dark flex w-full items-center gap-3 rounded-lg p-2.5 text-left cursor-pointer"
    : "flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-2.5 text-left transition-colors hover:bg-surface-hover cursor-pointer"
}

function Row({ isDark, children }: { isDark: boolean; children: ReactNode }) {
  return isDark ? (
    <span className="relative z-10 flex w-full items-center gap-3">{children}</span>
  ) : (
    <>{children}</>
  )
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
        <li key={contact.id}>
          <button
            type="button"
            onClick={() => openContactFromIntelligencePanel(contact.id)}
            className={rowClass(isDark)}
          >
            <Row isDark={isDark}>
              <span className={isDark ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/25 text-[10px] font-bold text-primary-fg" : "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"}>
                {contact.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className={isDark ? "truncate text-xs font-semibold text-primary-fg" : "truncate text-xs font-semibold text-heading"}>
                  {contact.fullName}
                </p>
                <p className={isDark ? "truncate text-[11px] text-primary-fg/45" : "truncate text-[11px] text-muted"}>
                  {contact.jobTitle ?? relationshipRoleLabel(contact.relationshipRole)}
                </p>
              </div>
              {contact.isPriority && (
                <span className="shrink-0 rounded-full bg-brand-brass/20 px-1.5 py-px text-[8px] font-bold text-brand-brass">
                  Prioritaire
                </span>
              )}
            </Row>
          </button>
        </li>
      ))}
    </ul>
  )
}

"use client"

import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import type { ClientIntelligenceContact } from "@/lib/intelligence/intelligence-data"

export function ContactSelector({
  contacts,
  value,
  onChange,
  isMobile = false,
}: {
  contacts: ClientIntelligenceContact[]
  value: string | undefined
  onChange: (contact: ClientIntelligenceContact | null) => void
  isMobile?: boolean
}) {
  const selectCls = cn(
    "w-full rounded-lg border border-border/35 bg-surface/20 px-3 font-medium text-body transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0",
    isMobile ? "h-11 text-xs" : "h-10 text-sm"
  )

  return (
    <Select
      value={value || ""}
      onChange={(e) => {
        const contact = contacts.find((c) => c.id === e.target.value) || null
        onChange(contact)
      }}
      className={selectCls}
    >
      <option value="">Non spécifié — « Madame, Monsieur »</option>
      {contacts.map((contact) => (
        <option key={contact.id} value={contact.id}>
          {contact.fullName} {contact.jobTitle ? `(${contact.jobTitle})` : ""}
        </option>
      ))}
    </Select>
  )
}

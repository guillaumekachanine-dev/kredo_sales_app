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
    "w-full rounded border border-border bg-surface px-3 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50",
    isMobile ? "h-11" : "h-9"
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

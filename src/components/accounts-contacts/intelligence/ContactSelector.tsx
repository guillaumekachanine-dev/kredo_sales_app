"use client"

import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import type { ClientIntelligenceContact } from "@/lib/intelligence/intelligence-data"

export function formatContactOptionLabel(contact: ClientIntelligenceContact) {
  return contact.jobTitle
    ? `${contact.fullName} — ${contact.jobTitle}`
    : contact.fullName
}

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
    "w-full rounded-lg border border-border/35 bg-surface/20 pl-2.5 pr-5 font-medium text-white transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0 [&>span]:text-[10px] [&>svg]:mr-[-2px] [&>svg]:size-3",
    isMobile ? "h-9 text-[10px]" : "h-7 text-[10px]"
  )

  return (
    <Select
      value={value || ""}
      onChange={(e) => {
        const contact = contacts.find((c) => c.id === e.target.value) || null
        onChange(contact)
      }}
      className={selectCls}
      dropdownWidthMode="dynamic"
      maxDropdownWidth="400px"
    >
      <option value="">Générique - Madame, Monsieur</option>
      {contacts.map((contact) => (
        <option key={contact.id} value={contact.id}>
          {formatContactOptionLabel(contact)}
        </option>
      ))}
    </Select>
  )
}

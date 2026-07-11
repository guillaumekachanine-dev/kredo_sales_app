"use client"

import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import type { CollaboratorOption } from "./get-collaborator-options"

// Lot 8 — sélecteur de consultant, même famille que ContactSelector/EntityRefSelect
// (native <select>, workspace ≤ ~20 collaborateurs — le filtrage clavier natif
// du navigateur suffit à une "recherche fluide" à cette échelle).
export function CollaboratorSelect({
  options,
  value,
  onChange,
  loading = false,
  isMobile = false,
}: {
  options: CollaboratorOption[]
  value: string | undefined
  onChange: (collaborator: CollaboratorOption | null) => void
  loading?: boolean
  isMobile?: boolean
}) {
  const selectCls = cn(
    "w-full rounded-lg border border-border/35 bg-surface/20 pl-2.5 pr-5 font-medium text-white transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0 [&>span]:text-[10px] [&>svg]:mr-[-2px] [&>svg]:size-3",
    isMobile ? "h-9 text-[10px]" : "h-7 text-[10px]",
  )

  return (
    <Select
      value={value || ""}
      onChange={(e) => {
        const collaborator = options.find((option) => option.id === e.target.value) || null
        onChange(collaborator)
      }}
      disabled={loading}
      className={selectCls}
    >
      <option value="">{loading ? "Chargement…" : "Choisir un consultant…"}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.displayName}
          {option.currentTitle ? ` — ${option.currentTitle}` : ""}
          {option.practice ? ` (${option.practice})` : ""}
        </option>
      ))}
    </Select>
  )
}

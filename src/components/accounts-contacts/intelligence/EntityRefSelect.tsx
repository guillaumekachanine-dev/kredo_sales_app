"use client"

import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import type { EntityRefOption } from "./get-account-crm-refs"

// Lot 7 — sélecteur générique pour les entités pivot facultatives (opportunité,
// mission, candidat). Même pattern que ContactSelector : <Select> léger, pas de
// modale (listes courtes, ≤25 éléments par requête).
export function EntityRefSelect({
  options,
  value,
  onChange,
  placeholder,
  loading = false,
  isMobile = false,
}: {
  options: EntityRefOption[]
  value: string | undefined
  onChange: (id: string | undefined) => void
  placeholder: string
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
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={loading}
      className={selectCls}
    >
      <option value="">{loading ? "Chargement…" : placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
          {option.meta ? ` — ${option.meta}` : ""}
        </option>
      ))}
    </Select>
  )
}

"use client"

import { useState } from "react"
import { NewOpportunityDrawer } from "@/components/missions/NewOpportunityDrawer"

/**
 * Bouton "Nouvelle opportunité" + drawer de création.
 * Extrait en composant client pour que la page parent reste Server Component.
 */
export function NewOpportunityButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-fg hover:bg-primary/90 active:scale-[.98] transition-all"
        title="Nouvelle opportunité"
      >
        <span className="whitespace-nowrap">+ nouvelle opportunité</span>
      </button>

      <NewOpportunityDrawer open={open} onOpenChange={setOpen} />
    </>
  )
}

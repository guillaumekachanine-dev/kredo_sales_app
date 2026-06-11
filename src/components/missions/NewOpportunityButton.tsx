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
        className="w-9 h-9 flex items-center justify-center rounded-md bg-primary text-primary-fg hover:bg-primary/90 active:scale-[.98] transition-all shrink-0"
        title="Nouvelle opportunité"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      <NewOpportunityDrawer open={open} onOpenChange={setOpen} />
    </>
  )
}

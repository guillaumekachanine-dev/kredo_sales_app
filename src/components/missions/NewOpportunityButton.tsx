"use client"

import { useState } from "react"
import { NewOpportunityDrawer } from "@/components/missions/NewOpportunityDrawer"
import { cn } from "@/lib/utils"

/**
 * Bouton "Nouvelle opportunité" + drawer de création.
 * Extrait en composant client pour que la page parent reste Server Component.
 */
export function NewOpportunityButton({
  fullWidth = false,
  className,
  iconOnly = false,
}: {
  fullWidth?: boolean
  className?: string
  iconOnly?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-7 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-fg hover:bg-primary/90 active:scale-[.98] transition-all",
          fullWidth && "w-full",
          iconOnly && "w-7 px-0",
          className,
        )}
        title="Nouveau besoin"
        aria-label="Nouveau besoin"
      >
        <span className="whitespace-nowrap">{iconOnly ? "+" : "+ Nouveau besoin"}</span>
      </button>

      <NewOpportunityDrawer open={open} onOpenChange={setOpen} />
    </>
  )
}

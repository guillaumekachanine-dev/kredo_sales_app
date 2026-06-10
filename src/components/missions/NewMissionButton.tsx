"use client"

import { useState } from "react"
import { NewOpportunityDrawer } from "@/components/missions/NewOpportunityDrawer"

export function NewMissionButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-primary text-primary-fg hover:bg-primary/90 active:scale-[.98] transition-all shrink-0"
      >
        Nouvelle mission
      </button>

      <NewOpportunityDrawer open={open} onOpenChange={setOpen} defaultStage="gagne" />
    </>
  )
}

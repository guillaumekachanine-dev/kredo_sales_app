"use client"

import { useState } from "react"
import { NewOpportunityDrawer } from "@/components/missions/NewOpportunityDrawer"
import { Button } from "@/components/ui/Button"
import { FinancialModelingDesktopDialog } from "@/features/financial-modeling/components/desktop/FinancialModelingDesktopDialog"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"

export function CockpitHeaderActions() {
  const [isOpportunityOpen, setIsOpportunityOpen] = useState(false)
  const [isSimulationOpen, setIsSimulationOpen] = useState(false)

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <Button size="sm" variant="primary" onClick={() => setIsOpportunityOpen(true)}>
        Nouvelle action
      </Button>
      <Button size="sm" variant="secondary" onClick={() => openCommunicationComposer({ origin: "cockpit_header" })}>
        Rédiger
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setIsSimulationOpen(true)}>
        Simuler
      </Button>

      <NewOpportunityDrawer open={isOpportunityOpen} onOpenChange={setIsOpportunityOpen} />
      {isSimulationOpen ? (
        <FinancialModelingDesktopDialog open={isSimulationOpen} onOpenChange={setIsSimulationOpen} />
      ) : null}
    </div>
  )
}

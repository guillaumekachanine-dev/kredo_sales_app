"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { ConsultantDrawer } from "@/components/consultants/ConsultantDrawer"

// Îlot client minimal : ouvre le drawer collaborateur DÉJÀ existant
// (ConsultantDrawer, réutilisé tel quel — self-fetch par collaborators.id).
// Aucun second drawer spécifique à Engagements.

interface ViewProfileButtonProps {
  collaboratorId: string
}

export function ViewProfileButton({ collaboratorId }: ViewProfileButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        fullWidth
        onClick={() => setOpen(true)}
      >
        Voir le profil
      </Button>
      <ConsultantDrawer
        collaboratorId={open ? collaboratorId : null}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

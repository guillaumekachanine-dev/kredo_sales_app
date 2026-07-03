"use client"

import { useEffect } from "react"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"

export function CockpitPitchMailDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  useEffect(() => {
    if (!open) return

    openCommunicationComposer({ origin: "cockpit_header" })
    onOpenChange(false)
  }, [open, onOpenChange])

  return null
}

"use client"

import { SourceManagementShell } from "@/features/source-management/components/SourceManagementShell"

/** Module « Gestion des sources » rendu autoportant pour le Cockpit. */
export function SourceManagementModule({ onClose }: { onClose: () => void }) {
  return (
    <SourceManagementShell
      variant="mobile"
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    />
  )
}

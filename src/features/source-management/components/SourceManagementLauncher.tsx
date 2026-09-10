"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { SourceManagementShell } from "./SourceManagementShell"

function SourceParametersIcon({ className = "size-4" }: { className?: string }) {
  return (
    <Image src="/icons_set/source_parameters.png" alt="" width={20} height={20} className={className} aria-hidden="true" />
  )
}

export interface SourceManagementLauncherProps {
  variant: "desktop" | "mobile"
}

/**
 * Trigger partagé « Gérer les sources ». Ne monte jamais les deux shells à la fois :
 * `variant` décide, à la construction du render, lequel des deux composants est rendu.
 */
export function SourceManagementLauncher({ variant }: SourceManagementLauncherProps) {
  const [open, setOpen] = useState(false)

  if (variant === "desktop") {
    return (
      <>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)} leftIcon={<SourceParametersIcon />}>
          Gérer les sources
        </Button>
        <SourceManagementShell variant="desktop" open={open} onOpenChange={setOpen} />
      </>
    )
  }

  return (
    <>
      <IconButton
        aria-label="Gérer les sources"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <SourceParametersIcon className="size-5" />
      </IconButton>
      <SourceManagementShell variant="mobile" open={open} onOpenChange={setOpen} />
    </>
  )
}

"use client"

import { loadSourceManagementSnapshot } from "@/features/source-management/actions/source-management-actions"
import { SourceManagementDrawerMobile } from "@/features/source-management/components/SourceManagementDrawerMobile"
import { ModuleLoadingDrawer } from "./ModuleLoadingDrawer"
import { useModuleSnapshot } from "./use-module-snapshot"

const TITLE = "Gérer les sources"

/** Module « Gestion des sources » rendu autoportant pour le Cockpit. */
export function SourceManagementModule({ onClose }: { onClose: () => void }) {
  const state = useModuleSnapshot(loadSourceManagementSnapshot)

  if (state.status !== "ready") {
    return (
      <ModuleLoadingDrawer
        open
        onOpenChange={(next) => { if (!next) onClose() }}
        title={TITLE}
        isError={state.status === "error"}
        message={state.status === "error" ? state.message : "Chargement du socle éditorial…"}
      />
    )
  }

  return (
    <SourceManagementDrawerMobile
      open
      onOpenChange={(next) => { if (!next) onClose() }}
      snapshot={state.data}
    />
  )
}

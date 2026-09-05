"use client"

import { loadVeilleSimulatorBaseline } from "@/lib/automations/cadence-simulator-actions"
import { VeilleSimulatorModal } from "@/components/automations/VeilleSimulatorModal"
import { ModuleLoadingDrawer } from "./ModuleLoadingDrawer"
import { useModuleSnapshot } from "./use-module-snapshot"

const TITLE = "Simuler la cadence"

/** Module « Simuler la cadence » rendu autoportant pour le Cockpit. */
export function CadenceSimulatorModule({ onClose }: { onClose: () => void }) {
  const state = useModuleSnapshot(loadVeilleSimulatorBaseline)

  if (state.status !== "ready") {
    return (
      <ModuleLoadingDrawer
        open
        onOpenChange={(next) => { if (!next) onClose() }}
        title={TITLE}
        isError={state.status === "error"}
        message={state.status === "error" ? state.message : "Chargement de la baseline de veille…"}
      />
    )
  }

  return <VeilleSimulatorModal open onClose={onClose} baseline={state.data} />
}

"use client"

import { loadEngagementsOverview } from "@/app/(app)/missions/_actions/load-engagements-overview"
import { PortfolioAtlasDialog } from "@/components/missions/dashboard/PortfolioAtlasDialog"
import { ModuleLoadingDrawer } from "./ModuleLoadingDrawer"
import { useModuleSnapshot } from "./use-module-snapshot"

const TITLE = "Atlas du portefeuille"

/**
 * Module « Atlas du portefeuille » : exposition client, production annuelle,
 * cockpit projets et pont de marge, sur les engagements réalisés de l'année.
 *
 * `PortfolioAtlasDialog` est réutilisée telle quelle plutôt que redessinée :
 * ses quatre vues portent déjà leurs affordances étroites (mode mobile du
 * treemap, conteneur à défilement propre de la heatmap) et le dialog est clampé
 * à la largeur du viewport. Le seul obstacle au Cockpit était le modèle de vue
 * passé en prop — d'où ce chargeur, et rien de plus. Construire un second Atlas
 * mobile sur spéculation aurait créé deux rendus du même portefeuille à faire
 * diverger.
 */
export function PortfolioAtlasModule({ onClose }: { onClose: () => void }) {
  const state = useModuleSnapshot(loadEngagementsOverview)

  if (state.status !== "ready") {
    return (
      <ModuleLoadingDrawer
        open
        onOpenChange={(next) => { if (!next) onClose() }}
        title={TITLE}
        isError={state.status === "error"}
        message={state.status === "error" ? state.message : "Chargement du portefeuille…"}
      />
    )
  }

  return (
    <PortfolioAtlasDialog
      open
      onOpenChange={(next) => { if (!next) onClose() }}
      overview={state.data}
    />
  )
}

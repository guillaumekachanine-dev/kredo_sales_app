import { OpportunityDetailView } from "@/components/missions/opportunity-detail/OpportunityDetailView"
import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"

// Surface centrale du chapitre Besoins (Lot 6). PRODUCT-04 tranché (OPP-24) :
// détail **inline**, réutilise `OpportunityDetailView` tel quel — aucun modèle
// de détail dupliqué, aucun drawer besoin dédié. La route `/missions/opps/[id]`
// reste pour le deep-link plein écran.

interface NeedsDetailPanelProps {
  detail: OpportunityDetailData | null
  detailError: string | null
  hasSelection: boolean
}

function CenteredMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-canvas px-8 text-center">
      <div className="max-w-sm">
        <h2 className="font-heading text-lg font-bold text-heading">{title}</h2>
        <p className="mt-1.5 text-xs leading-5 text-muted">{description}</p>
      </div>
    </div>
  )
}

export function NeedsDetailPanel({ detail, detailError, hasSelection }: NeedsDetailPanelProps) {
  if (detail) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
        <OpportunityDetailView data={detail} device="desktop" />
      </div>
    )
  }
  if (detailError) {
    return (
      <CenteredMessage
        title="Détail du besoin indisponible"
        description={detailError}
      />
    )
  }
  if (!hasSelection) {
    return (
      <CenteredMessage
        title="Aucun besoin ouvert"
        description="Créez un besoin ou ajustez les filtres du rail gauche pour afficher un détail ici."
      />
    )
  }
  return (
    <CenteredMessage
      title="Sélectionnez un besoin"
      description="Choisissez un besoin dans le rail gauche pour afficher sa fiche complète."
    />
  )
}

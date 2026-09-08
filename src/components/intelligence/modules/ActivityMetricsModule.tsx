"use client"

import { CommercialActivityModal } from "@/features/commercial-activity/CommercialActivityModal"
import type { CommercialActivityFilterNature } from "@/features/commercial-activity/commercial-activity-types"

/**
 * Module « Métriques activité ». Un seul moteur, deux cadrages : la nature
 * d'activité ouverte par défaut dépend de la page d'appel. L'utilisateur peut
 * toujours élargir depuis le filtre de la modale.
 */
export function ActivityMetricsModule({
  onClose,
  initialNature,
}: {
  onClose: () => void
  initialNature: CommercialActivityFilterNature
}) {
  return (
    <CommercialActivityModal
      open
      onClose={onClose}
      displayMode="mobile"
      initialNature={initialNature}
    />
  )
}

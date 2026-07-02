"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import type { IntelligenceEntityType } from "@/lib/intelligence/intelligence-registry"

interface RegisterIntelligenceEntityProps {
  entityType: Exclude<IntelligenceEntityType, "company">
  entityId: string | null
  label: string | null
  // Pour les surfaces qui montent plusieurs instances simultanément (ex. les
  // onglets de /missions, tous montés mais un seul visible) : seule
  // l'instance active doit s'enregistrer auprès du panneau.
  active?: boolean
}

export function RegisterIntelligenceEntity({
  entityType,
  entityId,
  label,
  active = true,
}: RegisterIntelligenceEntityProps) {
  const pathname = usePathname()
  const { registerEntity } = useIntelligenceContext()

  useEffect(() => {
    if (!active || !entityId || !label) return

    // Capture ce qui était affiché avant nous (ex. la fiche compte sous-jacente
    // à la page /prospection/accounts/[companyId]) pour le restaurer à la
    // fermeture — plutôt que de vider le panneau, ce qui le faisait retomber
    // sur la vue générique par pathname au lieu de reprendre la vue quittée.
    const previous = useIntelligenceContext.getState().entityContext
    registerEntity({ entityType, entityId, label, pathname })

    return () => {
      useIntelligenceContext.setState({ entityContext: previous })
    }
  }, [active, entityType, entityId, label, pathname, registerEntity])

  return null
}

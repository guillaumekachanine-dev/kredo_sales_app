"use client"

import { useEffect, useState } from "react"
import { SectionTab } from "@/lib/tabs/tab-types"
import { getOpportunityDetail } from "@/app/(app)/missions/_data/get-opportunity-detail"
import { OpportunityEditForm } from "./OpportunityEditForm"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type {
  Contact,
  Opportunity,
  OpportunityEvent,
  OpportunitySkill,
  OpportunityStandingProfile,
} from "@/types/database-domain"

interface OpportunityDetailData {
  opportunity: Opportunity
  account: {
    id: string
    name: string
    sector: string | null
    website: string | null
  } | null
  skills: OpportunitySkill[]
  contacts: Array<{
    contact: Contact
    role: string | null
  }>
  events: OpportunityEvent[]
  standingProfiles: OpportunityStandingProfile[]
}

interface OpportunityDetailPanelProps {
  tab: SectionTab
}

export function OpportunityDetailPanel({ tab }: OpportunityDetailPanelProps) {
  const [data, setData] = useState<OpportunityDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  // Synchronisation de l'état de chargement lors du changement de prop/clé au rendu
  const [prevIdAndKey, setPrevIdAndKey] = useState({ id: tab.entityId, key: refreshKey })
  if (tab.entityId !== prevIdAndKey.id || refreshKey !== prevIdAndKey.key) {
    setPrevIdAndKey({ id: tab.entityId, key: refreshKey })
    setLoading(true)
    setError(null)
  }

  useEffect(() => {
    let active = true

    getOpportunityDetail(tab.entityId)
      .then((result) => {
        if (!active) return
        if (result.error) {
          setError(result.error)
        } else if (result.data) {
          setData(result.data)
        } else {
          setError("Données invalides reçues.")
        }
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : "Erreur de chargement.")
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tab.entityId, refreshKey])

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
          <div className="flex flex-col gap-2 w-full">
            <div className="h-4 w-24 bg-border/30 rounded animate-pulse" />
            <div className="h-8 w-64 bg-border/40 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-64 bg-border/20 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-8">
        <SurfaceCard className="p-6 border-danger/20 bg-danger/5 flex flex-col gap-2 items-center text-center">
          <span className="text-sm font-semibold text-danger">Une erreur est survenue</span>
          <p className="text-xs text-muted">{error}</p>
        </SurfaceCard>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-8">
        <SurfaceCard className="p-6 flex flex-col gap-2 items-center text-center">
          <span className="text-sm font-semibold text-heading">Opportunité introuvable</span>
          <p className="text-xs text-muted">L&apos;opportunité demandée n&apos;existe pas ou a été supprimée.</p>
        </SurfaceCard>
      </div>
    )
  }

  // Utiliser la clé unique pour ré-initialiser automatiquement le formulaire à la mise à jour
  return (
    <OpportunityEditForm
      key={`${data.opportunity.id}-${data.opportunity.updated_at}`}
      data={data}
      onSuccess={() => setRefreshKey((prev) => prev + 1)}
    />
  )
}

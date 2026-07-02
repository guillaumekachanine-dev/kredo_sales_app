"use client"

import { useEffect, useState } from "react"
import type { SectionTab } from "@/lib/tabs/tab-types"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { AccountIntelligencePanelData } from "@/lib/intelligence/account-panel-types"
import { RegisterIntelligenceContext } from "@/components/intelligence/RegisterIntelligenceContext"
import { ClientIntelligenceDesktopView } from "./intelligence/ClientIntelligenceDesktopView"
import { ClientIntelligenceMobileView } from "./intelligence/ClientIntelligenceMobileView"

function LoadingShell() {
  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6 animate-pulse">
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-24 bg-border/40 rounded" />
          <div className="h-7 w-64 bg-border/40 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-border/30 rounded" />
          <div className="h-8 w-24 bg-primary/10 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 flex flex-col gap-5">
          <div className="h-48 bg-border/20 rounded-lg" />
          <div className="h-32 bg-border/20 rounded-lg" />
        </div>
        <div className="col-span-4 flex flex-col gap-5">
          <div className="h-40 bg-border/20 rounded-lg" />
          <div className="h-28 bg-border/20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

interface CrmEntityPanelProps {
  tab: SectionTab
  isMobile?: boolean
  // Le shell desktop garde tous les onglets montés (masqués en CSS) pour
  // préserver leur état. Un seul onglet à la fois doit piloter le panneau
  // Intelligence global, sinon un onglet inactif écraserait le contexte
  // de l'onglet actif dès que son propre fetch se termine.
  isActive?: boolean
}

export function CrmEntityPanel({ tab, isMobile = false, isActive = true }: CrmEntityPanelProps) {
  const [data, setData] = useState<ClientIntelligenceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [panelData, setPanelData] = useState<AccountIntelligencePanelData | null>(null)

  useEffect(() => {
    setData(null)
    setError(null)
    setPanelData(null)
    fetch(`/api/intelligence/${tab.entityId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Compte introuvable")
        return r.json() as Promise<ClientIntelligenceData>
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erreur inconnue"))

    // Contrat lean séparé pour le panneau Cockpit Intelligence global — n'affecte
    // pas l'affichage de la page si cet appel échoue, juste le branchement du panneau.
    fetch(`/api/intelligence-panel/${tab.entityId}`)
      .then((r) => (r.ok ? (r.json() as Promise<AccountIntelligencePanelData>) : null))
      .then(setPanelData)
      .catch(() => setPanelData(null))
  }, [tab.entityId])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted">
        <span className="text-sm font-semibold">Impossible de charger le cockpit</span>
        <span className="text-xs">{error}</span>
      </div>
    )
  }

  if (!data) return <LoadingShell />

  return (
    <>
      {isActive && panelData && (
        <RegisterIntelligenceContext
          entityType="company"
          entityId={tab.entityId}
          label={data.company.name}
          panelData={panelData}
        />
      )}
      {isMobile ? (
        <ClientIntelligenceMobileView data={data} />
      ) : (
        <ClientIntelligenceDesktopView data={data} />
      )}
    </>
  )
}

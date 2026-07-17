"use client"

import { useState, useMemo } from "react"
import { BusinessIntelligenceDesktopViewModel } from "../presenters/build-business-intelligence-desktop-model"
import { BusinessIntelligenceHeader } from "./BusinessIntelligenceHeader"
import { StrategicBrief } from "./StrategicBrief"
import { IntelligenceKpiStrip } from "./IntelligenceKpiStrip"
import { AccountPriorityBoard } from "./AccountPriorityBoard"
import { PotentialReachMatrix } from "./PotentialReachMatrix"
import { AccountAttackPanel } from "./AccountAttackPanel"
import { SectorWindowsLedger } from "./SectorWindowsLedger"
import { SectorPanorama } from "./SectorPanorama"
import { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import { SectorActivationWindow } from "@/lib/prospection/sector-activation-types"
import dynamic from "next/dynamic"

const SectorPlaybooksModal = dynamic(
  () => import("../playbooks/SectorPlaybooksModal").then(mod => mod.SectorPlaybooksModal),
  { ssr: false }
)


interface BusinessIntelligenceDesktopProps {
  viewModel: BusinessIntelligenceDesktopViewModel
  snapshot: BusinessIntelligenceSnapshot
}

export function BusinessIntelligenceDesktop(props: BusinessIntelligenceDesktopProps) {
  if (props.snapshot.state === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-8">
        <section className="max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <h1 className="text-lg font-semibold text-[var(--color-text-main)]">Données indisponibles</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">La Business Intelligence ne peut pas être chargée pour le moment.</p>
        </section>
      </main>
    )
  }

  return <BusinessIntelligenceDesktopReady {...props} />
}

function BusinessIntelligenceDesktopReady({ viewModel, snapshot }: BusinessIntelligenceDesktopProps) {
  // Filters
  const [period, setPeriod] = useState<30 | 90 | 180>(30)
  const [selectedSector, setSelectedSector] = useState<string | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Playbooks modal state
  const [isPlaybooksOpen, setIsPlaybooksOpen] = useState(false)

  // Get active period precomputed model
  const periodData = useMemo(() => {
    return viewModel.periods[period]
  }, [viewModel.periods, period])

  // Apply filters to priority board
  const filteredAccounts = useMemo(() => {
    return periodData.priorityBoard.filter(account => {
      if (selectedSector !== "all" && account.sectorId !== selectedSector) return false
      if (searchQuery && !account.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [periodData.priorityBoard, selectedSector, searchQuery])

  // Apply filters to matrix points
  const filteredMatrixPoints = useMemo(() => {
    return periodData.matrixPoints.filter(point => {
      const acc = periodData.priorityBoard.find(a => a.accountId === point.accountId)
      if (!acc) return false
      if (selectedSector !== "all" && acc.sectorId !== selectedSector) return false
      if (searchQuery && !acc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [periodData.matrixPoints, periodData.priorityBoard, selectedSector, searchQuery])

  // Selection state (stored selectedAccountId, resolves to activeSelectedId)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  const activeSelectedId = useMemo(() => {
    if (selectedAccountId && filteredAccounts.some(a => a.accountId === selectedAccountId)) {
      return selectedAccountId
    }
    return filteredAccounts[0]?.accountId ?? null
  }, [filteredAccounts, selectedAccountId])

  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id)
  }

  const handleSelectWindow = (window: SectorActivationWindow) => {
    if (window.exposedAccountIds && window.exposedAccountIds.length > 0) {
      const firstExposedId = window.exposedAccountIds[0]
      setSelectedAccountId(firstExposedId)
    }
  }

  const selectedBaseAccount = useMemo(() => {
    return periodData.priorityBoard.find(a => a.accountId === activeSelectedId) ?? undefined
  }, [activeSelectedId, periodData.priorityBoard])

  const selectedAttackData = activeSelectedId ? periodData.attackPanelData[activeSelectedId] ?? null : null

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      <BusinessIntelligenceHeader onPlaybooksClick={() => setIsPlaybooksOpen(true)} />

      {/* Filter Bar */}
      <div className="px-8 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center gap-4">
        <select 
          className="bg-[var(--color-background)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-dataviz-1)]"
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value) as 30 | 90 | 180)}
        >
          <option value={30}>30 derniers jours</option>
          <option value={90}>90 derniers jours</option>
          <option value={180}>180 derniers jours</option>
        </select>

        <select 
          className="bg-[var(--color-background)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-dataviz-1)]"
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
        >
          <option value="all">Tous les secteurs</option>
          {viewModel.panorama.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <input 
          type="search"
          placeholder="Rechercher un compte..."
          className="bg-[var(--color-background)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-dataviz-1)] w-64"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 p-8 space-y-6">
        {viewModel.hasDemoData && (
          <div className="bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded px-4 py-2 text-sm text-[var(--color-muted)] flex items-center">
            <span className="w-2 h-2 rounded-full bg-orange-500 mr-2 flex-shrink-0" />
            Certaines activités de démonstration sont incluses dans les indicateurs.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <StrategicBrief brief={periodData.strategicBrief} />
            <IntelligenceKpiStrip kpis={periodData.kpis} />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[400px]">
              <AccountPriorityBoard 
                accounts={filteredAccounts} 
                selectedAccountId={activeSelectedId}
                onSelectAccount={handleSelectAccount} 
              />
              <PotentialReachMatrix 
                points={filteredMatrixPoints}
                selectedAccountId={activeSelectedId}
                onSelectAccount={handleSelectAccount} 
              />
            </div>

            <div className="h-[300px]">
              <SectorWindowsLedger 
                windows={viewModel.windowsLedger} 
                onSelectWindow={handleSelectWindow}
              />
            </div>
          </div>
          
          <div className="lg:col-span-1 flex flex-col h-full min-h-[800px]">
            <AccountAttackPanel 
              attackData={selectedAttackData} 
              baseAccount={selectedBaseAccount}
            />
          </div>
        </div>

        <div className="h-[250px]">
          <SectorPanorama sectors={viewModel.panorama} />
        </div>
      </div>

      {isPlaybooksOpen && (
        <SectorPlaybooksModal
          open={isPlaybooksOpen}
          onClose={() => setIsPlaybooksOpen(false)}
          snapshot={snapshot}
          initialSectorId={selectedSector}
          onApplySector={(sectorId, accountId) => {
            setSelectedSector(sectorId)
            if (accountId) {
              setSelectedAccountId(accountId)
            }
            setIsPlaybooksOpen(false)
          }}
        />
      )}

    </div>
  )
}

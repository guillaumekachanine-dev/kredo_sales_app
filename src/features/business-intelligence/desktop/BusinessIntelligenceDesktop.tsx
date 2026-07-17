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

interface BusinessIntelligenceDesktopProps {
  viewModel: BusinessIntelligenceDesktopViewModel
}

export function BusinessIntelligenceDesktop({ viewModel }: BusinessIntelligenceDesktopProps) {
  // Filters
  const [period, setPeriod] = useState<30 | 90 | 180>(30)
  const [selectedSector, setSelectedSector] = useState<string | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Apply filters to priority board
  const filteredAccounts = useMemo(() => {
    return viewModel.priorityBoard.filter(account => {
      if (selectedSector !== "all" && account.sectorId !== selectedSector) return false
      if (searchQuery && !account.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [viewModel.priorityBoard, selectedSector, searchQuery])

  // Apply filters to matrix
  const filteredMatrixPoints = useMemo(() => {
    return viewModel.matrixPoints.filter(point => {
      const acc = viewModel.priorityBoard.find(a => a.accountId === point.accountId)
      if (!acc) return false
      if (selectedSector !== "all" && acc.sectorId !== selectedSector) return false
      if (searchQuery && !acc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [viewModel.matrixPoints, viewModel.priorityBoard, selectedSector, searchQuery])

  // Selection state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(filteredAccounts[0]?.accountId ?? null)

  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id)
  }

  const handleSelectWindow = (window: any) => {
    if (window.exposedAccounts && window.exposedAccounts.length > 0) {
      // Find the first exposed account that is in the priority board
      const firstExposedId = window.exposedAccounts[0]
      setSelectedAccountId(firstExposedId)
    }
  }

  const selectedBaseAccount = useMemo(() => {
    return viewModel.priorityBoard.find(a => a.accountId === selectedAccountId)
  }, [selectedAccountId, viewModel.priorityBoard])

  const selectedAttackData = selectedAccountId ? viewModel.attackPanelData[selectedAccountId] ?? null : null

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      <BusinessIntelligenceHeader />

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
            <StrategicBrief brief={viewModel.strategicBrief} />
            <IntelligenceKpiStrip kpis={viewModel.kpis} />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[400px]">
              <AccountPriorityBoard 
                accounts={filteredAccounts} 
                selectedAccountId={selectedAccountId}
                onSelectAccount={handleSelectAccount} 
              />
              <PotentialReachMatrix 
                points={filteredMatrixPoints}
                selectedAccountId={selectedAccountId}
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
    </div>
  )
}

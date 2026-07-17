"use client"

import { useState, useMemo } from "react"
import { BusinessIntelligenceDesktopViewModel } from "../presenters/build-business-intelligence-desktop-model"
import { BusinessIntelligenceHeader } from "./BusinessIntelligenceHeader"
import { StrategicBrief } from "./StrategicBrief"
import { IntelligenceKpiStrip } from "./IntelligenceKpiStrip"
import { AccountPriorityBoard } from "./AccountPriorityBoard"
import { PotentialReachMatrix } from "./PotentialReachMatrix"
import { AccountAttackPanel } from "./AccountAttackPanel"
import { SectorWindowsTimeline } from "./SectorWindowsTimeline"
import { PriorityAccountsModal, SectorWindowsModal } from "./BusinessIntelligenceLedgerModals"
import { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import { SectorActivationWindow } from "@/lib/prospection/sector-activation-types"
import dynamic from "next/dynamic"

const SectorPlaybooksModal = dynamic(
  () => import("../playbooks/SectorPlaybooksModal").then(mod => mod.SectorPlaybooksModal),
  { ssr: false }
)

const SectorStudiesModal = dynamic(
  () => import("../studies/SectorStudiesModal").then(mod => mod.SectorStudiesModal),
  { ssr: false },
)


interface BusinessIntelligenceDesktopProps {
  viewModel: BusinessIntelligenceDesktopViewModel
  snapshot: BusinessIntelligenceSnapshot
}

export function BusinessIntelligenceDesktop(props: BusinessIntelligenceDesktopProps) {
  if (props.snapshot.state === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-8">
        <section className="max-w-md rounded-xl border border-border/40 bg-surface/30 p-6 text-center">
          <h1 className="text-lg font-semibold text-heading">Données indisponibles</h1>
          <p className="mt-2 text-sm text-muted">La Business Intelligence ne peut pas être chargée pour le moment.</p>
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
  const [isStudiesOpen, setIsStudiesOpen] = useState(false)
  const [isAccountsOpen, setIsAccountsOpen] = useState(false)
  const [isWindowsOpen, setIsWindowsOpen] = useState(false)

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
    <div className="min-h-screen bg-canvas">
      <BusinessIntelligenceHeader onPlaybooksClick={() => setIsPlaybooksOpen(true)} onStudiesClick={() => setIsStudiesOpen(true)} />

      {/* Filter Bar */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 border-b border-border/40 px-4 py-3 lg:px-8">
        <select 
          className="min-h-9 rounded-lg border border-border/40 bg-surface/30 px-3 text-xs font-semibold text-body transition-colors hover:bg-surface-hover/30 hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value) as 30 | 90 | 180)}
        >
          <option value={30}>30 derniers jours</option>
          <option value={90}>90 derniers jours</option>
          <option value={180}>180 derniers jours</option>
        </select>

        <select 
          className="min-h-9 rounded-lg border border-border/40 bg-surface/30 px-3 text-xs font-semibold text-body transition-colors hover:bg-surface-hover/30 hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
        >
          <option value="all">Tous les secteurs</option>
          {snapshot.sectors.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <input 
          type="search"
          placeholder="Rechercher un compte..."
          className="min-h-9 w-full rounded-lg border border-border/40 bg-surface/30 px-3 text-xs font-semibold text-body placeholder:text-muted transition-colors hover:bg-surface-hover/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-72"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        {viewModel.hasDemoData && (
          <div className="flex items-center rounded-lg border border-border/40 bg-surface/30 px-4 py-2 text-xs text-muted">
            <span className="mr-2 size-2 shrink-0 rounded-full bg-warning" />
            Certaines activités de démonstration sont incluses dans les indicateurs.
          </div>
        )}

        <StrategicBrief brief={periodData.strategicBrief} />
        <IntelligenceKpiStrip kpis={periodData.kpis} />
        <AccountPriorityBoard accounts={filteredAccounts} selectedAccountId={activeSelectedId} onSelectAccount={handleSelectAccount} limit={5} onShowAll={() => setIsAccountsOpen(true)} />
        <div className="grid gap-6 xl:grid-cols-2">
          <PotentialReachMatrix points={filteredMatrixPoints} selectedAccountId={activeSelectedId} onSelectAccount={handleSelectAccount} />
          <AccountAttackPanel attackData={selectedAttackData} baseAccount={selectedBaseAccount} />
        </div>
        <SectorWindowsTimeline windows={viewModel.windowsLedger} onSelectWindow={handleSelectWindow} />
      </main>

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

      {isStudiesOpen && <SectorStudiesModal open onClose={() => setIsStudiesOpen(false)} snapshot={snapshot} initialSectorId={selectedSector} />}
      <PriorityAccountsModal open={isAccountsOpen} onClose={() => setIsAccountsOpen(false)} accounts={filteredAccounts} selectedAccountId={activeSelectedId} onSelectAccount={(accountId) => { handleSelectAccount(accountId); setIsAccountsOpen(false) }} />
      <SectorWindowsModal open={isWindowsOpen} onClose={() => setIsWindowsOpen(false)} windows={viewModel.windowsLedger} onSelectWindow={(window) => { handleSelectWindow(window); setIsWindowsOpen(false) }} />

    </div>
  )
}

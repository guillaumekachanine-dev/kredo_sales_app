"use client"

import { useState, useMemo, useEffect } from "react"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import { BusinessIntelligenceDesktopViewModel } from "@/features/business-intelligence/presenters/build-business-intelligence-desktop-model"
import { BusinessIntelligenceSnapshot } from "@/features/business-intelligence/data/business-intelligence-types"
import { StrategicBrief } from "@/features/business-intelligence/desktop/StrategicBrief"
import { IntelligenceKpiStrip } from "@/features/business-intelligence/desktop/IntelligenceKpiStrip"
import { AccountPriorityBoard } from "@/features/business-intelligence/desktop/AccountPriorityBoard"
import { PotentialReachMatrix } from "@/features/business-intelligence/desktop/PotentialReachMatrix"
import { AccountAttackPanel } from "@/features/business-intelligence/desktop/AccountAttackPanel"
import { PriorityAccountsModal } from "@/features/business-intelligence/desktop/BusinessIntelligenceLedgerModals"
import { ProspectionIntelligenceHeader } from "./ProspectionIntelligenceHeader"
import { ProspectionIntelligenceLocalNavigation, PiTabKey } from "./ProspectionIntelligenceLocalNavigation"

interface ProspectionIntelligenceDesktopProps {
  viewModel: BusinessIntelligenceDesktopViewModel
  snapshot: BusinessIntelligenceSnapshot
}

export function ProspectionIntelligenceDesktop(props: ProspectionIntelligenceDesktopProps) {
  if (props.snapshot.state === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-8">
        <section className="max-w-md rounded-xl border border-border/40 bg-surface/30 p-6 text-center">
          <h1 className="text-lg font-semibold text-body">Données indisponibles</h1>
          <p className="mt-2 text-sm text-muted">La Prospection ne peut pas être chargée pour le moment.</p>
        </section>
      </main>
    )
  }

  return <ProspectionIntelligenceDesktopReady {...props} />
}

function ProspectionIntelligenceDesktopReady({ viewModel, snapshot }: ProspectionIntelligenceDesktopProps) {
  const [activeTab, setActiveTab] = useState<PiTabKey>("strategy")

  // Filters
  const [period, setPeriod] = useState<30 | 90 | 180>(30)
  const [selectedSector, setSelectedSector] = useState<string | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals state
  const [isAccountsOpen, setIsAccountsOpen] = useState(false)

  // Repli automatique de la sidebar principale
  useEffect(() => {
    useSidebarCollapse.getState().requestCollapse()
    return () => useSidebarCollapse.getState().requestRestore()
  }, [])

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

  const selectedBaseAccount = useMemo(() => {
    return periodData.priorityBoard.find(a => a.accountId === activeSelectedId) ?? undefined
  }, [activeSelectedId, periodData.priorityBoard])

  const selectedAttackData = activeSelectedId ? periodData.attackPanelData[activeSelectedId] ?? null : null

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-canvas">
      <ProspectionIntelligenceLocalNavigation active={activeTab} onChange={setActiveTab} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ProspectionIntelligenceHeader />

        <div className="flex-1 overflow-y-auto">
          {activeTab === "strategy" && (
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
          )}

          <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 lg:px-8 lg:py-8">
            {viewModel.hasDemoData && activeTab === "strategy" && (
              <div className="flex items-center rounded-lg border border-border/40 bg-surface/30 px-4 py-2 text-xs text-muted">
                <span className="mr-2 size-2 shrink-0 rounded-full bg-muted" />
                Certaines activités de démonstration sont incluses dans les indicateurs.
              </div>
            )}

            {activeTab === "strategy" && (
              <>
                <StrategicBrief brief={periodData.strategicBrief} />
                <IntelligenceKpiStrip kpis={periodData.kpis} />
                <AccountPriorityBoard accounts={filteredAccounts} selectedAccountId={activeSelectedId} onSelectAccount={handleSelectAccount} limit={5} onShowAll={() => setIsAccountsOpen(true)} />
                <div className="grid gap-6 xl:grid-cols-2">
                  <PotentialReachMatrix points={filteredMatrixPoints} selectedAccountId={activeSelectedId} onSelectAccount={handleSelectAccount} />
                  <AccountAttackPanel attackData={selectedAttackData} baseAccount={selectedBaseAccount} />
                </div>
              </>
            )}

            {activeTab === "chapter_1" && (
              <div className="max-w-4xl space-y-6">
                <div className="rounded-xl border border-border/40 bg-surface/30 p-6">
                  <h3 className="text-lg font-bold text-heading">Fenêtres d&apos;opportunités</h3>
                  <p className="mt-2 text-sm text-muted">Cette page est actuellement vide. Elle accueillera prochainement les fenêtres d&apos;opportunités.</p>
                </div>
              </div>
            )}

            {activeTab === "chapter_2" && (
              <div className="max-w-4xl space-y-6">
                <div className="rounded-xl border border-border/40 bg-surface/30 p-6">
                  <h3 className="text-lg font-bold text-heading">Approches commerciales</h3>
                  <p className="mt-2 text-sm text-muted">Cette page est actuellement vide. Elle accueillera prochainement les approches commerciales.</p>
                </div>
              </div>
            )}

            {activeTab === "chapter_3" && (
              <div className="max-w-4xl space-y-6">
                <div className="rounded-xl border border-border/40 bg-surface/30 p-6">
                  <h3 className="text-lg font-bold text-heading">Playbooks</h3>
                  <p className="mt-2 text-sm text-muted">Cette page est actuellement vide. Elle accueillera prochainement les playbooks commerciaux.</p>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      <PriorityAccountsModal
        open={isAccountsOpen}
        onClose={() => setIsAccountsOpen(false)}
        accounts={filteredAccounts}
        selectedAccountId={activeSelectedId}
        onSelectAccount={(accountId) => {
          handleSelectAccount(accountId)
          setIsAccountsOpen(false)
        }}
      />
    </div>
  )
}

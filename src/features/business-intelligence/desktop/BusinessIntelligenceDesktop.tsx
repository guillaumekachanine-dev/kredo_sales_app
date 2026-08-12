"use client"

import { useState, useMemo, useEffect } from "react"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
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
import { Button } from "@/components/ui/Button"
import { BusinessIntelligenceLocalNavigation, BiTabKey } from "./BusinessIntelligenceLocalNavigation"
import dynamic from "next/dynamic"
import type { SectorMapCatalog } from "@/features/sector-mapping/data/sector-map-catalog"
import type { CompetitiveMapWorkspace } from "@/features/competitive-map/data/competitive-map-workspace-types"

const SectorPlaybooksModal = dynamic(
  () => import("../playbooks/SectorPlaybooksModal").then(mod => mod.SectorPlaybooksModal),
  { ssr: false }
)

const SectorStudiesModal = dynamic(
  () => import("../studies/SectorStudiesModal").then(mod => mod.SectorStudiesModal),
  { ssr: false },
)

const BusinessIntelligenceSectorMapDesktop = dynamic(
  () => import("@/features/sector-mapping/integration/BusinessIntelligenceSectorMapDesktop").then((mod) => mod.BusinessIntelligenceSectorMapDesktop),
  { loading: () => <div className="min-h-64 animate-pulse rounded-xl bg-surface/30" aria-label="Chargement de la cartographie" /> },
)

const CompetitiveEnvironmentWorkspace = dynamic(
  () => import("@/features/competitive-map/components/CompetitiveEnvironmentWorkspace").then((mod) => mod.CompetitiveEnvironmentWorkspace),
  { loading: () => <div className="min-h-[32rem] animate-pulse bg-edito-surface" aria-label="Chargement de l’environnement concurrentiel" /> },
)


interface BusinessIntelligenceDesktopProps {
  viewModel: BusinessIntelligenceDesktopViewModel
  snapshot: BusinessIntelligenceSnapshot
  sectorMapCatalog: SectorMapCatalog
  competitiveMapWorkspace: CompetitiveMapWorkspace
  initialTab?: BiTabKey
}

export function BusinessIntelligenceDesktop(props: BusinessIntelligenceDesktopProps) {
  if (props.snapshot.state === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-8">
        <section className="max-w-md rounded-xl border border-border/40 bg-surface/30 p-6 text-center">
          <h1 className="text-lg font-semibold text-body">Données indisponibles</h1>
          <p className="mt-2 text-sm text-muted">La Business Intelligence ne peut pas être chargée pour le moment.</p>
        </section>
      </main>
    )
  }

  return <BusinessIntelligenceDesktopReady {...props} />
}

function BusinessIntelligenceDesktopReady({ viewModel, snapshot, sectorMapCatalog, competitiveMapWorkspace, initialTab = "priorities" }: BusinessIntelligenceDesktopProps) {
  // Filters
  const [period, setPeriod] = useState<30 | 90 | 180>(30)
  const [selectedSector, setSelectedSector] = useState<string | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<BiTabKey>(initialTab)

  // Repli automatique de la sidebar principale
  useEffect(() => {
    useSidebarCollapse.getState().requestCollapse()
    return () => useSidebarCollapse.getState().requestRestore()
  }, [])

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
    setSelectedWindowId(window.id)
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
    <div className="flex h-screen min-h-0 overflow-hidden bg-canvas">
      <BusinessIntelligenceLocalNavigation active={activeTab} onChange={setActiveTab} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <BusinessIntelligenceHeader minimal={activeTab === "competitive_env"} onPlaybooksClick={() => setIsPlaybooksOpen(true)} onStudiesClick={() => setIsStudiesOpen(true)} />

        <div className="flex-1 overflow-y-auto">
          {activeTab !== "value_chain" && activeTab !== "competitive_env" ? <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 border-b border-border/40 px-4 py-3 lg:px-8">
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
          </div> : null}

          <main className={`mx-auto w-full ${activeTab === "competitive_env" ? "max-w-none p-0" : activeTab === "value_chain" ? "max-w-[1600px] space-y-6 px-4 py-4 lg:px-6 lg:py-5" : "max-w-[1600px] space-y-6 px-4 py-6 lg:px-8 lg:py-8"}`}>
            {viewModel.hasDemoData && activeTab !== "value_chain" && activeTab !== "competitive_env" && (
              <div className="flex items-center rounded-lg border border-border/40 bg-surface/30 px-4 py-2 text-xs text-muted">
                <span className="mr-2 size-2 shrink-0 rounded-full bg-muted" />
                Certaines activités de démonstration sont incluses dans les indicateurs.
              </div>
            )}

            {activeTab === "priorities" && (
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

            {activeTab === "windows" && (
              <SectorWindowsTimeline windows={viewModel.windowsLedger} onSelectWindow={handleSelectWindow} selectedWindowId={selectedWindowId} onShowAll={() => setIsWindowsOpen(true)} />
            )}

            {activeTab === "sectors" && (
              <div className="max-w-4xl space-y-6">
                <div className="rounded-xl border border-border/40 bg-surface/30 p-6">
                  <h3 className="text-lg font-bold text-heading">Études sectorielles</h3>
                  <p className="mt-2 text-sm text-body leading-relaxed">
                    Accédez aux études sectorielles actives et en veille pour KREDO. Les études détaillent la réglementation, la chaîne de valeur et les stratégies de prospection adaptées à chaque industrie.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Button variant="secondary" onClick={() => setIsStudiesOpen(true)}>
                      Consulter les études sectorielles ({snapshot.sectors.length})
                    </Button>
                    <Button variant="secondary" onClick={() => setIsPlaybooksOpen(true)}>
                      Consulter les playbooks commerciaux
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "value_chain" && (
              <BusinessIntelligenceSectorMapDesktop catalog={sectorMapCatalog} />
            )}

            {activeTab === "competitive_env" && (
              <CompetitiveEnvironmentWorkspace workspace={competitiveMapWorkspace} />
            )}
          </main>
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

      {isStudiesOpen && <SectorStudiesModal open onClose={() => setIsStudiesOpen(false)} snapshot={snapshot} initialSectorId={selectedSector} />}
      <PriorityAccountsModal open={isAccountsOpen} onClose={() => setIsAccountsOpen(false)} accounts={filteredAccounts} selectedAccountId={activeSelectedId} onSelectAccount={(accountId) => { handleSelectAccount(accountId); setIsAccountsOpen(false) }} />
      <SectorWindowsModal open={isWindowsOpen} onClose={() => setIsWindowsOpen(false)} windows={snapshot.windows} selectedWindowId={selectedWindowId} onSelectWindow={(window) => { handleSelectWindow(window); setIsWindowsOpen(false) }} />

    </div>
  )
}

"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import {
  getMobileSectorAccounts,
  resolveMobilePriorityAccountId,
  resolveMobileWindowAccountId,
  type BusinessIntelligenceMobilePeriod,
  type BusinessIntelligenceMobileViewModel,
} from "../presenters/build-business-intelligence-mobile-model"
import { BusinessIntelligenceMobileHeader } from "./BusinessIntelligenceMobileHeader"
import { MobileAccountActionCard } from "./MobileAccountActionCard"
import { MobileDecisionBrief, EmptyPanel } from "./MobileDecisionBrief"
import { MobilePriorityAccounts } from "./MobilePriorityAccounts"
import { MobileSectorWindows } from "./MobileSectorWindows"
import { SectorWindowsModal } from "../desktop/BusinessIntelligenceLedgerModals"
import type { SectorMapCatalog } from "@/features/sector-mapping/data/sector-map-catalog"
import type { CompetitiveMapWorkspace } from "@/features/competitive-map/data/competitive-map-workspace-types"

const SectorStudiesModal = dynamic(() => import("../studies/SectorStudiesModal").then((module) => module.SectorStudiesModal), { ssr: false })
const BusinessIntelligenceSectorMapMobile = dynamic(
  () => import("@/features/sector-mapping/integration/BusinessIntelligenceSectorMapMobile").then((module) => module.BusinessIntelligenceSectorMapMobile),
  { loading: () => <div className="mx-4 mt-4 min-h-64 animate-pulse rounded-xl bg-white/[0.035]" aria-label="Chargement de la cartographie" /> },
)
const CompetitiveEnvironmentMobile = dynamic(
  () => import("@/features/competitive-map/components/mobile/CompetitiveEnvironmentMobile").then((module) => module.CompetitiveEnvironmentMobile),
  { loading: () => <div className="mx-4 mt-4 min-h-72 animate-pulse rounded-xl bg-white/[0.035]" aria-label="Chargement de l’environnement concurrentiel" /> },
)

export type MobileSection = "priorities" | "windows" | "sectors" | "value_chain" | "competitive_env"

export function BusinessIntelligenceMobile({ viewModel, snapshot, sectorMapCatalog, competitiveMapWorkspace, initialSection = "priorities" }: { viewModel: BusinessIntelligenceMobileViewModel; snapshot: BusinessIntelligenceSnapshot; sectorMapCatalog: SectorMapCatalog; competitiveMapWorkspace: CompetitiveMapWorkspace; initialSection?: MobileSection }) {
  const period: BusinessIntelligenceMobilePeriod = 30
  const [section, setSection] = useState<MobileSection>(initialSection)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [selectedSectorId, setSelectedSectorId] = useState<string | "all">("all")
  const [isStudiesOpen, setIsStudiesOpen] = useState(false)
  const [isWindowsOpen, setIsWindowsOpen] = useState(false)
  const periodModel = viewModel.periods[period]
  const displayedAccounts = getMobileSectorAccounts(periodModel, selectedSectorId)
  const activeAccountId = resolveMobilePriorityAccountId(displayedAccounts, selectedAccountId)
  const selectedAccount = displayedAccounts.find((account) => account.accountId === activeAccountId) ?? null

  const selectWindow = (window: (typeof viewModel.windows)[number]) => {
    setSelectedSectorId("all")
    setSelectedAccountId(resolveMobileWindowAccountId(window))
    setSection("priorities")
  }

  if (viewModel.state === "error") return <main className="min-h-dvh bg-canvas py-10"><EmptyPanel title="Données indisponibles" description="La Business Intelligence ne peut pas être chargée pour le moment." /></main>

  return <main className="min-h-dvh overflow-x-hidden bg-canvas pb-[max(1rem,env(safe-area-inset-bottom))] text-white">
    <BusinessIntelligenceMobileHeader />
    <nav aria-label="Sections Business Intelligence" className="sticky top-0 z-20 grid shrink-0 grid-cols-5 border-y border-white/10 bg-[#0b1730]">{([['priorities', 'Priorités'], ['windows', 'Échéances'], ['sectors', 'Secteurs'], ['value_chain', 'Chaîne'], ['competitive_env', 'Concurrents']] as const).map(([id, label]) => { const selected = section === id; return <button key={id} id={`bi-mobile-tab-${id}`} type="button" role="tab" aria-selected={selected} aria-controls="bi-mobile-panel" onClick={() => setSection(id)} className={`relative min-h-12 px-0.5 text-[11px] font-semibold text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-inset ${selected ? "font-bold after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-brand-brass" : "text-white/60 hover:bg-white/[0.05]"}`}>{label}</button> })}</nav>
    {viewModel.hasDemoData && section !== "value_chain" && section !== "competitive_env" ? <p className="px-4 pt-3 text-[11px] text-white/50">Certaines activités de démonstration sont incluses.</p> : null}
    <div id="bi-mobile-panel" role="tabpanel" aria-labelledby={`bi-mobile-tab-${section}`}>
      {section === "priorities" ? <><section className="px-4 py-3" aria-label="Filtrer les priorités par secteur"><label htmlFor="bi-mobile-sector-filter" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">Portefeuille</label><select id="bi-mobile-sector-filter" value={selectedSectorId} onChange={(event) => { setSelectedSectorId(event.target.value); setSelectedAccountId(null) }} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#0d1c38] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass"><option value="all">Tous les secteurs</option>{[...viewModel.activeSectors, ...viewModel.watchSectors].map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></section><MobileDecisionBrief account={selectedAccount} period={periodModel} /><MobilePriorityAccounts accounts={displayedAccounts} selectedAccountId={activeAccountId} onSelectAccount={setSelectedAccountId} /><MobileAccountActionCard account={selectedAccount} /></> : null}
      {section === "windows" ? <MobileSectorWindows windows={viewModel.windows} onSelectWindow={selectWindow} limit={5} onShowAll={() => setIsWindowsOpen(true)} /> : null}
      {section === "sectors" ? <MobileSectorStudiesEntry activeCount={viewModel.activeSectors.length} watchCount={viewModel.watchSectors.length} onOpen={() => setIsStudiesOpen(true)} /> : null}
      {section === "value_chain" ? <BusinessIntelligenceSectorMapMobile catalog={sectorMapCatalog} /> : null}
      {section === "competitive_env" ? <CompetitiveEnvironmentMobile workspace={competitiveMapWorkspace} /> : null}
    </div>
    {isStudiesOpen ? <SectorStudiesModal open onClose={() => setIsStudiesOpen(false)} snapshot={snapshot} isMobile /> : null}
    <SectorWindowsModal open={isWindowsOpen} onClose={() => setIsWindowsOpen(false)} windows={viewModel.windows} isMobile onSelectWindow={(window) => { const mobileWindow = viewModel.windows.find((item) => item.id === window.id); if (mobileWindow) { setIsWindowsOpen(false); selectWindow(mobileWindow) } }} />
  </main>
}

function MobileSectorStudiesEntry({ activeCount, watchCount, onOpen }: { activeCount: number; watchCount: number; onOpen: () => void }) {
  return <section className="space-y-4 px-4 py-5" aria-labelledby="mobile-sector-studies-title"><div className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-brand-brass/35 bg-brand-brass/10 text-brand-brass" aria-hidden="true">▧</span><div><h2 id="mobile-sector-studies-title" className="text-lg font-bold text-white">Études sectorielles</h2><p className="mt-1 text-xs leading-relaxed text-white/55">Accédez aux études actives et suivez les secteurs en veille.</p></div></div><div className="mt-5 divide-y divide-white/10 border-y border-white/10"><div className="flex items-center justify-between py-3"><span className="text-sm font-semibold text-white">Études opérationnelles</span><span className="text-sm font-bold text-brand-brass">{activeCount} actives</span></div><div className="flex items-center justify-between py-3"><span className="text-sm font-semibold text-white">Secteurs en veille</span><span className="text-sm font-bold text-white/60">{watchCount} en veille</span></div></div><button type="button" onClick={onOpen} className="mt-4 min-h-11 w-full rounded-lg border border-brand-brass/45 bg-brand-brass/10 px-3 text-xs font-bold text-brand-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Ouvrir les études sectorielles</button></div></section>
}

"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import {
  getMobileSectorAccounts,
  resolveMobilePriorityAccountId,
  resolveMobileSectorAccountId,
  resolveMobileWindowAccountId,
  type BusinessIntelligenceMobilePeriod,
  type BusinessIntelligenceMobileViewModel,
} from "../presenters/build-business-intelligence-mobile-model"
import { BusinessIntelligenceMobileHeader } from "./BusinessIntelligenceMobileHeader"
import { MobileAccountActionCard } from "./MobileAccountActionCard"
import { MobileDecisionBrief, EmptyPanel } from "./MobileDecisionBrief"
import { MobilePriorityAccounts } from "./MobilePriorityAccounts"
import { MobileSectorOverview } from "./MobileSectorOverview"
import { MobileSectorWindows } from "./MobileSectorWindows"

const SectorPlaybooksModal = dynamic(() => import("../playbooks/SectorPlaybooksModal").then((module) => module.SectorPlaybooksModal), { ssr: false })
type MobileSection = "priorities" | "windows" | "sectors"

export function BusinessIntelligenceMobile({ viewModel, snapshot }: { viewModel: BusinessIntelligenceMobileViewModel; snapshot: BusinessIntelligenceSnapshot }) {
  const [period, setPeriod] = useState<BusinessIntelligenceMobilePeriod>(30)
  const [section, setSection] = useState<MobileSection>("priorities")
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [selectedSectorId, setSelectedSectorId] = useState<string | "all">("all")
  const [playbookSectorId, setPlaybookSectorId] = useState<string | null>(null)
  const periodModel = viewModel.periods[period]
  const displayedAccounts = getMobileSectorAccounts(periodModel, selectedSectorId)
  const activeAccountId = resolveMobilePriorityAccountId(displayedAccounts, selectedAccountId)
  const selectedAccount = displayedAccounts.find((account) => account.accountId === activeAccountId) ?? null

  const selectWindow = (window: (typeof viewModel.windows)[number]) => {
    setSelectedSectorId("all")
    setSelectedAccountId(resolveMobileWindowAccountId(window))
    setSection("priorities")
  }

  if (viewModel.state === "error") return <main className="min-h-dvh bg-[#071126] py-10"><EmptyPanel title="Données indisponibles" description="La Business Intelligence ne peut pas être chargée pour le moment." /></main>

  return <main className="min-h-dvh overflow-x-hidden bg-[#071126] pb-[max(1rem,env(safe-area-inset-bottom))] text-white">
    <BusinessIntelligenceMobileHeader period={period} onPeriodChange={setPeriod} />
    <nav aria-label="Sections Business Intelligence" className="sticky top-0 z-20 border-b border-white/10 bg-[#071126]/95 px-4 py-2 backdrop-blur-sm"><div className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.035] p-1" role="tablist">{([['priorities', 'Priorités'], ['windows', 'Fenêtres'], ['sectors', 'Secteurs']] as const).map(([id, label]) => { const selected = section === id; return <button key={id} id={`bi-mobile-tab-${id}`} type="button" role="tab" aria-selected={selected} aria-controls="bi-mobile-panel" onClick={() => setSection(id)} className={`min-h-11 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass ${selected ? "bg-white/10 text-white underline decoration-brand-brass decoration-2 underline-offset-4" : "text-white/55"}`}>{label}</button> })}</div></nav>
    {viewModel.hasDemoData ? <p className="px-4 pt-3 text-[11px] text-white/50">Certaines activités de démonstration sont incluses.</p> : null}
    <div id="bi-mobile-panel" role="tabpanel" aria-labelledby={`bi-mobile-tab-${section}`}>
      {section === "priorities" ? <><section className="px-4 py-3" aria-label="Filtrer les priorités par secteur"><label htmlFor="bi-mobile-sector-filter" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">Portefeuille</label><select id="bi-mobile-sector-filter" value={selectedSectorId} onChange={(event) => { setSelectedSectorId(event.target.value); setSelectedAccountId(null) }} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#0d1c38] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass"><option value="all">Tous les secteurs</option>{[...viewModel.activeSectors, ...viewModel.watchSectors].map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></section><MobileDecisionBrief account={selectedAccount} period={periodModel} /><MobilePriorityAccounts accounts={displayedAccounts} selectedAccountId={activeAccountId} onSelectAccount={setSelectedAccountId} /><MobileAccountActionCard account={selectedAccount} /></> : null}
      {section === "windows" ? <MobileSectorWindows windows={viewModel.windows} onSelectWindow={selectWindow} /> : null}
      {section === "sectors" ? <MobileSectorOverview activeSectors={viewModel.activeSectors} watchSectors={viewModel.watchSectors} onOpenPlaybook={setPlaybookSectorId} /> : null}
    </div>
    {playbookSectorId ? <SectorPlaybooksModal open onClose={() => setPlaybookSectorId(null)} snapshot={snapshot} initialSectorId={playbookSectorId} isMobile onApplySector={(sectorId, accountId) => { setSelectedSectorId(sectorId); setSelectedAccountId(resolveMobileSectorAccountId(periodModel, sectorId, accountId)); setPlaybookSectorId(null); setSection("priorities") }} /> : null}
  </main>
}

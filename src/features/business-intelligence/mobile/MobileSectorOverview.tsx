"use client"

import type { BusinessIntelligenceMobileSector } from "../presenters/build-business-intelligence-mobile-model"
import { EmptyPanel } from "./MobileDecisionBrief"

export function MobileSectorOverview({ activeSectors, watchSectors, onOpenPlaybook }: { activeSectors: BusinessIntelligenceMobileSector[]; watchSectors: BusinessIntelligenceMobileSector[]; onOpenPlaybook: (sectorId: string) => void }) {
  return <section className="px-4 py-5"><SectorGroup title="Études opérationnelles" sectors={activeSectors} onOpenPlaybook={onOpenPlaybook} active /><SectorGroup title="Secteurs en veille" sectors={watchSectors} onOpenPlaybook={onOpenPlaybook} /></section>
}

function SectorGroup({ title, sectors, onOpenPlaybook, active = false }: { title: string; sectors: BusinessIntelligenceMobileSector[]; onOpenPlaybook: (sectorId: string) => void; active?: boolean }) {
  return <div className="mb-7 last:mb-0"><h2 className="mb-3 text-sm font-bold text-white">{title}</h2>{sectors.length === 0 ? <EmptyPanel title={active ? "Aucun secteur actif" : "Aucun secteur en veille"} description="Aucune donnée sectorielle disponible." /> : <div className="space-y-2">{sectors.map((sector) => <article key={sector.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-white">{sector.name}</h3><p className="mt-1 text-[11px] text-white/55">{sector.topPracticeLabel ?? "Practice non déterminée"}</p></div><span className="text-xs font-bold text-brand-brass">{sector.attractivenessScore === null ? "N/A" : `${sector.attractivenessScore}/100`}</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-white/55"><span>{sector.linkedAccountCount} comptes</span><span>{sector.openWindowCount} fenêtres</span><span>Couv. {sector.averageReachScore === null ? "N/A" : `${sector.averageReachScore}%`}</span></div>{active ? <button type="button" onClick={() => onOpenPlaybook(sector.id)} className="mt-3 min-h-11 w-full rounded-lg border border-brand-brass/35 px-3 text-xs font-semibold text-brand-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass">Consulter le playbook</button> : <p className="mt-3 text-xs font-semibold text-white/45">Étude en préparation</p>}</article>)}</div>}</div>
}

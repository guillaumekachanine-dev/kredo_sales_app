"use client"

import { useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { cn } from "@/lib/utils"
import { ClientExposureTreemap } from "./ClientExposureTreemap"
import { MarginBridgeChart } from "./MarginBridgeChart"
import { ProductionHeatmap } from "./ProductionHeatmap"
import { ProjectsCockpit } from "./ProjectsCockpit"
import type { EngagementsPortfolioViewModel } from "./engagements-portfolio-types"

interface PortfolioAtlasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  overview: EngagementsPortfolioViewModel
}

type AtlasView = "exposure" | "production" | "projects" | "margin"

const VIEWS: ReadonlyArray<readonly [AtlasView, string]> = [
  ["exposure", "Exposition"],
  ["production", "Production"],
  ["projects", "Projets"],
  ["margin", "Marge"],
]

export function PortfolioAtlasDialog({ open, onOpenChange, overview }: PortfolioAtlasDialogProps) {
  const [view, setView] = useState<AtlasView>("exposure")
  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title={<div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">Atlas du portefeuille</p><h2 className="font-heading text-lg font-black text-heading">Engagements réalisés · {overview.year}</h2></div>} description="Une lecture à la fois, alimentée uniquement par les missions AT et projets actifs." className="!h-[min(92dvh,820px)] !w-[min(calc(100vw-1rem),1280px)] !max-w-none" maxHeightClassName="max-h-[min(92dvh,820px)]" bodyClassName="!overflow-hidden !pr-0" headerClassName="border-b border-border pb-3">
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
        <nav className="grid grid-cols-4 rounded-[var(--radius-medium)] border border-border bg-canvas p-1" role="tablist" aria-label="Vues de l’Atlas">{VIEWS.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={view === value} aria-controls={`atlas-${value}`} onClick={() => setView(value)} className={cn("min-h-11 rounded-[var(--radius-small)] px-2 text-[10px] font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", view === value ? "bg-heading text-white" : "text-body hover:text-heading")}>{label}</button>)}</nav>
        <section id={`atlas-${view}`} role="tabpanel" className="min-h-0 overflow-y-auto overscroll-contain rounded-[var(--radius-medium)] border border-border bg-surface p-3 sm:p-4">
          {view === "exposure" && <ClientExposureTreemap clients={overview.portfolio.clients} firstClientPct={overview.portfolio.clientConcentration.firstClientPct} top3ClientsPct={overview.portfolio.clientConcentration.top3ClientsPct} />}
          {view === "production" && <ProductionHeatmap clients={overview.portfolio.production.clients} practices={overview.portfolio.production.practices} />}
          {view === "projects" && <ProjectsCockpit projects={overview.portfolio.projects} />}
          {view === "margin" && <MarginBridgeChart bridges={overview.portfolio.marginBridge} />}
        </section>
      </div>
    </AppDialog>
  )
}

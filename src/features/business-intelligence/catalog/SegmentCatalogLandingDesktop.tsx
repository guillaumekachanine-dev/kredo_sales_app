"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { BusinessIntelligenceCatalog, BusinessIntelligenceCatalogSegment } from "../data/business-intelligence-workspace-types"
import { buildBusinessIntelligenceHref } from "../navigation/business-intelligence-chapters"
import { buildCoverageItems, coverageDetail } from "../coverage/coverage-model"
import { SegmentChangeConfirmDialog } from "./SegmentChangeConfirmDialog"
import { CATALOG_ISSUE_MESSAGES, type BusinessIntelligenceCatalogIssue } from "./catalog-copy"
import { splitCatalogSegmentsByAvailability, type FlatCatalogSegment } from "./flatten-catalog-segments"
import { getSectorIconPath } from "./sector-icon-map"

function SegmentRow({ entry, onSelect }: { entry: FlatCatalogSegment; onSelect: (segment: BusinessIntelligenceCatalogSegment) => void }) {
  const { segment, macroName, macroSlug } = entry
  const iconPath = getSectorIconPath(macroSlug)
  return <li>
    <button type="button" onClick={() => onSelect(segment)} className="grid min-h-24 w-full grid-cols-[auto_minmax(12rem,1fr)_minmax(24rem,2fr)_auto] items-center gap-5 px-3 py-4 text-left hover:bg-edito-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/40">
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-edito-border bg-edito-surface">
        {iconPath ? <Image src={iconPath} alt="" aria-hidden="true" width={44} height={44} className="size-full object-cover" /> : <span className="text-xs font-bold text-edito-muted" aria-hidden="true">{segment.name.charAt(0)}</span>}
      </span>
      <span><span className="block text-sm font-bold text-edito-navy">{segment.name}</span><span className="mt-1 block text-[10px] uppercase tracking-wide text-edito-muted">{macroName} · {segment.accountCount} comptes</span></span>
      <span className="grid grid-cols-3 gap-x-4 gap-y-2">{buildCoverageItems(segment.coverage).map((item) => <span key={item.key} className="min-w-0"><span className="flex items-center gap-1.5 text-[10px] font-semibold text-edito-body"><span className={cn("size-1.5 rounded-full", item.availability.available ? "bg-success" : "bg-edito-border")} />{item.label}</span>{coverageDetail(item.availability) ? <span className="block pl-3 text-[9px] text-edito-muted">{coverageDetail(item.availability)}</span> : null}</span>)}</span>
      <span className="text-xs font-bold text-edito-navy">Sélectionner</span>
    </button>
  </li>
}

export function SegmentCatalogLandingDesktop({ catalog, issue = null }: { catalog: BusinessIntelligenceCatalog; issue?: BusinessIntelligenceCatalogIssue }) {
  const router = useRouter()
  const [pendingSegment, setPendingSegment] = useState<BusinessIntelligenceCatalogSegment | null>(null)
  const [isPending, startTransition] = useTransition()

  const confirm = () => {
    if (!pendingSegment) return
    startTransition(() => router.push(buildBusinessIntelligenceHref(pendingSegment.id, "home")))
  }

  const { available, upcoming } = splitCatalogSegmentsByAvailability(catalog)

  return <main className="relative min-h-screen bg-edito-canvas px-6 py-8 text-edito-body" aria-busy={isPending || undefined}>
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-edito-border pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-edito-muted">Business Intelligence</p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-edito-navy">Choisir un segment de marché</h1>
        <p className="mt-2 max-w-2xl text-sm text-edito-body">Le segment confirmé pilotera l’Accueil et les cinq chapitres analytiques.</p>
      </header>
      {issue ? <p role="alert" className="mt-5 border-l-2 border-warning bg-edito-surface px-4 py-3 text-sm text-edito-body">{CATALOG_ISSUE_MESSAGES[issue]}</p> : null}
      {catalog.state === "error" ? <p role="alert" className="mt-5 border border-danger/25 bg-edito-surface p-5 text-sm">{catalog.error}</p> : null}
      {catalog.state === "empty" ? <p className="mt-5 border border-edito-border bg-edito-surface p-5 text-sm text-edito-muted">Aucun segment n’est disponible.</p> : null}
      {catalog.state === "ready" ? <div className="mt-6">
        {available.length > 0 ? <section>
          <p className="text-xs font-bold uppercase tracking-wider text-edito-navy">Segments disponibles</p>
          <ul className="mt-3 divide-y divide-edito-border border-y border-edito-border bg-edito-surface">
            {available.map((entry) => <SegmentRow key={entry.segment.id} entry={entry} onSelect={setPendingSegment} />)}
          </ul>
        </section> : null}
        {upcoming.length > 0 ? <section className={available.length > 0 ? "mt-8" : undefined}>
          <div className="flex items-center gap-3">
            <p className="shrink-0 text-xs font-bold uppercase tracking-wider text-edito-muted">À venir prochainement</p>
            <span className="h-px flex-1 bg-edito-border" aria-hidden="true" />
          </div>
          <ul className="mt-3 divide-y divide-edito-border border-y border-edito-border bg-edito-surface">
            {upcoming.map((entry) => <SegmentRow key={entry.segment.id} entry={entry} onSelect={setPendingSegment} />)}
          </ul>
        </section> : null}
      </div> : null}
    </div>
    <SegmentChangeConfirmDialog pendingSegment={pendingSegment} isPending={isPending} onCancel={() => setPendingSegment(null)} onConfirm={confirm} />
    {isPending ? <div className="absolute inset-0 z-40 flex items-center justify-center bg-edito-canvas/70" role="status"><p className="border border-edito-border bg-edito-surface px-5 py-3 text-sm font-semibold text-edito-navy">Chargement du workspace…</p></div> : null}
  </main>
}

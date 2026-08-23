"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { BusinessIntelligenceCatalog, BusinessIntelligenceCatalogSegment } from "../data/business-intelligence-workspace-types"
import { buildBusinessIntelligenceHref } from "../navigation/business-intelligence-chapters"
import { SegmentChangeConfirmDialog } from "./SegmentChangeConfirmDialog"
import { CATALOG_ISSUE_MESSAGES, type BusinessIntelligenceCatalogIssue } from "./catalog-copy"
import { splitCatalogSegmentsByAvailability, type FlatCatalogSegment } from "./flatten-catalog-segments"
import { getSectorIconPath } from "./sector-icon-map"

function SegmentRow({ entry, onSelect }: { entry: FlatCatalogSegment; onSelect: (segment: BusinessIntelligenceCatalogSegment) => void }) {
  const { segment, macroName, macroSlug } = entry
  const iconPath = getSectorIconPath(macroSlug)
  const availableCount = Object.values(segment.coverage).filter((item) => item.available).length
  return <li>
    <button type="button" onClick={() => onSelect(segment)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
        {iconPath ? <Image src={iconPath} alt="" aria-hidden="true" width={36} height={36} className="size-full object-cover" /> : <span className="text-xs font-bold text-muted" aria-hidden="true">{segment.name.charAt(0)}</span>}
      </span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-heading">{segment.name}</span><span className="mt-1 block text-[10px] text-muted">{macroName} · {segment.accountCount} comptes · {availableCount} ressources</span></span>
      <span className="shrink-0 text-xs font-semibold text-primary">Choisir</span>
    </button>
  </li>
}

export function SegmentCatalogLandingMobile({ catalog, issue = null }: { catalog: BusinessIntelligenceCatalog; issue?: BusinessIntelligenceCatalogIssue }) {
  const router = useRouter()
  const [pendingSegment, setPendingSegment] = useState<BusinessIntelligenceCatalogSegment | null>(null)
  const [isPending, startTransition] = useTransition()
  const confirm = () => {
    if (!pendingSegment) return
    startTransition(() => router.push(buildBusinessIntelligenceHref(pendingSegment.id, "home")))
  }

  const { available, upcoming } = splitCatalogSegmentsByAvailability(catalog)

  return <main className="relative min-h-dvh bg-canvas pb-[max(1rem,env(safe-area-inset-bottom))] text-body" aria-busy={isPending || undefined}>
    <header className="border-b border-border bg-surface px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Business Intelligence</p>
      <h1 className="mt-1 font-heading text-xl font-bold text-heading">Choisir un segment</h1>
      <p className="mt-1 text-xs leading-relaxed text-body">Un segment unique pour l’ensemble des analyses.</p>
    </header>
    <div className="px-4 py-4">
      {issue ? <p role="alert" className="mb-4 border-l-2 border-warning bg-surface px-3 py-3 text-xs">{CATALOG_ISSUE_MESSAGES[issue]}</p> : null}
      {catalog.state === "error" ? <p role="alert" className="border border-danger/25 bg-surface p-4 text-xs">{catalog.error}</p> : null}
      {catalog.state === "empty" ? <p className="border border-border bg-surface p-4 text-xs text-muted">Aucun segment n’est disponible.</p> : null}
      {catalog.state === "ready" ? <>
        {available.length > 0 ? <section>
          <p className="text-[10px] font-bold uppercase tracking-wider text-heading">Segments disponibles</p>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {available.map((entry) => <SegmentRow key={entry.segment.id} entry={entry} onSelect={setPendingSegment} />)}
          </ul>
        </section> : null}
        {upcoming.length > 0 ? <section className={available.length > 0 ? "mt-6" : undefined}>
          <div className="flex items-center gap-2">
            <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">À venir prochainement</p>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {upcoming.map((entry) => <SegmentRow key={entry.segment.id} entry={entry} onSelect={setPendingSegment} />)}
          </ul>
        </section> : null}
      </> : null}
    </div>
    <SegmentChangeConfirmDialog pendingSegment={pendingSegment} isPending={isPending} onCancel={() => setPendingSegment(null)} onConfirm={confirm} />
    {isPending ? <div className="absolute inset-0 z-40 flex items-center justify-center bg-canvas/75" role="status"><p className="border border-border bg-surface px-4 py-3 text-sm font-semibold text-heading">Chargement du workspace…</p></div> : null}
  </main>
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { BusinessIntelligenceCatalog, BusinessIntelligenceCatalogSegment } from "../data/business-intelligence-workspace-types"
import { buildBusinessIntelligenceHref } from "../navigation/business-intelligence-chapters"
import { buildCoverageItems, coverageDetail } from "../coverage/coverage-model"
import { SegmentChangeConfirmDialog } from "./SegmentChangeConfirmDialog"
import { CATALOG_ISSUE_MESSAGES, type BusinessIntelligenceCatalogIssue } from "./catalog-copy"

export function SegmentCatalogLandingDesktop({ catalog, issue = null }: { catalog: BusinessIntelligenceCatalog; issue?: BusinessIntelligenceCatalogIssue }) {
  const router = useRouter()
  const [expandedMacroId, setExpandedMacroId] = useState<string | null>(catalog.macros[0]?.id ?? null)
  const [pendingSegment, setPendingSegment] = useState<BusinessIntelligenceCatalogSegment | null>(null)
  const [isPending, startTransition] = useTransition()

  const confirm = () => {
    if (!pendingSegment) return
    startTransition(() => router.push(buildBusinessIntelligenceHref(pendingSegment.id, "home")))
  }

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
      {catalog.state === "ready" ? <div className="mt-6 divide-y divide-edito-border border-y border-edito-border bg-edito-surface">
        {catalog.macros.map((macro) => {
          const expanded = expandedMacroId === macro.id
          return <section key={macro.id}>
            <button type="button" aria-expanded={expanded} aria-controls={`catalog-macro-${macro.id}`} onClick={() => setExpandedMacroId(expanded ? null : macro.id)} className="flex min-h-16 w-full items-center justify-between gap-5 px-5 py-3 text-left hover:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edito-navy/40">
              <span><span className="block font-heading text-base font-bold text-edito-navy">{macro.name}</span><span className="mt-1 block text-xs text-edito-muted">{macro.segments.length} segments métier · {macro.accountCount} comptes</span></span>
              <span className="text-xl font-light text-edito-navy" aria-hidden="true">{expanded ? "−" : "+"}</span>
            </button>
            {expanded ? <ul id={`catalog-macro-${macro.id}`} className="divide-y divide-edito-border border-t border-edito-border bg-edito-canvas/70 px-5">
              {macro.segments.map((segment) => <li key={segment.id}>
                <button type="button" onClick={() => setPendingSegment(segment)} className="grid min-h-24 w-full grid-cols-[minmax(12rem,1fr)_minmax(24rem,2fr)_auto] items-center gap-5 px-3 py-4 text-left hover:bg-edito-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/40">
                  <span><span className="block text-sm font-bold text-edito-navy">{segment.name}</span><span className="mt-1 block text-[10px] uppercase tracking-wide text-edito-muted">{segment.status} · {segment.accountCount} comptes</span></span>
                  <span className="grid grid-cols-3 gap-x-4 gap-y-2">{buildCoverageItems(segment.coverage).map((item) => <span key={item.key} className="min-w-0"><span className="flex items-center gap-1.5 text-[10px] font-semibold text-edito-body"><span className={cn("size-1.5 rounded-full", item.availability.available ? "bg-success" : "bg-edito-border")} />{item.label}</span>{coverageDetail(item.availability) ? <span className="block pl-3 text-[9px] text-edito-muted">{coverageDetail(item.availability)}</span> : null}</span>)}</span>
                  <span className="text-xs font-bold text-edito-navy">Sélectionner</span>
                </button>
              </li>)}
            </ul> : null}
          </section>
        })}
      </div> : null}
    </div>
    <SegmentChangeConfirmDialog pendingSegment={pendingSegment} isPending={isPending} onCancel={() => setPendingSegment(null)} onConfirm={confirm} />
    {isPending ? <div className="absolute inset-0 z-40 flex items-center justify-center bg-edito-canvas/70" role="status"><p className="border border-edito-border bg-edito-surface px-5 py-3 text-sm font-semibold text-edito-navy">Chargement du workspace…</p></div> : null}
  </main>
}

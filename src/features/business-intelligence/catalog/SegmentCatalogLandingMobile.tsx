"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AppDrawer } from "@/components/ui/AppDrawer"
import type { BusinessIntelligenceCatalog, BusinessIntelligenceCatalogMacro, BusinessIntelligenceCatalogSegment } from "../data/business-intelligence-workspace-types"
import { buildBusinessIntelligenceHref } from "../navigation/business-intelligence-chapters"
import { SegmentChangeConfirmDialog } from "./SegmentChangeConfirmDialog"
import { CATALOG_ISSUE_MESSAGES, type BusinessIntelligenceCatalogIssue } from "./catalog-copy"

export function SegmentCatalogLandingMobile({ catalog, issue = null }: { catalog: BusinessIntelligenceCatalog; issue?: BusinessIntelligenceCatalogIssue }) {
  const router = useRouter()
  const [selectedMacro, setSelectedMacro] = useState<BusinessIntelligenceCatalogMacro | null>(null)
  const [pendingSegment, setPendingSegment] = useState<BusinessIntelligenceCatalogSegment | null>(null)
  const [isPending, startTransition] = useTransition()
  const confirm = () => {
    if (!pendingSegment) return
    startTransition(() => router.push(buildBusinessIntelligenceHref(pendingSegment.id, "home")))
  }

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
      {catalog.state === "ready" ? <ul className="divide-y divide-border border-y border-border">{catalog.macros.map((macro) => <li key={macro.id}><button type="button" onClick={() => setSelectedMacro(macro)} className="flex min-h-16 w-full items-center justify-between gap-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span><span className="block text-sm font-bold text-heading">{macro.name}</span><span className="mt-1 block text-[10px] text-muted">{macro.segments.length} segments · {macro.accountCount} comptes</span></span><span className="text-primary" aria-hidden="true">→</span></button></li>)}</ul> : null}
    </div>
    <AppDrawer open={selectedMacro !== null} onOpenChange={(open) => { if (!open) setSelectedMacro(null) }} side="bottom" title={selectedMacro?.name ?? "Segments"} description={selectedMacro ? `${selectedMacro.segments.length} segments métier` : undefined} showMobileCloseButton>
      <ul className="divide-y divide-border border-y border-border">{selectedMacro?.segments.map((segment) => {
        const availableCount = Object.values(segment.coverage).filter((item) => item.available).length
        return <li key={segment.id}><button type="button" onClick={() => { setSelectedMacro(null); setPendingSegment(segment) }} className="flex min-h-16 w-full items-center justify-between gap-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span><span className="block text-sm font-semibold text-heading">{segment.name}</span><span className="mt-1 block text-[10px] text-muted">{segment.status} · {segment.accountCount} comptes · {availableCount} ressources disponibles</span></span><span className="text-xs font-semibold text-primary">Choisir</span></button></li>
      })}</ul>
    </AppDrawer>
    <SegmentChangeConfirmDialog pendingSegment={pendingSegment} isPending={isPending} onCancel={() => setPendingSegment(null)} onConfirm={confirm} />
    {isPending ? <div className="absolute inset-0 z-40 flex items-center justify-center bg-canvas/75" role="status"><p className="border border-border bg-surface px-4 py-3 text-sm font-semibold text-heading">Chargement du workspace…</p></div> : null}
  </main>
}

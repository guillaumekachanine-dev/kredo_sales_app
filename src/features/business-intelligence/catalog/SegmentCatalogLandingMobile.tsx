"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { MobileOverviewShell } from "@/components/layout/MobileOverviewShell"
import { getNavigationIcon } from "@/components/layout/navigation-icons"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import type { BusinessIntelligenceCatalog, BusinessIntelligenceCatalogSegment } from "../data/business-intelligence-workspace-types"
import { buildBusinessIntelligenceHref } from "../navigation/business-intelligence-chapters"
import { SegmentChangeConfirmDialog } from "./SegmentChangeConfirmDialog"
import { CATALOG_ISSUE_MESSAGES, type BusinessIntelligenceCatalogIssue } from "./catalog-copy"
import { splitCatalogSegmentsByAvailability, type FlatCatalogSegment } from "./flatten-catalog-segments"

function LandingSegmentRow({
  entry,
  onSelect,
}: {
  entry: FlatCatalogSegment
  onSelect: (segment: BusinessIntelligenceCatalogSegment) => void
}) {
  const { segment, macroName } = entry

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(segment)}
        className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-heading">{segment.name}</span>
          <span className="block truncate text-[11px] text-muted">{macroName} · {segment.accountCount} comptes</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-primary">Choisir</span>
      </button>
    </li>
  )
}

function LandingSegmentGroup({
  id,
  title,
  entries,
  onSelect,
}: {
  id: string
  title: string
  entries: FlatCatalogSegment[]
  onSelect: (segment: BusinessIntelligenceCatalogSegment) => void
}) {
  if (entries.length === 0) return null

  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="text-[10px] font-bold uppercase tracking-wider text-muted">{title}</h3>
      <ul className="mt-2 divide-y divide-border border-y border-border">
        {entries.map((entry) => <LandingSegmentRow key={entry.segment.id} entry={entry} onSelect={onSelect} />)}
      </ul>
    </section>
  )
}

function LandingSegmentPicker({
  open,
  catalog,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  catalog: BusinessIntelligenceCatalog
  onOpenChange: (open: boolean) => void
  onSelect: (segment: BusinessIntelligenceCatalogSegment) => void
}) {
  const { available: studied, upcoming: other } = splitCatalogSegmentsByAvailability(catalog)

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title="Choisir un segment"
      description="Sélectionnez le périmètre à étudier."
      showMobileCloseButton
    >
      {catalog.state === "empty" ? <p className="py-8 text-center text-sm text-muted">Aucun segment disponible.</p> : null}
      {catalog.state === "ready" ? (
        <div className="space-y-6">
          <LandingSegmentGroup id="studied-segments" title="Segments étudiés" entries={studied} onSelect={onSelect} />
          <LandingSegmentGroup id="other-segments" title="Autres segments" entries={other} onSelect={onSelect} />
        </div>
      ) : null}
    </AppDrawer>
  )
}

export function SegmentCatalogLandingMobile({
  catalog,
  issue = null,
}: {
  catalog: BusinessIntelligenceCatalog
  issue?: BusinessIntelligenceCatalogIssue
}) {
  const router = useRouter()
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pendingSegment, setPendingSegment] = useState<BusinessIntelligenceCatalogSegment | null>(null)
  const [isPending, startTransition] = useTransition()
  const canChooseSegment = catalog.state === "ready" && catalog.macros.some((macro) => macro.segments.length > 0)

  const confirm = () => {
    if (!pendingSegment) return
    startTransition(() => router.push(buildBusinessIntelligenceHref(pendingSegment.id, "home")))
  }

  const selectSegment = (segment: BusinessIntelligenceCatalogSegment) => {
    setIsPickerOpen(false)
    setPendingSegment(segment)
  }

  return (
    <main className="relative min-h-dvh text-body" aria-busy={isPending || undefined}>
      <MobileOverviewShell
        tone="business-intelligence"
        heroLabel="Business Intelligence"
        surfaceLabel="Entrée Business Intelligence"
        icon={getNavigationIcon("bi", "size-11 text-heading", 1.8)}
        artwork={(
          <Image
            src="/illustrations/business-intelligence-mobile-line-art.png"
            alt=""
            width={1448}
            height={1086}
            sizes="316px"
            priority
          />
        )}
      >
        <div className="flex flex-col items-center text-center">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">Business Intelligence</h1>
          <Button className="mt-6" fullWidth size="lg" disabled={!canChooseSegment} onClick={() => setIsPickerOpen(true)}>
            Choisir un segment
          </Button>
          {issue ? <p role="alert" className="mt-4 text-xs text-body">{CATALOG_ISSUE_MESSAGES[issue]}</p> : null}
          {catalog.state === "error" ? <p role="alert" className="mt-4 text-xs text-body">{catalog.error}</p> : null}
          {catalog.state === "empty" ? <p className="mt-4 text-xs text-muted">Aucun segment n’est disponible.</p> : null}
        </div>
      </MobileOverviewShell>

      <LandingSegmentPicker
        open={isPickerOpen}
        catalog={catalog}
        onOpenChange={setIsPickerOpen}
        onSelect={selectSegment}
      />
      <SegmentChangeConfirmDialog pendingSegment={pendingSegment} isPending={isPending} onCancel={() => setPendingSegment(null)} onConfirm={confirm} />
      {isPending ? <div className="absolute inset-0 z-40 flex items-center justify-center bg-canvas/75" role="status"><p className="border border-border bg-surface px-4 py-3 text-sm font-semibold text-heading">Chargement du workspace…</p></div> : null}
    </main>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { loadBusinessIntelligenceCatalogAction } from "../actions/load-business-intelligence-catalog"
import type { BusinessIntelligenceCatalog, BusinessIntelligenceCatalogSegment } from "../data/business-intelligence-workspace-types"
import { coverageDetail } from "../coverage/coverage-model"

export function SegmentPickerDialogDesktop({ open, currentSegmentId, onOpenChange, onSelect }: {
  open: boolean
  currentSegmentId: string
  onOpenChange: (open: boolean) => void
  onSelect: (segment: BusinessIntelligenceCatalogSegment) => void
}) {
  const [catalog, setCatalog] = useState<BusinessIntelligenceCatalog | null>(null)
  const [expandedMacroId, setExpandedMacroId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const requestStartedRef = useRef(false)

  const requestCatalog = useCallback(async () => {
    if (requestStartedRef.current) return
    requestStartedRef.current = true
    setLoading(true)
    setError(null)
    const result = await loadBusinessIntelligenceCatalogAction()
    if (result.success) {
      setCatalog(result.data)
      setExpandedMacroId(result.data.macros[0]?.id ?? null)
    } else setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!open || catalog || requestStartedRef.current) return
    void Promise.resolve().then(requestCatalog)
  }, [catalog, open, requestCatalog])

  const retry = () => { requestStartedRef.current = false; void requestCatalog() }

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title="Changer de segment" description="Le segment actuel reste actif jusqu’à votre confirmation." className="sm:max-w-3xl" bodyClassName="pr-0">
      {loading ? <SegmentPickerSkeleton /> : null}
      {error ? <div role="alert" className="border border-danger/20 bg-danger/5 p-4 text-xs text-body"><p>{error}</p><Button className="mt-3" size="sm" variant="secondary" onClick={retry}>Réessayer</Button></div> : null}
      {catalog?.state === "empty" ? <p className="py-8 text-center text-sm text-muted">Aucun segment n’est disponible.</p> : null}
      {catalog?.state === "ready" ? <div className="divide-y divide-border border-y border-border">
        {catalog.macros.map((macro) => {
          const expanded = macro.id === expandedMacroId
          return <section key={macro.id}>
            <button type="button" aria-expanded={expanded} aria-controls={`picker-macro-${macro.id}`} onClick={() => setExpandedMacroId(expanded ? null : macro.id)} className="flex min-h-12 w-full items-center justify-between gap-4 px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <span><span className="block text-sm font-bold text-heading">{macro.name}</span><span className="text-[10px] text-muted">{macro.segments.length} segments · {macro.accountCount} comptes</span></span>
              <span aria-hidden="true">{expanded ? "−" : "+"}</span>
            </button>
            {expanded ? <ul id={`picker-macro-${macro.id}`} className="divide-y divide-border border-t border-border bg-canvas/60 px-3">
              {macro.segments.map((segment) => {
                const current = segment.id === currentSegmentId
                const available = Object.values(segment.coverage).filter((item) => item.available)
                return <li key={segment.id}><button type="button" disabled={current} onClick={() => onSelect(segment)} className="flex min-h-14 w-full items-center justify-between gap-5 px-2 py-3 text-left disabled:cursor-default disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <span className="min-w-0"><span className="block text-sm font-semibold text-body">{segment.name}</span><span className="mt-1 block text-[10px] text-muted">{segment.status} · {segment.accountCount} comptes · {available.length} ressources</span>{available[0] ? <span className="mt-1 block text-[10px] text-muted">{coverageDetail(available[0])}</span> : null}</span>
                  <span className="shrink-0 text-xs font-semibold text-primary">{current ? "Actif" : "Sélectionner"}</span>
                </button></li>
              })}
            </ul> : null}
          </section>
        })}
      </div> : null}
    </AppDialog>
  )
}

function SegmentPickerSkeleton() {
  return <div className="space-y-2 py-2" aria-label="Chargement des segments"><div className="h-12 animate-pulse bg-canvas" /><div className="h-12 animate-pulse bg-canvas" /><div className="h-12 animate-pulse bg-canvas" /></div>
}

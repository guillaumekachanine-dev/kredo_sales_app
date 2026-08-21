"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { loadBusinessIntelligenceCatalogAction } from "../actions/load-business-intelligence-catalog"
import type { BusinessIntelligenceCatalog, BusinessIntelligenceCatalogSegment } from "../data/business-intelligence-workspace-types"

export function SegmentPickerDrawerMobile({ open, currentSegmentId, onOpenChange, onSelect }: {
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
    if (result.success) setCatalog(result.data)
    else setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!open || catalog || requestStartedRef.current) return
    void Promise.resolve().then(requestCatalog)
  }, [catalog, open, requestCatalog])

  return <AppDrawer open={open} onOpenChange={onOpenChange} side="bottom" title="Changer de segment" description="Le contexte actuel reste actif jusqu’à confirmation." loading={loading} error={error ? { description: error, action: <Button size="sm" variant="secondary" onClick={() => { requestStartedRef.current = false; void requestCatalog() }}>Réessayer</Button> } : null} showMobileCloseButton>
    {catalog?.state === "empty" ? <p className="py-8 text-center text-sm text-muted">Aucun segment disponible.</p> : null}
    {catalog?.state === "ready" ? <div className="divide-y divide-border border-y border-border">
      {catalog.macros.map((macro) => {
        const expanded = expandedMacroId === macro.id
        return <section key={macro.id}>
          <button type="button" aria-expanded={expanded} onClick={() => setExpandedMacroId(expanded ? null : macro.id)} className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span><span className="block text-sm font-bold text-heading">{macro.name}</span><span className="block text-[10px] text-muted">{macro.segments.length} segments · {macro.accountCount} comptes</span></span><span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
          {expanded ? <ul className="divide-y divide-border border-t border-border pl-3">{macro.segments.map((segment) => {
            const current = segment.id === currentSegmentId
            const availableCount = Object.values(segment.coverage).filter((item) => item.available).length
            return <li key={segment.id}><button type="button" disabled={current} onClick={() => onSelect(segment)} className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span><span className="block text-sm font-semibold text-body">{segment.name}</span><span className="block text-[10px] text-muted">{segment.accountCount} comptes · {availableCount} ressources</span></span><span className="text-xs font-semibold text-primary">{current ? "Actif" : "Choisir"}</span></button></li>
          })}</ul> : null}
        </section>
      })}
    </div> : null}
  </AppDrawer>
}

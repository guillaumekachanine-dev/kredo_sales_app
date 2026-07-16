"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { formatDateNumeric, formatEuro, formatPct } from "@/lib/formatters"
import { FinancialModelingMobileFlow } from "@/features/financial-modeling"
import { CommercialQuoteMobileDrawer } from "./CommercialQuoteMobileDrawer"
import type { FinancialReference } from "@/features/financial-modeling/data/financial-reference-presenter"

export function FinancialReferenceMobileCard({ reference }: { reference: FinancialReference }) {
  const [open, setOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

  return (
    <>
      <SurfaceCard className="border-primary/25 bg-primary/[0.035] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-primary">Référence financière</span>
            <p className="mt-2 text-sm font-bold text-heading">{reference.resource}</p>
            <p className="text-[11px] text-body">{reference.profile ?? "Profil non renseigné"}</p>
          </div>
          <div className="flex gap-1"><Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>Ouvrir</Button><Button type="button" variant="primary" size="sm" onClick={() => setQuoteOpen(true)}>Devis</Button></div>
        </div>
        <p className="mt-3 text-[11px] text-muted">{formatDateNumeric(reference.startDate)} — {reference.endDate ? formatDateNumeric(reference.endDate) : "Sans fin"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/50 pt-3">
          <div><p className="text-[9px] font-bold uppercase tracking-wider text-muted">TJM</p><p className="mt-0.5 font-mono text-xs font-bold text-heading">{formatEuro(reference.saleDailyRate)}</p></div>
          <div><p className="text-[9px] font-bold uppercase tracking-wider text-muted">CA projeté</p><p className="mt-0.5 font-mono text-xs font-bold text-heading">{formatEuro(reference.projectedRevenue)}</p></div>
          <div><p className="text-[9px] font-bold uppercase tracking-wider text-muted">Marge</p><p className="mt-0.5 font-mono text-xs font-bold text-heading">{formatPct(reference.grossMarginPct)}</p></div>
        </div>
      </SurfaceCard>
      <FinancialModelingMobileFlow open={open} onOpenChange={setOpen} initialId={reference.modelId} />
      <CommercialQuoteMobileDrawer modelId={reference.modelId} open={quoteOpen} onOpenChange={setQuoteOpen} />
    </>
  )
}

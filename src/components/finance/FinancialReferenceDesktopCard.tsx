"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { formatDateNumeric, formatEuro, formatPct } from "@/lib/formatters"
import { FinancialModelingDesktopDialog } from "@/features/financial-modeling"
import type { FinancialReference } from "@/features/financial-modeling/data/financial-reference-presenter"

export function FinancialReferenceDesktopCard({ reference }: { reference: FinancialReference }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <SurfaceCard className="border-primary/25 bg-primary/[0.035] p-4">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <span className="inline-flex rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
              Référence financière
            </span>
            <p className="mt-2 text-sm font-bold text-heading">{reference.resource}</p>
            <p className="text-xs text-body">{reference.profile ?? "Profil non renseigné"}</p>
            <p className="mt-2 text-xs text-muted">
              {formatDateNumeric(reference.startDate)} — {reference.endDate ? formatDateNumeric(reference.endDate) : "Sans fin"} · {reference.productionDays.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j
            </p>
          </div>
          <dl className="grid shrink-0 grid-cols-3 gap-5 text-right">
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">TJM</dt><dd className="mt-1 font-mono text-sm font-bold text-heading">{formatEuro(reference.saleDailyRate)}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">CA projeté</dt><dd className="mt-1 font-mono text-sm font-bold text-heading">{formatEuro(reference.projectedRevenue)}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Marge</dt><dd className="mt-1 font-mono text-sm font-bold text-heading">{formatPct(reference.grossMarginPct)}</dd></div>
          </dl>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>Ouvrir</Button>
        </div>
      </SurfaceCard>
      <FinancialModelingDesktopDialog open={open} onOpenChange={setOpen} initialId={reference.modelId} />
    </>
  )
}

import React from "react"
import { formatPct } from "@/lib/formatters"
import type { FinancialModelResult } from "../../domain/financial-model.types"

interface FinancialModelingResultsProps {
  result: FinancialModelResult | null
  loading?: boolean
  salesDailyRate?: number
}

export function formatEuroWithCents(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function FinancialModelingResults({ result, loading, salesDailyRate }: FinancialModelingResultsProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-canvas rounded-[var(--radius-medium)]" />
          ))}
        </div>
        <div className="h-40 bg-canvas rounded-[var(--radius-medium)]" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-[var(--radius-large)] bg-canvas/30 text-center">
        <p className="text-sm text-muted">Données de simulation incomplètes</p>
        <p className="text-[11px] text-muted/80 mt-1">Renseignez les champs requis pour voir les résultats financiers.</p>
      </div>
    )
  }

  const mcoVal = result.mcoPercent ?? 0
  const isMcoNegative = mcoVal < 0
  const isMcoLow = mcoVal >= 0 && mcoVal < 15

  return (
    <div className="space-y-4">
      {/* KPIs Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-canvas border border-border/80 rounded-[var(--radius-medium)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Chiffre d&apos;Affaires</p>
          <p className="text-lg font-bold text-heading mt-1">{formatEuroWithCents(result.periodRevenue)}</p>
          <p className="text-[10px] text-muted mt-0.5">Sur la période</p>
        </div>

        <div className="bg-canvas border border-border/80 rounded-[var(--radius-medium)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Coûts Totaux</p>
          <p className="text-lg font-bold text-heading mt-1">{formatEuroWithCents(result.totalCosts)}</p>
          <p className="text-[10px] text-muted mt-0.5">Ressource + Frais</p>
        </div>

        <div className="bg-canvas border border-border/80 rounded-[var(--radius-medium)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Marge Commerciale</p>
          <p className={`text-lg font-bold mt-1 ${result.commercialMargin < 0 ? "text-danger" : "text-success"}`}>
            {formatEuroWithCents(result.commercialMargin)}
          </p>
          <p className="text-[10px] text-muted mt-0.5">
            {result.marginPerProducedDay !== null ? `${formatEuroWithCents(result.marginPerProducedDay)} / jr` : "—"}
          </p>
        </div>

        <div className={`border rounded-[var(--radius-medium)] p-3 ${
          isMcoNegative ? "bg-danger/[0.03] border-danger/25" :
          isMcoLow ? "bg-warning/[0.03] border-warning/25" :
          "bg-canvas border-border/80"
        }`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">MCO %</p>
          <p className={`text-lg font-bold mt-1 ${
            isMcoNegative ? "text-danger" :
            isMcoLow ? "text-warning" :
            "text-success"
          }`}>
            {formatPct(result.mcoPercent)}
          </p>
          <p className="text-[10px] text-muted mt-0.5">
            {isMcoNegative ? "Marge négative !" : isMcoLow ? "Seuil < 15%" : "Taux de marge"}
          </p>
        </div>
      </div>

      {/* Detail Table */}
      <div className="border border-border/80 rounded-[var(--radius-large)] bg-surface overflow-hidden">
        <div className="border-b border-border/80 bg-canvas/30 px-4 py-2 flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-heading">Détails financiers</h4>
          <span className="text-[10px] text-muted">Moteur : {result.engineVersion}</span>
        </div>
        <div className="divide-y divide-border/60 text-xs">
          <div className="grid grid-cols-2 px-4 py-2 hover:bg-canvas/10">
            <span className="text-muted">TJM de vente</span>
            <span className="font-semibold text-heading text-right">
              {formatEuroWithCents(
                salesDailyRate ?? (result.producedDays > 0 ? result.periodRevenue / result.producedDays : 0)
              )}
            </span>
          </div>
          
          <div className="grid grid-cols-2 px-4 py-2 hover:bg-canvas/10">
            <span className="text-muted">CJM productif (coût journalier réel)</span>
            <span className="font-semibold text-heading text-right">
              {result.productiveDailyCost !== null ? formatEuroWithCents(result.productiveDailyCost) : "—"}
            </span>
          </div>

          <div className="grid grid-cols-2 px-4 py-2 hover:bg-canvas/10">
            <span className="text-muted">CJM chargé (coût journalier structurel)</span>
            <span className="font-semibold text-heading text-right">
              {result.loadedDailyCost !== null ? formatEuroWithCents(result.loadedDailyCost) : "—"}
            </span>
          </div>

          <div className="grid grid-cols-2 px-4 py-2 hover:bg-canvas/10">
            <span className="text-muted">Jours ouvrés / produits</span>
            <span className="font-semibold text-heading text-right">
              {result.periodBusinessDays} j / {result.producedDays.toFixed(2)} j
            </span>
          </div>

          <div className="grid grid-cols-2 px-4 py-2 hover:bg-canvas/10">
            <span className="text-muted">Coût ressource sur la période</span>
            <span className="font-semibold text-heading text-right">{formatEuroWithCents(result.resourceCostPeriod)}</span>
          </div>

          <div className="grid grid-cols-2 px-4 py-2 hover:bg-canvas/10">
            <span className="text-muted">Total des frais ESN</span>
            <span className="font-semibold text-heading text-right">{formatEuroWithCents(result.totalExpenses)}</span>
          </div>

          <div className="grid grid-cols-2 px-4 py-2 hover:bg-canvas/10 bg-canvas/20">
            <span className="font-semibold text-heading">TCV (Total Contract Value)</span>
            <span className="font-bold text-heading text-right">{formatEuroWithCents(result.tcv)}</span>
          </div>

          <div className="grid grid-cols-2 px-4 py-2 hover:bg-canvas/10 bg-canvas/20">
            <span className="font-semibold text-heading">ACV (Annual Contract Value)</span>
            <span className="font-bold text-heading text-right">{formatEuroWithCents(result.acv)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

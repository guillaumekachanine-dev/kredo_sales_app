"use client"

import type { CollaboratorMonthlyProduction } from "../data/production-leave.types"
import { cn } from "@/lib/utils"

interface ProductionLeaveFinancialSummaryProps {
  monthData: CollaboratorMonthlyProduction | null | undefined
  monthLabel: string
  dataNotes?: string[]
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ProductionLeaveFinancialSummary({
  monthData,
  monthLabel,
  dataNotes,
}: ProductionLeaveFinancialSummaryProps) {
  if (!monthData) return null

  const {
    revenue,
    targetRevenue,
    revenueGap,
    structuralCost,
    margin,
    targetMargin,
    marginGap,
  } = monthData

  const hasRevenueData = revenue !== null
  const hasCostData = structuralCost !== null
  const hasMarginData = margin !== null

  // Si aucune donnée financière accessible
  if (!hasRevenueData && !hasCostData && !hasMarginData) {
    return (
      <div className="rounded-[var(--radius-medium)] border border-border/80 bg-surface/80 p-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            Données économiques · {monthLabel}
          </span>
          <span className="text-[11px] italic">
            Données financières confidentielles ou non configurées
          </span>
        </div>
        {dataNotes && dataNotes.length > 0 ? (
          <p className="mt-1 text-[11px] text-muted">
            {dataNotes[0]}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Impact économique observable · {monthLabel}
          </h3>
          <p className="text-[11px] text-body mt-0.5">
            Valorisation sur les bases tarifaires et coûts réels
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Chiffre d'affaires */}
        {hasRevenueData ? (
          <div className="rounded-[var(--radius-small)] border border-border/80 bg-canvas/40 p-3">
            <div className="text-[11px] font-medium text-muted">Chiffre d&apos;affaires produit</div>
            <div className="mt-1 text-xl font-bold tracking-tight text-heading font-mono">
              {formatCurrency(revenue)}
            </div>
            {targetRevenue !== null ? (
              <div className="mt-1 flex items-center justify-between text-[11px] text-body">
                <span>Cible : {formatCurrency(targetRevenue)}</span>
                {revenueGap !== null ? (
                  <span
                    className={cn(
                      "font-semibold font-mono",
                      revenueGap >= 0 ? "text-success" : "text-amber-700",
                    )}
                  >
                    {revenueGap > 0 ? `+${formatCurrency(revenueGap)}` : formatCurrency(revenueGap)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Coût structurel employeur */}
        {hasCostData ? (
          <div className="rounded-[var(--radius-small)] border border-border/80 bg-canvas/40 p-3">
            <div className="text-[11px] font-medium text-muted">Coût structurel de la période</div>
            <div className="mt-1 text-xl font-bold tracking-tight text-heading font-mono">
              {formatCurrency(structuralCost)}
            </div>
            <div className="mt-1 text-[11px] text-muted">
              Coût employeur brut hors marge TACI
            </div>
          </div>
        ) : null}

        {/* Marge brute */}
        {hasMarginData ? (
          <div className="rounded-[var(--radius-small)] border border-border/80 bg-canvas/40 p-3">
            <div className="text-[11px] font-medium text-muted">Marge opérationnelle</div>
            <div
              className={cn(
                "mt-1 text-xl font-bold tracking-tight font-mono",
                margin >= 0 ? "text-heading" : "text-amber-700",
              )}
            >
              {formatCurrency(margin)}
            </div>
            {targetMargin !== null ? (
              <div className="mt-1 flex items-center justify-between text-[11px] text-body">
                <span>Cible : {formatCurrency(targetMargin)}</span>
                {marginGap !== null ? (
                  <span
                    className={cn(
                      "font-semibold font-mono",
                      marginGap >= 0 ? "text-success" : "text-amber-700",
                    )}
                  >
                    {marginGap > 0 ? `+${formatCurrency(marginGap)}` : formatCurrency(marginGap)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

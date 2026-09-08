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
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-white/50">
        <div className="flex items-center justify-between">
          <span className="font-semibold uppercase tracking-[0.1em] text-[10px] text-white/45">
            Données économiques · {monthLabel}
          </span>
          <span className="text-[11px] italic text-white/40">
            Données financières confidentielles ou non configurées
          </span>
        </div>
        {dataNotes && dataNotes.length > 0 ? (
          <p className="mt-1 text-[11px] text-white/40">
            {dataNotes[0]}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
            Impact économique observable · {monthLabel}
          </h3>
          <p className="text-[11px] text-white/45 mt-0.5">
            Valorisation sur les bases tarifaires et coûts réels
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Chiffre d'affaires */}
        {hasRevenueData ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Chiffre d&apos;affaires produit</div>
            <div className="mt-1 text-xl font-bold tracking-tight text-white font-mono tabular-nums">
              {formatCurrency(revenue)}
            </div>
            {targetRevenue !== null ? (
              <div className="mt-1 flex items-center justify-between text-[11px] text-white/45">
                <span>Cible : {formatCurrency(targetRevenue)}</span>
                {revenueGap !== null ? (
                  <span
                    className={cn(
                      "font-semibold font-mono tabular-nums",
                      revenueGap >= 0 ? "text-brand-brass" : "text-amber-400",
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
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Coût structurel de la période</div>
            <div className="mt-1 text-xl font-bold tracking-tight text-white font-mono tabular-nums">
              {formatCurrency(structuralCost)}
            </div>
            <div className="mt-1 text-[11px] text-white/45">
              Coût employeur brut hors marge TACI
            </div>
          </div>
        ) : null}

        {/* Marge brute */}
        {hasMarginData ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Marge opérationnelle</div>
            <div
              className={cn(
                "mt-1 text-xl font-bold tracking-tight font-mono tabular-nums",
                margin >= 0 ? "text-white" : "text-amber-400",
              )}
            >
              {formatCurrency(margin)}
            </div>
            {targetMargin !== null ? (
              <div className="mt-1 flex items-center justify-between text-[11px] text-white/45">
                <span>Cible : {formatCurrency(targetMargin)}</span>
                {marginGap !== null ? (
                  <span
                    className={cn(
                      "font-semibold font-mono tabular-nums",
                      marginGap >= 0 ? "text-brand-brass" : "text-amber-400",
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

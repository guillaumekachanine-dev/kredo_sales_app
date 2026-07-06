"use client"

import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface FinanceExecutiveHeroProps {
  executive: {
    revenueYtd: number
    grossMarginYtd: number
    grossMarginPctYtd: number
    operatingProfitYtd: number
    weightedPipe: number
    projectedLanding: number
    message: string
    messageTone: "positive" | "warning" | "danger"
  }
  annualTarget?: number
}

export function FinanceExecutiveHero({ executive, annualTarget = 2_400_000 }: FinanceExecutiveHeroProps) {
  const {
    revenueYtd,
    grossMarginYtd,
    grossMarginPctYtd,
    operatingProfitYtd,
    weightedPipe,
    projectedLanding,
    message,
    messageTone,
  } = executive

  const pctProgress = Math.min(100, (projectedLanding / annualTarget) * 100)

  const toneBgClass =
    messageTone === "danger"
      ? "bg-danger/10 text-danger border-danger/30"
      : messageTone === "warning"
        ? "bg-warning/10 text-warning border-warning/30"
        : "bg-success/10 text-success border-success/30"

  return (
    <SurfaceCard padding="default" className="border-l-4 border-l-primary relative overflow-hidden mb-6">
      {/* Background radial accent */}
      <div className="absolute right-0 top-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Cockpit de rentabilité & atterrissage
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1">
            <h2 className="text-3xl font-heading font-extrabold text-heading tracking-tight">
              {formatEuroCompact(projectedLanding)}
            </h2>
            <span className="text-sm font-medium text-body">
              projetés vs {formatEuroCompact(annualTarget)} cible
            </span>
          </div>

          {/* Visual progress bar */}
          <div className="mt-4 w-full max-w-xl">
            <div className="flex justify-between text-[11px] text-muted mb-1 font-semibold">
              <span>PROGRÈS VERS OBJECTIF ANNUEL</span>
              <span>{pctProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${pctProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Message exécutif */}
        <div className={cn("px-4 py-3 rounded-lg border text-sm font-medium leading-relaxed max-w-sm shrink-0", toneBgClass)}>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("size-2 rounded-full", 
              messageTone === "danger" ? "bg-danger" : messageTone === "warning" ? "bg-warning" : "bg-success"
            )} />
            <span className="font-bold uppercase tracking-wider text-[10px]">Statut cockpit</span>
          </div>
          {message}
        </div>
      </div>

      {/* KPI grid inside Hero */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/60">
        <div>
          <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Réalisé YTD (CA)</p>
          <p className="text-xl font-bold text-heading mt-1">{formatEuroCompact(revenueYtd)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Marge brute YTD</p>
          <p className="text-xl font-bold text-success mt-1">
            {formatPct(grossMarginPctYtd)}{" "}
            <span className="text-xs text-muted font-normal">({formatEuroCompact(grossMarginYtd)})</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Résultat op. YTD</p>
          <p className={cn("text-xl font-bold mt-1", operatingProfitYtd >= 0 ? "text-heading" : "text-danger")}>
            {formatEuroCompact(operatingProfitYtd)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Pipe pondéré CRM</p>
          <p className="text-xl font-bold text-brand-brass mt-1">{formatEuroCompact(weightedPipe)}</p>
        </div>
      </div>
    </SurfaceCard>
  )
}

"use client"

import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import type { PracticeMetric } from "@/lib/finance/finance-data"
import { cn } from "@/lib/utils"

interface PracticeContributionGridProps {
  metrics: PracticeMetric[]
}

export function PracticeContributionGrid({ metrics }: PracticeContributionGridProps) {
  const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => {
        const sharePct = totalRevenue > 0 ? (metric.revenue / totalRevenue) * 100 : 0
        const marginTone =
          metric.grossMarginPct >= 30 ? "positive"
          : metric.grossMarginPct >= 15 ? "neutral"
          : "negative"

        return (
          <SurfaceCard key={metric.practice} padding="none" className="border border-border">
            <div className="border-b border-border/60 px-4 py-3 bg-surface-raised/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Practice</p>
              <h3 className="text-sm font-bold text-heading mt-0.5">{metric.practice}</h3>
            </div>
            
            <div className="p-4 flex flex-col gap-3">
              {/* CA et part de marché */}
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-body font-medium">CA YTD</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-heading">{formatEuroCompact(metric.revenue)}</span>
                  <span className="text-[10px] text-muted ml-1.5">({sharePct.toFixed(0)}%)</span>
                </div>
              </div>

              {/* Marge brute */}
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-body font-medium">Marge brute</span>
                <div className="text-right">
                  <span className={cn(
                    "text-sm font-bold",
                    marginTone === "positive" ? "text-success" : marginTone === "negative" ? "text-danger" : "text-heading"
                  )}>
                    {formatPct(metric.grossMarginPct)}
                  </span>
                  <span className="text-[10px] text-muted ml-1.5">({formatEuroCompact(metric.grossMargin)})</span>
                </div>
              </div>

              {/* Indicateurs */}
              <div className="grid grid-cols-2 border-t border-border/50 pt-3 mt-1 gap-2 text-[11px]">
                <div>
                  <span className="text-muted block uppercase tracking-wider text-[9px] font-semibold font-sans">Jours facturés</span>
                  <span className="text-heading font-bold">{metric.billableDays.toFixed(0)} j</span>
                </div>
                <div>
                  <span className="text-muted block uppercase tracking-wider text-[9px] font-semibold font-sans">Consultants</span>
                  <span className="text-heading font-bold">{metric.consultantCount} {metric.consultantCount > 1 ? "actifs" : "actif"}</span>
                </div>
              </div>
            </div>
          </SurfaceCard>
        )
      })}
    </div>
  )
}

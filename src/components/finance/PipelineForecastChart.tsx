"use client"

import React from "react"
import { formatEuroCompact } from "@/lib/formatters"
import type { PipelineStageMetric } from "@/lib/finance/finance-data"

interface PipelineForecastChartProps {
  stages: PipelineStageMetric[]
}

export function PipelineForecastChart({ stages }: PipelineForecastChartProps) {
  const maxWeighted = Math.max(...stages.map((s) => s.weightedTotal), 1)

  return (
    <div className="flex flex-col gap-4 py-2">
      {stages.map((stage) => {
        const pct = Math.max(12, (stage.weightedTotal / maxWeighted) * 100)
        return (
          <div key={stage.stage} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            {/* Libellé de l'étape */}
            <div className="w-full md:w-36 text-xs font-semibold text-heading truncate">
              {stage.stageLabel}
            </div>

            {/* Barre de l'entonnoir */}
            <div className="flex-1 min-w-0">
              <div className="h-9 w-full bg-border/20 rounded-lg overflow-hidden border border-border/50 relative flex items-center px-3">
                {/* Remplissage de la jauge */}
                <div
                  className="absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-500 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: stage.color,
                  }}
                />
                
                {/* Ligne d'accent gauche */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-500 ease-out" 
                  style={{ backgroundColor: stage.color }}
                />

                {/* Informations textuelles */}
                <div className="relative z-10 w-full flex items-center justify-between text-xs">
                  <span className="text-heading font-semibold">
                    {stage.count} {stage.count > 1 ? "opportunités" : "opportunité"}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted font-normal">
                      Est. : {formatEuroCompact(stage.estimatedTotal)}
                    </span>
                    <span className="text-heading font-bold">
                      Pond. : {formatEuroCompact(stage.weightedTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

"use client"

import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { Button } from "@/components/ui/Button"
import { formatEuroCompact } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface FinanceScenarioCardsProps {
  revenueYtd: number
  weightedPipe: number
  annualTarget?: number
  onSimulate: () => void
}

export function FinanceScenarioCards({
  revenueYtd,
  weightedPipe,
  annualTarget = 2_400_000,
  onSimulate,
}: FinanceScenarioCardsProps) {
  // Calculs des scénarios
  const prudent = revenueYtd + weightedPipe * 0.6
  const central = revenueYtd + weightedPipe
  const ambitious = revenueYtd + weightedPipe * 1.4

  const scenarios = [
    {
      id: "prudent",
      title: "Scénario Prudent",
      value: prudent,
      pipePct: "60%",
      description: "Intègre le réalisé YTD et 60% du pipe commercial pondéré. Idéal pour des prévisions conservatrices.",
      highlight: false,
      tone: "neutral",
    },
    {
      id: "central",
      title: "Scénario Central",
      value: central,
      pipePct: "100%",
      description: "Atterrissage projeté standard (réalisé YTD + 100% du pipe pondéré). Notre point d'ancrage le plus probable.",
      highlight: true,
      tone: "primary",
    },
    {
      id: "ambitious",
      title: "Scénario Ambitieux",
      value: ambitious,
      pipePct: "140%",
      description: "Scénario de croissance forte avec surperformance et conversion rapide (140% du pipe pondéré).",
      highlight: false,
      tone: "brass",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((sc) => {
          const isGapPositive = sc.value >= annualTarget
          const gap = sc.value - annualTarget

          return (
            <SurfaceCard
              key={sc.id}
              padding="default"
              className={cn(
                "relative flex flex-col justify-between transition-all duration-300 border",
                sc.highlight
                  ? "border-primary shadow-md ring-1 ring-primary/20 scale-[1.02] md:-translate-y-1"
                  : "border-border hover:border-border-strong"
              )}
            >
              {sc.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-fg text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Central
                </span>
              )}

              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">{sc.title}</p>
                <p className="text-2xl font-heading font-extrabold text-heading tracking-tight mt-2">
                  {formatEuroCompact(sc.value)}
                </p>
                <p className="text-[10px] text-muted font-medium mt-1">
                  (Réalisé + {sc.pipePct} du pipe)
                </p>
                
                <p className="text-xs text-body mt-3 leading-relaxed">
                  {sc.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-border/50 text-[11px] font-semibold flex items-center justify-between">
                <span className="text-muted">ÉCART CIBLE :</span>
                <span className={cn(isGapPositive ? "text-success" : "text-danger")}>
                  {isGapPositive ? "+" : ""}
                  {formatEuroCompact(gap)}
                </span>
              </div>
            </SurfaceCard>
          )
        })}
      </div>

      {/* Bloc d'action pour la simulation */}
      <SurfaceCard
        padding="default"
        className="bg-primary/5 border border-primary/20 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2"
      >
        <div>
          <h4 className="text-sm font-bold text-heading">Ajuster les hypothèses de croissance ?</h4>
          <p className="text-xs text-body mt-1">
            Simulez de nouvelles opportunités commerciales ou des modifications de TJM/CJM pour modéliser le P&L futur.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={onSimulate}
          className="shrink-0 flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 19h14M7 16V9M12 16V5M17 16v-7" />
          </svg>
          <span>Lancer une simulation</span>
        </Button>
      </SurfaceCard>
    </div>
  )
}

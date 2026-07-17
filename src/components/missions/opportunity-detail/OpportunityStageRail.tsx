"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  getOpportunityPipelineIndex,
  getOpportunityStageColor,
  getOpportunityStageIcon,
  OPPORTUNITY_ACTIVE_STAGES,
  OPPORTUNITY_TERMINAL_STAGES,
} from "@/lib/opportunities/stages"
import type { SalesStage } from "@/types/database-domain"

interface OpportunityStageRailProps {
  stage: SalesStage
  onChange: (stage: SalesStage) => void
}

function StageIcon({ stage }: { stage: SalesStage }) {
  const icon = getOpportunityStageIcon(stage)

  if (!icon) {
    return <span className="text-sm font-bold" aria-hidden="true">•</span>
  }

  return <Image src={icon} alt="" width={26} height={26} className="size-[26px] object-contain" />
}

export function OpportunityStageRail({ stage, onChange }: OpportunityStageRailProps) {
  const currentIndex = getOpportunityPipelineIndex(stage)
  const selectedTerminal = OPPORTUNITY_TERMINAL_STAGES.find((item) => item.value === stage)

  return (
    <section aria-labelledby="stage-editor-title" className="overflow-hidden rounded-[var(--radius-large)] border border-primary/15 bg-[linear-gradient(110deg,var(--color-primary)_-90%,var(--color-surface)_34%,var(--color-surface)_100%)] px-4 py-5 shadow-[0_18px_38px_-32px_rgba(19,75,200,0.65)] sm:px-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-primary">Progression commerciale</p>
          <h2 id="stage-editor-title" className="mt-1 font-heading text-base font-bold tracking-tight text-heading">À quelle étape en est cette opportunité&nbsp;?</h2>
        </div>
        <p className="max-w-xs text-xs leading-5 text-body">Choisissez une étape pour actualiser instantanément le pipeline et son historique.</p>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="relative flex min-w-[620px] items-start">
          <div className="absolute left-[9%] right-[9%] top-5 h-1 rounded-full bg-border/70" aria-hidden="true" />
          <div
            className="absolute left-[9%] top-5 h-1 rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(0, Math.min(82, currentIndex * 20.5))}%` }}
            aria-hidden="true"
          />
          {OPPORTUNITY_ACTIVE_STAGES.map((item, index) => {
            const isSelected = stage === item.value
            const isComplete = !selectedTerminal && index < currentIndex
            const isReached = isSelected || isComplete
            const color = getOpportunityStageColor(item.value)

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange(item.value)}
                className="group relative z-10 flex min-w-0 flex-1 flex-col items-center text-center outline-none focus-visible:rounded-[var(--radius-medium)] focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-pressed={isSelected}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border bg-surface transition-all duration-300 ease-out",
                    isSelected && "scale-110 shadow-[0_0_0_5px_rgba(31,94,215,0.12),0_9px_16px_-11px_rgba(19,75,200,0.8)]",
                    isReached ? "border-primary" : "border-border group-hover:-translate-y-0.5 group-hover:border-primary/50",
                  )}
                  style={isSelected ? { borderColor: color, color } : undefined}
                >
                  <StageIcon stage={item.value} />
                </span>
                <span className={cn("mt-3 text-[11px] font-semibold leading-4 transition-colors", isReached ? "text-heading" : "text-muted group-hover:text-body")}>{item.label}</span>
                <span className={cn("mt-0.5 text-[10px] font-medium transition-opacity", isSelected ? "text-primary opacity-100" : "text-muted opacity-0 group-hover:opacity-100")}>{isSelected ? "Étape active" : "Choisir"}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
        <span className="mr-1 text-[11px] font-semibold text-muted">Clore l&apos;opportunité</span>
        {OPPORTUNITY_TERMINAL_STAGES.map((item) => {
          const isSelected = stage === item.value
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-200",
                isSelected ? "border-primary bg-primary text-primary-fg shadow-sm" : "border-border bg-surface text-body hover:-translate-y-px hover:border-primary/35 hover:text-heading",
              )}
              aria-pressed={isSelected}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

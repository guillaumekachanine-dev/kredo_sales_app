"use client"

import React from "react"
import { cn } from "@/lib/utils"
import type { StageItem } from "./stage-timeline-config"

interface StageTimelineProps {
  nominalStages: StageItem[]
  terminalStages: StageItem[]
  currentStage: string
  selectedStage: string
  onSelectStage: (stage: string) => void
  color: string // var(--color-case-need) or var(--color-case-candidate)
  disabled?: boolean
}

export function StageTimeline({
  nominalStages,
  terminalStages,
  currentStage,
  selectedStage,
  onSelectStage,
  color,
  disabled = false,
}: StageTimelineProps) {
  const currentIndex = nominalStages.findIndex((s) => s.value === currentStage)
  const isCurrentTerminal = terminalStages.some((s) => s.value === currentStage)

  // Calcule le pourcentage de progression nominale
  const progressPercent =
    isCurrentTerminal
      ? 0
      : currentIndex >= 0
      ? (currentIndex / (nominalStages.length - 1)) * 100
      : 0

  // Attenuated color for past steps (e.g. 50% opacity)
  const attenuatedColor = `color-mix(in srgb, ${color} 45%, transparent)`

  return (
    <div className="w-full flex flex-col gap-6">
      {/* 1. TIMELINE PRINCIPALE (NOMINALE) */}
      <div className="relative w-full">
        {/* DESKTOP VIEW: HORIZONTAL */}
        <div className="hidden md:block w-full overflow-x-auto py-4 px-2 no-scrollbar">
          <div className="relative flex justify-between min-w-[500px] w-full">
            {/* Ligne de connexion grise */}
            <div className="absolute top-[11px] left-0 right-0 h-[2px] bg-neutral-200 dark:bg-neutral-800 -z-10" />

            {/* Ligne de progression active */}
            {!isCurrentTerminal && currentIndex > 0 && (
              <div
                className="absolute top-[11px] left-0 h-[2px] -z-10 transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: color,
                }}
              />
            )}

            {nominalStages.map((stage, idx) => {
              const isCurrent = stage.value === currentStage
              const isPast = !isCurrentTerminal && currentIndex !== -1 && idx < currentIndex
              const isFuture = !isCurrent && !isPast
              const isSelected = stage.value === selectedStage

              return (
                <button
                  key={stage.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectStage(stage.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 group outline-none focus:outline-none relative",
                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  )}
                  style={{ width: `${100 / nominalStages.length}%` }}
                >
                  {/* Jalon Cercle */}
                  <div
                    className={cn(
                      "rounded-full flex items-center justify-center transition-all duration-200",
                      isCurrent ? "h-[24px] w-[24px] -mt-1" : "h-[16px] w-[16px] mt-[3px]",
                      isSelected && "ring-4 ring-offset-2 dark:ring-offset-neutral-900"
                    )}
                    style={{
                      backgroundColor: isCurrent ? color : isPast ? attenuatedColor : "transparent",
                      border: isCurrent ? "none" : isPast ? "none" : "2px solid var(--color-border, #CBD5E1)",
                      boxShadow: isCurrent ? `0 0 10px ${color}50` : "none",
                      borderColor: isSelected ? color : undefined,
                      ["--tw-ring-color" as any]: color,
                    }}
                  >
                    {isPast && (
                      <svg className="size-2.5 text-white shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                    {isCurrent && (
                      <div className="size-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Libellé de l'étape */}
                  <div className="flex flex-col items-center text-center">
                    <span
                      className={cn(
                        "text-[11px] transition-colors duration-150 text-wrap leading-tight mt-1 max-w-[85px]",
                        isCurrent ? "font-bold text-heading" : isPast ? "font-medium text-body" : "text-muted",
                        isSelected && "text-primary font-semibold"
                      )}
                    >
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full mt-1 font-semibold uppercase tracking-wider scale-[0.9]"
                        style={{
                          backgroundColor: `${color}15`,
                          color: color,
                        }}
                      >
                        Actuelle
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* MOBILE VIEW: VERTICAL */}
        <div className="block md:hidden w-full pl-3">
          <div className="relative flex flex-col gap-4">
            {/* Ligne verticale grise */}
            <div className="absolute top-[8px] bottom-[8px] left-[11px] w-[2px] bg-neutral-200 dark:bg-neutral-800 -z-10" />

            {nominalStages.map((stage, idx) => {
              const isCurrent = stage.value === currentStage
              const isPast = !isCurrentTerminal && currentIndex !== -1 && idx < currentIndex
              const isSelected = stage.value === selectedStage

              return (
                <button
                  key={stage.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectStage(stage.value)}
                  className={cn(
                    "flex items-center gap-4 w-full text-left py-2 group outline-none focus:outline-none min-h-[44px]",
                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  )}
                >
                  {/* Jalon Cercle */}
                  <div
                    className={cn(
                      "rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
                      isCurrent ? "h-[24px] w-[24px]" : "h-[16px] w-[16px] ml-1",
                      isSelected && "ring-4 ring-offset-2 dark:ring-offset-neutral-900"
                    )}
                    style={{
                      backgroundColor: isCurrent ? color : isPast ? attenuatedColor : "transparent",
                      border: isCurrent ? "none" : isPast ? "none" : "2px solid var(--color-border, #CBD5E1)",
                      boxShadow: isCurrent ? `0 0 10px ${color}50` : "none",
                      borderColor: isSelected ? color : undefined,
                      ["--tw-ring-color" as any]: color,
                    }}
                  >
                    {isPast && (
                      <svg className="size-2.5 text-white shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                    {isCurrent && (
                      <div className="size-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Libellé */}
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-xs transition-colors duration-150",
                        isCurrent ? "font-bold text-heading text-[13px]" : isPast ? "font-medium text-body" : "text-muted",
                        isSelected && "text-primary font-semibold"
                      )}
                    >
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-semibold text-muted uppercase mt-0.5">
                        Étape actuelle
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 2. ZONE DE CLÔTURE (TERMINALES / NÉGATIVES) */}
      <div className="border-t border-border/60 pt-4 mt-2">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5">
          Clôturer autrement
        </span>
        <div className="flex flex-wrap gap-2">
          {terminalStages.map((stage) => {
            const isCurrent = stage.value === currentStage
            const isSelected = stage.value === selectedStage

            return (
              <button
                key={stage.value}
                type="button"
                disabled={disabled}
                onClick={() => onSelectStage(stage.value)}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-[var(--radius-small)] border px-3 text-xs font-semibold select-none transition-all active:scale-[0.98]",
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  isSelected
                    ? "bg-danger text-danger-fg border-danger shadow-sm"
                    : isCurrent
                    ? "bg-neutral-100 dark:bg-neutral-800 text-heading border-border"
                    : "bg-surface hover:bg-neutral-50 dark:hover:bg-neutral-900 text-body border-border"
                )}
                style={
                  isSelected
                    ? { backgroundColor: stage.color, borderColor: stage.color, color: "#fff" }
                    : isCurrent
                    ? { borderColor: stage.color, borderWidth: "2px" }
                    : undefined
                }
              >
                {stage.label}
                {isCurrent && (
                  <span className="ml-1.5 size-1.5 rounded-full bg-current shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import React from "react"
import { AgendaDayVm } from "./cockpit-mobile-view-model"
import { cn } from "@/lib/utils"

interface CockpitAgendaStripProps {
  days: AgendaDayVm[]
  selectedDayKey: string
  onDaySelect: (dayKey: string) => void
  isExpanded?: boolean
}

export function CockpitAgendaStrip({
  days,
  selectedDayKey,
  onDaySelect,
  isExpanded,
}: CockpitAgendaStripProps) {
  return (
    <div className="grid grid-cols-5 gap-2 px-4 py-3 bg-canvas/30 border-y border-border/40" role="tablist" aria-label="Agenda de la semaine">
      {days.map((day) => {
        const isSelected = day.key === selectedDayKey
        return (
          <button
            key={day.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={`agenda-panel-${day.key}`}
            id={`agenda-tab-${day.key}`}
            className={cn(
              "flex flex-col items-center justify-between py-2.5 px-1 rounded-xl transition-all duration-300 cursor-pointer border select-none min-h-[70px] focus:outline-none relative",
              isSelected
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                : "bg-surface border-border/50 text-body hover:bg-surface-hover hover:border-border"
            )}
            onClick={() => onDaySelect(day.key)}
          >
            {/* Day Label (e.g., LUN) */}
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-wider",
              isSelected ? "text-white/80" : "text-muted"
            )}>
              {day.label}
            </span>

            {/* Date Number (e.g., 23) */}
            <span className={cn(
              "text-lg font-black leading-none my-1 font-heading",
              isSelected ? "text-white" : "text-heading"
            )}>
              {day.dateNumber}
            </span>

            {/* Count Indicator */}
            {day.count > 0 ? (
              <span className={cn(
                "inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-extrabold leading-none",
                isSelected
                  ? "bg-white text-primary"
                  : "bg-primary/10 text-primary border border-primary/20"
              )}>
                {day.count}
              </span>
            ) : (
              <span className="w-[15px] h-[15px]" />
            )}

            {/* Visual connector caret pointing downwards when expanded */}
            {isSelected && isExpanded && (
              <span className="absolute -bottom-[16px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-primary z-20 animate-fade-in" />
            )}
          </button>
        )
      })}
    </div>
  )
}

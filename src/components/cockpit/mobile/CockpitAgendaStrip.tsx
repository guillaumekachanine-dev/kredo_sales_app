import React from "react"
import { AgendaDayVm } from "./cockpit-mobile-view-model"

interface CockpitAgendaStripProps {
  days: AgendaDayVm[]
  selectedDayKey: string
  onDaySelect: (dayKey: string) => void
}

export function CockpitAgendaStrip({
  days,
  selectedDayKey,
  onDaySelect,
}: CockpitAgendaStripProps) {
  return (
    <div className="agenda-strip" role="tablist" aria-label="Agenda de la semaine">
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
            className={`agenda-day ${isSelected ? "is-selected" : ""}`}
            onClick={() => onDaySelect(day.key)}
          >
            <span className="agenda-day-label">{day.label}</span>
            <span className="agenda-day-date">{day.dateNumber}</span>
            <span className="agenda-day-count">{day.count}</span>
          </button>
        )
      })}
    </div>
  )
}

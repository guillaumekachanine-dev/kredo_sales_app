import React from "react"
import { AgendaDayVm } from "./cockpit-mobile-view-model"
import { IconChevron, IconCalendar } from "./icons"

interface CockpitAgendaDetailsProps {
  day: AgendaDayVm
  isOpen: boolean
  onItemClick: (route: string, title: string) => void
}

const FULL_DAY_NAMES: Record<string, string> = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
}

export function CockpitAgendaDetails({
  day,
  isOpen,
  onItemClick,
}: CockpitAgendaDetailsProps) {
  const fullDayName = FULL_DAY_NAMES[day.key] || day.label

  return (
    <div
      id={`agenda-panel-${day.key}`}
      role="tabpanel"
      aria-labelledby={`agenda-tab-${day.key}`}
      className="agenda-details"
      data-open={isOpen ? "true" : "false"}
      aria-hidden={!isOpen}
    >
      <div className="agenda-details-inner py-1">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center gap-2 px-1 pb-1.5 border-b border-indigo-500/10">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white shrink-0">
              <IconCalendar />
            </span>
            <h3 className="text-xs font-bold text-heading flex-1">
              {`${fullDayName} ${day.dateNumber}`}
            </h3>
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
              {day.count} {day.count === 1 ? "action" : "actions"}
            </span>
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            {day.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border/50 hover:bg-surface-hover hover:border-indigo-500/20 active:bg-canvas transition-all text-left group"
                onClick={() => onItemClick(item.route, item.title)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex flex-col items-center justify-center bg-indigo-500/5 text-indigo-600 rounded-lg p-1.5 min-w-[50px] shrink-0 transition-colors group-hover:bg-indigo-500 group-hover:text-white">
                    <span className="text-xs font-bold">{item.moment}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-80">{item.type}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <strong className="block text-xs font-bold text-heading truncate">{item.title}</strong>
                    <p className="text-[10px] text-body truncate mt-0.5">{item.context}</p>
                  </div>
                </div>

                <IconChevron />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import React from "react"
import { AgendaDayVm } from "./cockpit-mobile-view-model"
import { IconChevron } from "./icons"

interface CockpitAgendaDetailsProps {
  day: AgendaDayVm
  isOpen: boolean
  onItemClick: (route: string, title: string) => void
}

export function CockpitAgendaDetails({
  day,
  isOpen,
  onItemClick,
}: CockpitAgendaDetailsProps) {

  return (
    <div
      id={`agenda-panel-${day.key}`}
      role="tabpanel"
      aria-labelledby={`agenda-tab-${day.key}`}
      className="agenda-details"
      data-open={isOpen ? "true" : "false"}
      aria-hidden={!isOpen}
    >
      <div className="agenda-details-inner pt-1 pb-2">
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
  )
}

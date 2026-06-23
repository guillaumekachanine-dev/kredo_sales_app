import React from "react"
import { AgendaDayVm } from "./cockpit-mobile-view-model"
import { IconChevron } from "./icons"

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
      <div className="agenda-details-inner">
        <div className="agenda-day-summary">
          <div>
            <strong>{`${fullDayName} ${day.dateNumber}`}</strong>
            <span>{day.count} action{day.count === 1 ? "" : "s"} à traiter</span>
          </div>
        </div>

        <div className="agenda-list">
          {day.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="agenda-item"
              onClick={() => onItemClick(item.route, item.title)}
            >
              <div className="agenda-item-side">
                <span>{item.moment}</span>
                <small>{item.type}</small>
              </div>
              
              <div className="agenda-item-main">
                <strong>{item.title}</strong>
                <p>{item.context}</p>
              </div>

              <span className="agenda-item-chevron" aria-hidden="true">
                <IconChevron />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

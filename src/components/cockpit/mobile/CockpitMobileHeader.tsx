import React from "react"
import { IconCalendar } from "./icons"

interface CockpitMobileHeaderProps {
  onQuickActionsOpen: () => void
  onAgendaOpen: (origin: HTMLButtonElement) => void
  onUrgenciesOpen: (origin: HTMLButtonElement) => void
  urgencyCount: number
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v4.5m0 3h.008M10.29 3.86l-7.04 12.2A1.5 1.5 0 0 0 4.55 18.3h14.9a1.5 1.5 0 0 0 1.3-2.24l-7.04-12.2a1.97 1.97 0 0 0-3.42 0Z" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

export function CockpitMobileHeader({
  onQuickActionsOpen,
  onAgendaOpen,
  onUrgenciesOpen,
  urgencyCount,
}: CockpitMobileHeaderProps) {
  return (
    <header className="top-header" role="banner">
      <div className="header-controls">
        <button
          type="button"
          className="header-bell"
          aria-label="Voir les événements du jour"
          onClick={(event) => onAgendaOpen(event.currentTarget)}
        >
          <IconCalendar />
          <span className="header-control-label">Agenda</span>
        </button>
        <button
          type="button"
          className="header-bell"
          aria-label="Voir les urgences"
          onClick={(event) => onUrgenciesOpen(event.currentTarget)}
        >
          <IconAlert />
          <span className="header-control-label">Urgences</span>
          {urgencyCount > 0 ? <span className="bell-count">{urgencyCount}</span> : null}
        </button>
        <button
          type="button"
          className="header-quick-action"
          aria-label="Créer nouveau"
          onClick={onQuickActionsOpen}
        >
          <IconPlus />
        </button>
      </div>
    </header>
  )
}

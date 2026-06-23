import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconBell, IconBolt, IconCalendar } from "./icons"

interface CockpitMobileHeaderProps {
  alertCount: number
  onQuickActionsOpen: () => void
  onNotificationsOpen: () => void
}

export function CockpitMobileHeader({
  alertCount,
  onQuickActionsOpen,
  onNotificationsOpen,
}: CockpitMobileHeaderProps) {
  const pathname = usePathname()
  const isAgendaActive = pathname === "/agenda" || pathname.startsWith("/agenda/")

  return (
    <header className="top-header" role="banner">
      <div className="brand-lockup">
        <span className="brand-mark">
          <img src="/branding/kredo/logo_sans_fond.png" alt="Logo KREDO" />
        </span>
        <span className="brand-title">Cockpit</span>
      </div>

      <div className="header-controls">
        <Link
          href="/agenda"
          className={`header-bell ${
            isAgendaActive ? "!bg-primary !text-primary-fg !border-primary" : ""
          }`}
          aria-label="Ouvrir l'agenda"
        >
          <IconCalendar />
        </Link>

        <button
          type="button"
          className="header-bell"
          aria-label={`Notifications, ${alertCount} alertes`}
          onClick={onNotificationsOpen}
        >
          <IconBell />
          {alertCount > 0 && <span className="bell-count">{alertCount}</span>}
        </button>
        
        <button
          type="button"
          className="header-quick-action"
          aria-label="Ouvrir les actions rapides"
          onClick={onQuickActionsOpen}
        >
          <IconBolt />
        </button>
      </div>
    </header>
  )
}


"use client"

import Link from "next/link"
import type { CockpitTodayEvent } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"

interface CockpitAgendaTodayContentProps {
  events: CockpitTodayEvent[]
}

function eventTime(event: CockpitTodayEvent) {
  if (event.allDay) return "Toute la journée"
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.startsAt))
}

export function CockpitAgendaTodayContent({ events }: CockpitAgendaTodayContentProps) {
  return (
    <div className="cockpit-sheet-list">
      {events.length === 0 ? (
        <p className="cockpit-sheet-empty">Aucun événement prévu aujourd&apos;hui.</p>
      ) : (
        events.map((event) => (
          <Link key={event.id} href={event.href} className="cockpit-sheet-row">
            <span className="cockpit-sheet-row__meta">{eventTime(event)}</span>
            <span className="cockpit-sheet-row__content">
              <span className="cockpit-sheet-row__title">{event.title}</span>
              {event.companyName ? <span className="cockpit-sheet-row__detail">{event.companyName}</span> : null}
            </span>
          </Link>
        ))
      )}
      <Link href="/agenda" className="cockpit-sheet-primary-link">Ouvrir l&apos;agenda complet</Link>
    </div>
  )
}

import Link from "next/link"
import { CockpitSectionHeading } from "@/components/cockpit/desktop/CockpitSectionHeading"

import type { CockpitOperationalAlert, CockpitTodayItem } from "@/lib/cockpit/cockpit-desktop-types"

export function CockpitTodayRail({
  today,
  alerts,
}: {
  today: CockpitTodayItem[]
  alerts: CockpitOperationalAlert[]
}) {
  const primaryAlert = alerts[0]

  return (
    <aside className="kredo-cockpit-desktop__panel kredo-cockpit-desktop__today" aria-label="Aujourd’hui">
      <CockpitSectionHeading eyebrow="Aujourd’hui" title="Cadence d’exécution" />
      {today.length ? (
        <ol className="mt-4 space-y-3">
          {today.slice(0, 3).map((item) => (
            <li key={item.id} className="kredo-cockpit-desktop__today-item">
              <time className="kredo-cockpit-desktop__time" aria-label={item.moment ? undefined : "Heure non renseignée"}>{item.moment ?? "—"}</time>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-heading">{item.title}</p>
                {item.detail ? <p className="mt-1 truncate text-xs text-muted">{item.detail}</p> : null}
              </div>
              <Link href={item.action.href} className="kredo-cockpit-desktop__action-link">Préparer</Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm leading-6 text-body">Aucun engagement important planifié aujourd’hui.</p>
      )}
      {primaryAlert ? (
        <Link href={primaryAlert.action.href} className="kredo-cockpit-desktop__operational-alert" data-status={primaryAlert.status}>
          <span>{alerts.length} alerte{alerts.length > 1 ? "s" : ""} opérationnelle{alerts.length > 1 ? "s" : ""}</span>
          <span className="block truncate font-normal">{primaryAlert.title}</span>
        </Link>
      ) : (
        <p className="kredo-cockpit-desktop__no-alert">Aucune alerte opérationnelle.</p>
      )}
    </aside>
  )
}

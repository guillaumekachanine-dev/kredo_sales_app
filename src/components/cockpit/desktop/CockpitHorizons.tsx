import Link from "next/link"
import { CockpitSectionHeading } from "@/components/cockpit/desktop/CockpitSectionHeading"

import type { CockpitHorizons as CockpitHorizonsData } from "@/lib/cockpit/cockpit-desktop-types"

export function CockpitHorizons({ horizons }: { horizons: CockpitHorizonsData }) {
  return (
    <section className="kredo-cockpit-desktop__panel kredo-cockpit-desktop__horizons">
      <CockpitSectionHeading eyebrow="Horizon" title="30 / 60 / 90 jours" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        {horizons.map((horizon) => {
          const firstItem = horizon.items[0]
          return (
            <article key={horizon.days} className="kredo-cockpit-desktop__horizon-card">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{horizon.days} jours</p>
              <p className="mt-3 text-sm font-semibold text-heading">{horizon.label}</p>
              <p className="mt-2 text-xs leading-5 text-body">{horizon.items.length} sujet{horizon.items.length > 1 ? "s" : ""} à suivre</p>
              {firstItem ? <Link href={firstItem.action.href} className="mt-3 line-clamp-2 text-xs font-medium text-primary">{firstItem.label}</Link> : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

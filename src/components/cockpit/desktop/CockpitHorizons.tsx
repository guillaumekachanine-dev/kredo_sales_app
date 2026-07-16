import Link from "next/link"
import { CockpitSectionHeading } from "@/components/cockpit/desktop/CockpitSectionHeading"

import type { CockpitHorizons as CockpitHorizonsData } from "@/lib/cockpit/cockpit-desktop-types"

function formatShortDate(dateStr?: string) {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  } catch {
    return dateStr
  }
}

function getItemTypeMeta(id: string) {
  if (id.startsWith("mission:")) {
    return { label: "Mission", dotColor: "var(--color-info)" }
  }
  if (id.startsWith("project:")) {
    return { label: "Projet", dotColor: "var(--color-brand-brass)" }
  }
  return { label: "Opp", dotColor: "var(--color-success)" }
}

export function CockpitHorizons({ horizons }: { horizons: CockpitHorizonsData }) {
  return (
    <section className="kredo-cockpit-desktop__panel kredo-cockpit-desktop__horizons">
      <CockpitSectionHeading eyebrow="Échéances" title="Horizon 30 / 60 / 90 jours" />

      <div className="kredo-cockpit-desktop__timeline">
        {/* Timeline vertical axis line */}
        <div className="kredo-cockpit-desktop__timeline-line" />

        {horizons.map((horizon) => {
          const colorClass =
            horizon.days === 30 ? "danger" :
            horizon.days === 60 ? "warning" : "primary";

          return (
            <div key={horizon.days} className="kredo-cockpit-desktop__timeline-item group" data-days={horizon.days}>
              {/* Timeline node/dot */}
              <div className={`kredo-cockpit-desktop__timeline-dot kredo-cockpit-desktop__timeline-dot--${colorClass}`}>
                <div className="kredo-cockpit-desktop__timeline-dot-inner" />
              </div>

              {/* Content card with glassmorphism */}
              <article className={`kredo-cockpit-desktop__horizon-card-vertical kredo-cockpit-desktop__horizon-card-vertical--${colorClass}`}>
                <div className="kredo-cockpit-desktop__horizon-card-layout">
                  {/* Left part: Big Day Badge */}
                  <div className="kredo-cockpit-desktop__horizon-card-days">
                    <span className="kredo-cockpit-desktop__horizon-days-number">{horizon.days}</span>
                    <span className="kredo-cockpit-desktop__horizon-days-unit">J</span>
                  </div>

                  {/* Center/Right part: Grid layout of ALL items */}
                  <div className="kredo-cockpit-desktop__horizon-card-content">
                    {horizon.items.length > 0 ? (
                      <div className="kredo-cockpit-desktop__horizon-items-list">
                        {horizon.items.map((item) => {
                          const meta = getItemTypeMeta(item.id);
                          return (
                            <Link
                              key={item.id}
                              href={item.action.href}
                              className="kredo-cockpit-desktop__horizon-mini-item group/item"
                              title={`${meta.label} : ${item.label} (${item.detail})`}
                            >
                              <span
                                className="kredo-cockpit-desktop__horizon-item-dot"
                                style={{ backgroundColor: meta.dotColor }}
                              />
                              <span className="kredo-cockpit-desktop__horizon-item-text">
                                {item.label}
                              </span>
                              {item.dueDate ? (
                                <span className="kredo-cockpit-desktop__horizon-item-date">
                                  {formatShortDate(item.dueDate)}
                                </span>
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="kredo-cockpit-desktop__horizon-empty-text">
                        Aucun sujet à suivre
                      </p>
                    )}
                  </div>
                </div>
              </article>
            </div>
          )
        })}
      </div>
    </section>
  )
}

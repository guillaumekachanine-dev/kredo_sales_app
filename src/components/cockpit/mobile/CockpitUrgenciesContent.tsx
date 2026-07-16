"use client"

import type { CockpitPriorityItem } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"

interface CockpitUrgenciesContentProps {
  items: CockpitPriorityItem[]
  onShowAll?: () => void
}

export function CockpitUrgenciesContent({ items, onShowAll }: CockpitUrgenciesContentProps) {
  return (
    <div className="cockpit-sheet-list">
      {items.length === 0 ? (
        <p className="cockpit-sheet-empty">Aucune urgence active pour cette semaine.</p>
      ) : (
        items.map((item) => (
          <article key={`${item.sourceType}:${item.sourceId}`} className="cockpit-sheet-row">
            <span className="cockpit-sheet-row__meta cockpit-sheet-row__meta--danger">{item.tier}</span>
            <span className="cockpit-sheet-row__content">
              <span className="cockpit-sheet-row__title">{item.title}</span>
              <span className="cockpit-sheet-row__detail">{item.recommendedAction}</span>
            </span>
          </article>
        ))
      )}
      {onShowAll ? (
        <button type="button" className="cockpit-sheet-primary-link" onClick={onShowAll}>
          Voir toutes les priorités
        </button>
      ) : null}
    </div>
  )
}

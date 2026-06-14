import React from 'react'
import type { SectorRegulatoryItem, Urgency } from '@/types/sector'

export interface RegulatoryCalendarProps {
  items: SectorRegulatoryItem[]
  hasError?: boolean
}

const URGENCY_BORDER_COLORS: Record<Urgency, string> = {
  critical: 'border-l-danger',
  high: 'border-l-warning',
  medium: 'border-l-border',
  low: 'border-l-muted/30',
}

const URGENCY_BADGE_COLORS: Record<Urgency, string> = {
  critical: 'bg-danger/10 text-danger border border-danger/15',
  high: 'bg-warning/10 text-warning border border-warning/15',
  medium: 'bg-muted/10 text-heading border border-border',
  low: 'bg-muted/5 text-muted border border-border/40',
}

const URGENCY_LABELS: Record<Urgency, string> = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
}

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return 'Permanent'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * RegulatoryCalendar - Renders regulatory items with colored border-left based on urgency,
 * French deadline date format (or Permanent), and opportunity icons for commercial windows.
 */
export function RegulatoryCalendar({ items, hasError }: RegulatoryCalendarProps) {
  if (hasError) {
    return (
      <div className="text-xs text-danger bg-danger/5 border border-danger/10 p-3 rounded font-medium">
        Une erreur est survenue lors du chargement du calendrier réglementaire.
      </div>
    )
  }

  if (!items || items.length === 0) {
    return <p className="text-xs text-muted">Aucune contrainte réglementaire répertoriée.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const borderClass = URGENCY_BORDER_COLORS[item.urgency] ?? 'border-l-border'
        const badgeClass = URGENCY_BADGE_COLORS[item.urgency] ?? 'bg-muted/10 text-muted'
        const dateLabel = formatDateFr(item.deadline_date)

        return (
          <div
            key={item.id}
            className={`border-l-3 ${borderClass} bg-surface p-3.5 flex flex-col gap-2 relative`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
                  {URGENCY_LABELS[item.urgency] ?? item.urgency}
                </span>
                <span className="text-[9px] font-semibold text-muted">
                  {dateLabel}
                </span>
              </div>

              {item.is_commercial_window && (
                <div
                  className="flex items-center gap-1 text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/15"
                  title="Opportunité commerciale ouverte"
                >
                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span>Opportunité</span>
                </div>
              )}
            </div>

            {/* Title & Authority */}
            <div>
              <h4 className="text-xs font-bold text-heading leading-snug">{item.name}</h4>
              {item.authority && (
                <span className="text-[9px] text-muted font-medium mt-0.5 block">
                  Autorité : {item.authority}
                </span>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-xs text-body leading-relaxed">{item.description}</p>
            )}

            {/* Commercial Angle */}
            {item.commercial_angle && (
              <div className="mt-1 border-t border-border/40 pt-2 text-xs">
                <span className="font-bold text-[9px] uppercase tracking-wider text-primary block mb-0.5">
                  Angle Commercial
                </span>
                <p className="text-body leading-relaxed">{item.commercial_angle}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

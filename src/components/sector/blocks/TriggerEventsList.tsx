import React from 'react'
import type { SectorEvent, EventType } from '@/types/sector'
import { formatDate } from '@/lib/formatters'

export interface TriggerEventsListProps {
  items: SectorEvent[]
  hasError?: boolean
}

const EVENT_TYPE_BADGES: Record<EventType, string> = {
  regulatory: 'bg-danger/10 text-danger border border-danger/15',
  competitor: 'bg-primary/10 text-primary border border-primary/15',
  market: 'bg-success/10 text-success border border-success/15',
  appointment: 'bg-muted/10 text-heading border border-border',
  tender: 'bg-muted/10 text-heading border border-border',
  report: 'bg-muted/10 text-heading border border-border',
  other: 'bg-muted/10 text-heading border border-border',
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  regulatory: 'Réglementaire',
  competitor: 'Concurrent',
  market: 'Marché',
  appointment: 'Nomination',
  tender: 'Appel d\'offres',
  report: 'Rapport',
  other: 'Autre',
}


/**
 * TriggerEventsList - Renders a list of sector trigger events in a responsive grid.
 * Desktop: 2 columns, Mobile: 1 column. Shows event type badge, date, description, and opportunity details.
 */
export function TriggerEventsList({ items, hasError }: TriggerEventsListProps) {
  if (hasError) {
    return (
      <div className="text-xs text-danger bg-danger/5 border border-danger/10 p-3 rounded font-medium">
        Une erreur est survenue lors du chargement des événements déclencheurs.
      </div>
    )
  }

  if (!items || items.length === 0) {
    return <p className="text-xs text-muted">Aucun événement déclencheur répertorié.</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((item) => {
        const badgeClass = EVENT_TYPE_BADGES[item.event_type] ?? 'bg-muted/10 text-muted'
        const dateLabel = formatDate(item.event_date)

        return (
          <div key={item.id} className="bg-surface border border-border p-3.5 flex flex-col gap-2 rounded">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
                {EVENT_TYPE_LABELS[item.event_type] ?? item.event_type}
              </span>
              {dateLabel && (
                <span className="text-[9px] font-semibold text-muted">
                  {dateLabel}
                </span>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-heading leading-snug">{item.title}</h4>
            </div>

            {item.description && (
              <p className="text-xs text-body leading-relaxed">{item.description}</p>
            )}

            {item.commercial_opportunity && (
              <div className="mt-1 bg-muted/5 border-t border-border/40 pt-2 text-xs">
                <span className="font-bold text-[9px] uppercase tracking-wider text-success block mb-0.5">
                  Opportunité Commerciale
                </span>
                <p className="text-body leading-relaxed">{item.commercial_opportunity}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

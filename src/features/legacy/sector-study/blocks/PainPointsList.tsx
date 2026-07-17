import React from 'react'
import type { SectorPainPoint, PracticeKey } from '@/types/sector'
import { VerbatimBlock } from './VerbatimBlock'

export interface PainPointsListProps {
  items: SectorPainPoint[]
  hasError?: boolean
}

const PRACTICE_BADGE_COLORS: Record<string, string> = {
  data_ai: 'bg-primary/10 text-primary border border-primary/15',
  cloud_eng: 'bg-blue-500/10 text-blue-600 border border-blue-500/15',
  product: 'bg-violet-500/10 text-violet-600 border border-violet-500/15',
  cyber: 'bg-danger/10 text-danger border border-danger/15',
  multi: 'bg-body/10 text-body border border-body/15',
}

const PRACTICE_LABELS: Record<string, string> = {
  data_ai: 'Data & AI',
  cloud_eng: 'Cloud Eng',
  product: 'Product',
  cyber: 'Cyber',
  multi: 'Multi-practices',
}

/**
 * PainPointsList - Renders a list of sector pain points sorted by frequency.
 * Shows frequency count badge ({count}/7), practice badge, and conditional verbatim block.
 */
export function PainPointsList({ items, hasError }: PainPointsListProps) {
  if (hasError) {
    return (
      <div className="text-xs text-danger bg-danger/5 border border-danger/10 p-3 rounded font-medium">
        Une erreur est survenue lors du chargement des points de douleur.
      </div>
    )
  }

  if (!items || items.length === 0) {
    return <p className="text-xs text-muted">Aucun point de douleur identifié.</p>
  }

  return (
    <div className="divide-y divide-border/60">
      {items.map((item) => {
        const practiceKey = item.kredo_practice
        const practiceLabel = practiceKey ? PRACTICE_LABELS[practiceKey] : null
        const badgeClass = practiceKey ? PRACTICE_BADGE_COLORS[practiceKey] : 'bg-muted/10 text-muted'

        return (
          <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-xs font-bold text-heading leading-snug">{item.title}</h4>
              <div className="flex items-center gap-1.5 shrink-0">
                {practiceLabel && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
                    {practiceLabel}
                  </span>
                )}
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">
                  {item.frequency_count}/7
                </span>
              </div>
            </div>

            {item.description && (
              <p className="text-xs text-body leading-relaxed">{item.description}</p>
            )}

            {item.verbatim && (
              <div className="mt-1">
                <VerbatimBlock text={item.verbatim} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

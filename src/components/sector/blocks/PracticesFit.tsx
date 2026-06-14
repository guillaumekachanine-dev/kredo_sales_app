import React from 'react'
import type { PracticeKey } from '@/types/sector'

export interface PracticesFitProps {
  fit: Record<PracticeKey, number>
}

const PRACTICE_LABELS: Record<PracticeKey, string> = {
  data_ai: 'Data & AI',
  cloud_eng: 'Cloud Engineering',
  product: 'Product',
  cyber: 'Cybersecurity',
}

const PRACTICE_COLORS: Record<PracticeKey, string> = {
  data_ai: 'bg-primary',
  cloud_eng: 'bg-blue-500',
  product: 'bg-violet-500',
  cyber: 'bg-danger',
}

/**
 * PracticesFit - Renders 4 horizontal progress bars corresponding to the practices.
 * Pure HTML bars with width computed as (score/5 * 100)%.
 */
export function PracticesFit({ fit }: PracticesFitProps) {
  const practices: PracticeKey[] = ['data_ai', 'cloud_eng', 'product', 'cyber']

  return (
    <div className="space-y-3">
      {practices.map((key) => {
        const score = fit[key] ?? 0
        const percentage = Math.min(100, Math.max(0, (score / 5) * 100))

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-heading">{PRACTICE_LABELS[key]}</span>
              <span className="font-semibold text-muted text-[10px]">{score.toFixed(1)}/5.0</span>
            </div>
            <div className="h-2 w-full bg-muted/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${PRACTICE_COLORS[key]}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

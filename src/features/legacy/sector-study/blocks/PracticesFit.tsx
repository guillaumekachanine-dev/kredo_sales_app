import React from 'react'
import type { PracticeKey } from '@/types/sector'
import { PRACTICES } from '@/lib/config/practices'

export interface PracticesFitProps {
  fit: Record<PracticeKey, number>
}

// Mapping PracticeKey (sector legacy) → slug officiel
const KEY_TO_SLUG: Record<PracticeKey, string> = {
  data_ai: 'data-ia',
  cloud_eng: 'digital-cloud',
  product: 'agile-pm',
  cyber: 'cybersecurity',
}

const BY_SLUG = new Map<string, (typeof PRACTICES)[number]>(PRACTICES.map((p) => [p.slug, p]))

export function PracticesFit({ fit }: PracticesFitProps) {
  const keys: PracticeKey[] = ['data_ai', 'cloud_eng', 'product', 'cyber']

  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const score = fit[key] ?? 0
        const percentage = Math.min(100, Math.max(0, (score / 5) * 100))
        const practice = BY_SLUG.get(KEY_TO_SLUG[key])

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-heading">{practice?.shortName ?? key}</span>
              <span className="font-semibold text-muted text-[10px]">{score.toFixed(1)}/5.0</span>
            </div>
            <div className="h-2 w-full bg-muted/10 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  background: practice?.gradient ?? practice?.color ?? 'var(--color-primary)',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

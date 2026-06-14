import React from 'react'

export interface ScoreBarProps {
  score: number
}

/**
 * ScoreBar - A simple, flat visual score indicator from 0 to 5.
 * Rendered using 5 pure HTML/Tailwind segments.
 */
export function ScoreBar({ score }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(5, score))
  const filled = Math.floor(clamped)

  return (
    <div className="flex items-center gap-1 w-full" aria-label={`Score: ${score}/5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const isFilled = i < filled
        return (
          <div
            key={i}
            className={`h-1.5 flex-1 transition-colors duration-200 ${
              isFilled ? 'bg-primary' : 'bg-muted/20'
            }`}
          />
        )
      })}
    </div>
  )
}

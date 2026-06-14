import React from 'react'

export interface VerbatimBlockProps {
  text: string
  source?: string
}

/**
 * VerbatimBlock - Displays a client verbatim using the warning/amber color palette.
 */
export function VerbatimBlock({ text, source }: VerbatimBlockProps) {
  return (
    <div className="bg-warning/8 border-l-3 border-warning p-4 my-2 text-xs flex flex-col gap-2 rounded-r">
      <div className="flex items-center gap-1.5 text-warning font-bold tracking-wider uppercase text-[10px]">
        {/* Simple inline SVG double quotes icon */}
        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <span>Verbatim Client</span>
      </div>
      <blockquote className="italic text-warning font-semibold leading-relaxed">
        « {text} »
      </blockquote>
      {source && (
        <cite className="not-italic text-[10px] text-warning/80 self-end font-medium">
          — {source}
        </cite>
      )}
    </div>
  )
}

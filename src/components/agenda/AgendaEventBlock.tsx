"use client"

import React, { useRef } from "react"
import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import { formatTime } from "@/lib/agenda/agenda-date-utils"
import { cn } from "@/lib/utils"

interface AgendaEventBlockProps {
  event: AgendaEvent
  onClick: () => void
  onHover: (rect: DOMRect | null) => void
  view: "week" | "month"
  style?: React.CSSProperties
}

export function AgendaEventBlock({
  event,
  onClick,
  onHover,
  view,
  style,
}: AgendaEventBlockProps) {
  const blockRef = useRef<HTMLButtonElement>(null)
  const config = AGENDA_EVENT_TYPES[event.type] || AGENDA_EVENT_TYPES.autre

  const handleMouseEnter = () => {
    if (blockRef.current) {
      onHover(blockRef.current.getBoundingClientRect())
    }
  }

  const handleMouseLeave = () => {
    onHover(null)
  }

  const handleFocus = () => {
    if (blockRef.current) {
      onHover(blockRef.current.getBoundingClientRect())
    }
  }

  const handleBlur = () => {
    onHover(null)
  }

  const timeLabel = `${formatTime(event.occurred_at)} - ${formatTime(event.ends_at)}`

  if (view === "month") {
    // Compact representation for month view cell list
    return (
      <button
        ref={blockRef}
        type="button"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={style}
        className={cn(
          "w-full text-left px-2 py-1 rounded-[var(--radius-small)] text-[10px] font-medium border truncate transition-all cursor-pointer",
          config.colorClasses,
          config.borderClasses,
          "hover:translate-x-0.5 hover:shadow-[var(--shadow-overlay-sm)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]"
        )}
      >
        <span className="font-bold mr-1">{formatTime(event.occurred_at)}</span>
        <span>{event.summary}</span>
      </button>
    )
  }

  // Visual block for week view with absolute positioning in grid column
  return (
    <button
      ref={blockRef}
      type="button"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={style}
      className={cn(
        "absolute inset-x-1.5 flex flex-col p-2 text-left rounded-[var(--radius-small)] border text-xs leading-normal select-none overflow-hidden transition-all cursor-pointer",
        config.colorClasses,
        config.borderClasses,
        "hover:shadow-[var(--shadow-overlay-sm)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]"
      )}
    >
      <div className="flex items-center justify-between gap-1 w-full border-b border-heading/10 pb-0.5 mb-1">
        <span className="font-bold text-[10px] tracking-tight uppercase opacity-90">
          {config.shortLabel}
        </span>
        <span className="text-[9px] font-medium opacity-85 shrink-0">
          {timeLabel}
        </span>
      </div>

      <h5 className="font-bold text-[11px] text-heading leading-snug line-clamp-2 mb-1">
        {event.summary}
      </h5>

      {event.company && (
        <span className="text-[10px] opacity-80 truncate mt-auto">
          🏢 {event.company.name}
        </span>
      )}
    </button>
  )
}

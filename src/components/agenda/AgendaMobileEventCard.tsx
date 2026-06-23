"use client"

import React from "react"
import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import { formatTime } from "@/lib/agenda/agenda-date-utils"
import { StatusPill } from "@/components/ui/StatusPill"
import { cn } from "@/lib/utils"

interface AgendaMobileEventCardProps {
  event: AgendaEvent
  onClick: () => void
}

export function AgendaMobileEventCard({
  event,
  onClick,
}: AgendaMobileEventCardProps) {
  const typeConfig = AGENDA_EVENT_TYPES[event.type] || AGENDA_EVENT_TYPES.autre

  // Duration calculation
  const start = new Date(event.occurred_at)
  const end = new Date(event.ends_at)
  const diffMs = end.getTime() - start.getTime()
  const diffMins = Math.max(0, Math.round(diffMs / (60 * 1000)))
  const durationLabel = diffMins >= 60
    ? `${Math.floor(diffMins / 60)}h${diffMins % 60 > 0 ? String(diffMins % 60).padStart(2, "0") : ""}`
    : `${diffMins} min`

  // Preparatory Task formatting
  const task = event.preparatory_task
  const isTaskCompleted = task
    ? task.status === "completed" || task.status === "fait" || task.status === "done"
    : false

  const getTaskPill = () => {
    if (!task) return null
    if (isTaskCompleted) {
      return (
        <StatusPill
          variant="success"
          label="Tâche préparée"
          dot
          className="text-[10px] py-0.5 px-2"
        />
      )
    }
    const isHighPriority = task.priority === "haute"
    return (
      <StatusPill
        variant={isHighPriority ? "danger" : "warning"}
        label={`Tâche : ${task.title}`}
        dot
        className="text-[10px] py-0.5 px-2 truncate max-w-full"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left bg-surface border border-border rounded-xl transition-all select-none cursor-pointer flex flex-col gap-3 p-4 shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
        "active:scale-[0.99] active:bg-surface-hover/70 duration-[var(--motion-duration-fast)]",
        typeConfig.borderClasses
      )}
      style={{ minHeight: "88px" }} // Ensure touch target >= 44px (card is much larger anyway)
    >
      {/* Top row: Time range and duration */}
      <div className="flex items-center justify-between gap-2 w-full text-xs font-semibold text-muted">
        <div className="flex items-center gap-1.5">
          <span className="text-heading font-bold text-sm">
            {formatTime(event.occurred_at)}
          </span>
          <span>&mdash;</span>
          <span className="text-heading font-medium text-sm">
            {formatTime(event.ends_at)}
          </span>
          <span className="text-muted/40 font-normal">|</span>
          <span className="text-[11px] font-medium text-body">
            {durationLabel}
          </span>
        </div>
        <span className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
          typeConfig.colorClasses
        )}>
          {typeConfig.shortLabel}
        </span>
      </div>

      {/* Main info: Summary */}
      <div className="flex flex-col gap-1 w-full">
        <h3 className="font-heading text-base font-bold text-heading leading-snug tracking-tight">
          {event.summary}
        </h3>
        
        {/* Relations: Account and Contact */}
        {(event.company || event.contact) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-body mt-1">
            {event.company && (
              <span className="inline-flex items-center gap-1 bg-canvas border border-border/40 px-2 py-0.5 rounded-md font-medium text-heading">
                <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v3m-6-10.5h.008v.008H6.75V10.5Zm0 3h.008v.008H6.75v-.008Zm3-6h.008v.008h-.008V7.5Zm0 3h.008v.008h-.008v-.008Z" />
                </svg>
                {event.company.name}
              </span>
            )}
            {event.contact && (
              <span className="inline-flex items-center gap-1 bg-canvas border border-border/40 px-2 py-0.5 rounded-md text-muted font-normal">
                <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                {event.contact.full_name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Preparatory Task Row */}
      {task && (
        <div className="w-full pt-2 border-t border-border/50 flex items-center justify-between gap-2 mt-0.5">
          {getTaskPill()}
        </div>
      )}
    </button>
  )
}

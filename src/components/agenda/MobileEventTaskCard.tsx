import React from "react"
import { cn } from "@/lib/utils"
import type { ScheduledEventItem, TaskItem } from "@/lib/agenda/agenda-types"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import { formatMobileTimeLabel } from "./agenda-mobile-model"
import { StatusPill } from "@/components/ui/StatusPill"

import type { AgendaDomain } from "@/lib/agenda/agenda-types"

const DOMAIN_BG_CLASSES: Record<AgendaDomain, string> = {
  agenda: "bg-primary",
  missions: "bg-domain-mission-at",
  commerce: "bg-domain-account",
  recruitment: "bg-domain-recruitment",
  staffing: "bg-domain-need",
  consultants: "bg-domain-collaborator",
}

interface MobileEventTaskCardProps {
  eventItem: ScheduledEventItem
  taskItem: TaskItem
  timezone: string
  onClick: () => void
  onToggleStatus?: () => void
}

export function MobileEventTaskCard({
  eventItem,
  taskItem,
  timezone,
  onClick,
  onToggleStatus,
}: MobileEventTaskCardProps) {
  const typeConfig = AGENDA_EVENT_TYPES[eventItem.eventType] || AGENDA_EVENT_TYPES.rdv_client_suivi
  const isTaskCompleted = taskItem.businessStatus === "completed"

  // Duration calculation
  let durationLabel = ""
  if (eventItem.timebox.kind === "slot") {
    const start = new Date(eventItem.timebox.startAt)
    const end = new Date(eventItem.timebox.endAt)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.max(0, Math.round(diffMs / (60 * 1000)))
    durationLabel = diffMins >= 60
      ? `${Math.floor(diffMins / 60)}h${diffMins % 60 > 0 ? String(diffMins % 60).padStart(2, "0") : ""}`
      : `${diffMins} min`
  }

  const getPriorityVariant = () => {
    switch (taskItem.priority) {
      case "high":
        return "danger"
      case "normal":
        return "warning"
      default:
        return "neutral"
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "w-full text-left bg-surface border border-border rounded-lg transition-all select-none cursor-pointer flex flex-col gap-3 p-4 pl-5 relative shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
        "active:scale-[0.99] active:bg-surface-hover/70 duration-[150ms] ease-in-out"
      )}
    >
      {/* Left domain rail */}
      {eventItem.businessStatus !== "cancelled" && (
        <span
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
            DOMAIN_BG_CLASSES[eventItem.domain]
          )}
        />
      )}
      {/* Event Section */}
      <div className="flex flex-col gap-2 w-full">
        {/* Time and category */}
        <div className="flex items-center justify-between gap-2 w-full text-xs font-semibold text-muted">
          <div className="flex items-center gap-1.5">
            <span className="text-heading font-bold text-sm">
              {formatMobileTimeLabel(eventItem, timezone)}
            </span>
            {durationLabel && (
              <>
                <span className="text-muted/40 font-normal">|</span>
                <span className="text-[11px] font-medium text-body">
                  {durationLabel}
                </span>
              </>
            )}
          </div>
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
            typeConfig.colorClasses
          )}>
            {typeConfig.shortLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-heading text-base font-bold text-heading leading-snug tracking-tight">
          {eventItem.title}
        </h3>

        {/* Company / Contact */}
        {(eventItem.companyLabel || eventItem.personLabel) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-body mt-0.5">
            {eventItem.companyLabel && (
              <span className="inline-flex items-center gap-1 bg-canvas border border-border/40 px-2 py-0.5 rounded-md font-medium text-heading">
                <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v3m-6-10.5h.008v.008H6.75V10.5Zm0 3h.008v.008H6.75v-.008Zm3-6h.008v.008h-.008V7.5Zm0 3h.008v.008h-.008v-.008Z" />
                </svg>
                {eventItem.companyLabel}
              </span>
            )}
            {eventItem.personLabel && (
              <span className="inline-flex items-center gap-1 bg-canvas border border-border/40 px-2 py-0.5 rounded-md text-muted font-normal">
                <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                {eventItem.personLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subtle Divider */}
      <div className="border-t border-border/50 my-0.5 w-full" />

      {/* Task Section */}
      <div className="flex items-center gap-3 w-full pt-0.5">
        {/* Checkbox (Completion trigger with touch target >= 44px) */}
        <button
          type="button"
          onClick={(e) => {
            if (onToggleStatus) {
              e.stopPropagation() // Prevent opening event drawer
              onToggleStatus()
            }
          }}
          className={cn(
            "p-3 -m-3 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            onToggleStatus ? "cursor-pointer" : "cursor-not-allowed"
          )}
          aria-label={isTaskCompleted ? "Réouvrir la tâche" : "Compléter la tâche"}
        >
          <div
            className={cn(
              "size-4 rounded border flex items-center justify-center transition-colors",
              isTaskCompleted
                ? "bg-success border-success text-success-fg"
                : "border-muted/50 bg-canvas"
            )}
          >
            {isTaskCompleted && (
              <svg className="size-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </div>
        </button>

        {/* Task Title */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-xs font-semibold text-heading truncate",
              isTaskCompleted && "line-through text-muted/60"
            )}
          >
            Tâche : {taskItem.title}
          </p>
        </div>

        {/* Priority Badge */}
        {!isTaskCompleted && (
          <StatusPill
            variant={getPriorityVariant()}
            label={taskItem.priority === "high" ? "Urgent" : "À faire"}
            dot
            className="text-[10px] py-0.5 px-1.5 font-bold"
          />
        )}
      </div>
    </div>
  )
}

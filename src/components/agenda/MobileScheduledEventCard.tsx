import React from "react"
import { cn } from "@/lib/utils"
import type { ScheduledEventItem } from "@/lib/agenda/agenda-types"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import { formatMobileTimeLabel } from "./agenda-mobile-model"

import type { AgendaDomain } from "@/lib/agenda/agenda-types"

const DOMAIN_BG_CLASSES: Record<AgendaDomain, string> = {
  agenda: "bg-primary",
  missions: "bg-domain-mission-at",
  commerce: "bg-domain-account",
  recruitment: "bg-domain-recruitment",
  staffing: "bg-domain-need",
  consultants: "bg-domain-collaborator",
}

interface MobileScheduledEventCardProps {
  item: ScheduledEventItem
  timezone: string
  onClick: () => void
}

export function MobileScheduledEventCard({
  item,
  timezone,
  onClick,
}: MobileScheduledEventCardProps) {
  const typeConfig = AGENDA_EVENT_TYPES[item.eventType] || AGENDA_EVENT_TYPES.rdv_client_suivi

  // Duration calculation
  let durationLabel = ""
  if (item.timebox.kind === "slot") {
    const start = new Date(item.timebox.startAt)
    const end = new Date(item.timebox.endAt)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.max(0, Math.round(diffMs / (60 * 1000)))
    durationLabel = diffMins >= 60
      ? `${Math.floor(diffMins / 60)}h${diffMins % 60 > 0 ? String(diffMins % 60).padStart(2, "0") : ""}`
      : `${diffMins} min`
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left bg-surface border border-border rounded-lg transition-all select-none cursor-pointer flex flex-col gap-2.5 p-4 pl-5 relative shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
        "active:scale-[0.99] active:bg-surface-hover/70 duration-[150ms] ease-in-out",
      )}
      style={{ minHeight: "52px" }}
    >
      {/* Left domain rail */}
      {item.businessStatus !== "cancelled" && (
        <span
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
            DOMAIN_BG_CLASSES[item.domain]
          )}
        />
      )}
      <div className="flex items-center justify-between gap-2 w-full text-xs font-semibold text-muted">
        <div className="flex items-center gap-1.5">
          <span className="text-heading font-bold text-sm">
            {formatMobileTimeLabel(item, timezone)}
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

      <div className="flex flex-col gap-1 w-full">
        <h3 className="font-heading text-base font-bold text-heading leading-snug tracking-tight">
          {item.title}
        </h3>
        
        {(item.companyLabel || item.personLabel) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-body mt-0.5">
            {item.companyLabel && (
              <span className="inline-flex items-center gap-1 bg-canvas border border-border/40 px-2 py-0.5 rounded-md font-medium text-heading">
                <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v3m-6-10.5h.008v.008H6.75V10.5Zm0 3h.008v.008H6.75v-.008Zm3-6h.008v.008h-.008V7.5Zm0 3h.008v.008h-.008v-.008Z" />
                </svg>
                {item.companyLabel}
              </span>
            )}
            {item.personLabel && (
              <span className="inline-flex items-center gap-1 bg-canvas border border-border/40 px-2 py-0.5 rounded-md text-muted font-normal">
                <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                {item.personLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

"use client"

import React, { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import { formatTime } from "@/lib/agenda/agenda-date-utils"

interface AgendaEventPreviewProps {
  event: AgendaEvent
  anchorRect: DOMRect | null
  onOpenDetails: () => void
}

export function AgendaEventPreview({
  event,
  anchorRect,
  onOpenDetails,
}: AgendaEventPreviewProps) {
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 })
  const [mounted, setMounted] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!anchorRect) return

    const previewWidth = 320
    const padding = 10

    // Default position is to the right of the event block
    let left = anchorRect.right + padding
    let top = anchorRect.top

    // Adjust left if card overflows on the right side of the screen
    if (left + previewWidth > window.innerWidth) {
      left = anchorRect.left - previewWidth - padding
    }

    // Estimate height and adjust top if card overflows on the bottom
    const estimatedHeight = 220
    if (top + estimatedHeight > window.innerHeight) {
      top = window.innerHeight - estimatedHeight - padding
    }

    // Keep within bounds
    if (left < padding) left = padding
    if (top < padding) top = padding

    setStyle({
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${previewWidth}px`,
      opacity: 1,
      zIndex: 9999,
      transition: "opacity 120ms ease-out",
    })
  }, [anchorRect])

  if (!mounted || !anchorRect) return null

  const config = AGENDA_EVENT_TYPES[event.type] || AGENDA_EVENT_TYPES.autre

  const dateLabel = new Date(event.occurred_at).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  // Format details body
  const bodyText = event.details?.body || ""

  return createPortal(
    <div
      ref={previewRef}
      style={style}
      className="pointer-events-auto rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-overlay-md)] animate-fade-in"
    >
      <div className="flex flex-col gap-3">
        {/* Header nature */}
        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
          <div className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${config.dotClass}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-heading">
              {config.label}
            </span>
          </div>
          <span className="text-[10px] font-medium text-muted">
            {formatTime(event.occurred_at)} - {formatTime(event.ends_at)}
          </span>
        </div>

        {/* Date details */}
        <p className="text-[11px] font-semibold text-primary capitalize">
          {dateLabel}
        </p>

        {/* Subject */}
        <h4 className="text-xs font-bold text-heading leading-relaxed line-clamp-2">
          {event.summary}
        </h4>

        {/* Account and Contacts */}
        <div className="flex flex-col gap-1.5 text-xs">
          {event.company && (
            <div className="flex items-start gap-1">
              <span className="font-semibold text-muted shrink-0 w-16">Compte :</span>
              <span className="text-body truncate">{event.company.name}</span>
            </div>
          )}
          {event.contact && (
            <div className="flex items-start gap-1">
              <span className="font-semibold text-muted shrink-0 w-16">Contact :</span>
              <div className="text-body min-w-0">
                <p className="truncate font-medium">{event.contact.full_name}</p>
                {event.contact.job_title && (
                  <p className="text-[10px] text-muted truncate">{event.contact.job_title}</p>
                )}
              </div>
            </div>
          )}
          {event.opportunity && (
            <div className="flex items-start gap-1">
              <span className="font-semibold text-muted shrink-0 w-16">Opportunité :</span>
              <span className="text-body truncate">{event.opportunity.title}</span>
            </div>
          )}
          {bodyText && (
            <div className="mt-1 border-t border-border/30 pt-1.5">
              <p className="text-[11px] italic text-body line-clamp-3">
                {bodyText}
              </p>
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="mt-1 w-full rounded-[var(--radius-small)] bg-canvas hover:bg-surface-hover border border-border/80 px-2 py-1.5 text-center text-[11px] font-semibold text-primary transition-all cursor-pointer"
        >
          Ouvrir la fiche de l'événement
        </button>
      </div>
    </div>,
    document.body
  )
}

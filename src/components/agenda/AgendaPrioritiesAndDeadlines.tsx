"use client"

import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type { AgendaItem, ScheduledEventItem } from "@/lib/agenda/agenda-types"
import { getLocalDateKey } from "@/lib/agenda/agenda-temporal"
import type { AgendaDesktopVisibleDay } from "./agenda-desktop-model"

interface AgendaPrioritiesAndDeadlinesProps {
  items: AgendaItem[]
  visibleDays: AgendaDesktopVisibleDay[]
  timezone: string
  onItemClick: (item: AgendaItem) => void
}

function getItemTimestamp(item: AgendaItem): string {
  const tb = item.timebox
  if (!tb) return ""
  if (tb.kind === "slot") return tb.startAt
  if (tb.kind === "deadline" || tb.kind === "milestone") return tb.at
  if (tb.kind === "all_day") return tb.date
  if (tb.kind === "all_day_range") return tb.startDate
  return ""
}

function isItemInVisibleDays(item: AgendaItem, visibleDays: AgendaDesktopVisibleDay[], timezone: string): boolean {
  if (!visibleDays || visibleDays.length === 0) return true
  const tb = item.timebox
  if (!tb) return false

  const dateKeys = visibleDays.map(d => d.date)

  if (tb.kind === "slot") {
    const key = getLocalDateKey(tb.startAt, timezone)
    return dateKeys.includes(key)
  }
  if (tb.kind === "deadline" || tb.kind === "milestone") {
    const key = getLocalDateKey(tb.at, timezone)
    return dateKeys.includes(key)
  }
  if (tb.kind === "all_day") {
    return dateKeys.includes(tb.date)
  }
  if (tb.kind === "all_day_range") {
    const first = dateKeys[0]
    const last = dateKeys[dateKeys.length - 1]
    if (first && last) {
      return tb.startDate <= last && tb.endDate >= first
    }
    return dateKeys.includes(tb.startDate)
  }
  return false
}

export function AgendaPrioritiesAndDeadlines({
  items,
  visibleDays,
  timezone,
  onItemClick,
}: AgendaPrioritiesAndDeadlinesProps) {
  // Filter items of interest
  const filteredItems = items.filter((item) => {
    // Only display items that take place during the displayed week
    if (!isItemInVisibleDays(item, visibleDays, timezone)) {
      return false
    }

    // 1. High/urgent priority
    if (item.priority === "high" || item.priority === "urgent") {
      return true
    }
    // 2. Prospection/commerce RDV
    if (item.type === "scheduled_event" && item.sourceType === "calendar_event") {
      const scheduled = item as ScheduledEventItem
      if (["rdv_prospection", "rdv_client_suivi", "soutenance", "atelier_client"].includes(scheduled.eventType)) {
        return true
      }
    }
    // 3. Deadlines
    if (item.type === "deadline") {
      return true
    }
    return false
  })

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    // 1. High priority first
    const aHigh = a.priority === "high" || a.priority === "urgent" ? 1 : 0
    const bHigh = b.priority === "high" || b.priority === "urgent" ? 1 : 0
    if (aHigh !== bHigh) return bHigh - aHigh

    // 2. Nearest timestamp
    const aTime = getItemTimestamp(a)
    const bTime = getItemTimestamp(b)
    if (aTime && bTime) {
      if (aTime !== bTime) return aTime.localeCompare(bTime)
    }

    // 3. Type score (RDV/event > deadline > task)
    const typeScore = (x: AgendaItem) => (x.type === "scheduled_event" ? 2 : x.type === "deadline" ? 1 : 0)
    return typeScore(b) - typeScore(a)
  })

  return (
    <SurfaceCard className="p-0 overflow-hidden min-h-[300px]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-canvas/30 select-none">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-500/10">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.246.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.18 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.98 10.3c-.773-.564-.373-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z" />
            </svg>
          </span>
          <h2 className="text-sm font-bold text-heading">Priorités & échéances</h2>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-3">
        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-canvas/10 rounded-lg border border-dashed border-border/80">
            <svg className="w-8 h-8 text-muted/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-heading">Aucune priorité</p>
            <p className="text-[10px] text-muted max-w-[200px] mt-1">
              Aucun RDV, événement prioritaire ou échéance n&apos;est planifié sur cette période.
            </p>
          </div>
        ) : (
          sortedItems.map((item) => {
            const displayName = item.companyLabel || item.ownerLabel || item.personLabel || ""
            const ts = getItemTimestamp(item)

            let weekdayStr = ""
            let dayNum = ""
            let timeStr = ""

            if (ts) {
              const d = new Date(ts)
              weekdayStr = d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")
              dayNum = d.toLocaleDateString("fr-FR", { day: "2-digit" })
              timeStr = item.timebox && "allDay" in item.timebox && item.timebox.allDay
                ? "J."
                : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item)}
                className="w-full text-left flex items-stretch rounded-lg border border-border bg-surface hover:shadow-sm hover:border-border-hover transition-all cursor-pointer group overflow-hidden"
              >
                {/* Section gauche : Détails */}
                <div className="flex-1 p-3 flex flex-col gap-1 justify-center min-w-0">
                  {/* Première ligne : Nom du compte ou du consultant (si disponible) ou le titre */}
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="text-xs font-bold text-heading group-hover:text-primary transition-colors line-clamp-1">
                      {displayName || item.title}
                    </span>
                    {item.priority === "urgent" && (
                      <span className="text-[8px] font-bold text-danger bg-danger/10 px-1 py-0.5 rounded shrink-0">
                        Urgent
                      </span>
                    )}
                    {item.priority === "high" && (
                      <span className="text-[8px] font-bold text-warning bg-warning/10 px-1 py-0.5 rounded shrink-0">
                        Prioritaire
                      </span>
                    )}
                  </div>

                  {/* Deuxième ligne : Titre (sujet) si displayName est affiché au dessus */}
                  {displayName ? (
                    <div className="text-[10px] text-body font-medium line-clamp-2">
                      {item.title}
                    </div>
                  ) : null}
                </div>

                {/* Section droite : Date sous forme de carré rouge corail */}
                {ts ? (
                  <div
                    className="w-14 shrink-0 flex flex-col items-center justify-center text-white p-2 select-none"
                    style={{ backgroundColor: "#FF5252" }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">{weekdayStr}</span>
                    <span className="text-base font-extrabold leading-none my-0.5">{dayNum}</span>
                    <span className="text-[9px] font-medium opacity-95">{timeStr}</span>
                  </div>
                ) : null}
              </button>
            )
          })
        )}
      </div>
    </SurfaceCard>
  )
}

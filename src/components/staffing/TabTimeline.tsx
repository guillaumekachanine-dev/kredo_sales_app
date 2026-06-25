"use client"

import React, { useMemo } from "react"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { cn } from "@/lib/utils"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"

interface TabTimelineProps {
  data: StaffingDrawerViewModel
  events: Array<{
    id: string
    title: string
    event_type: string
    status: string
    starts_at: string
    ends_at: string
    description: string | null
  }>
}

interface TimelineItem {
  id: string
  title: string
  date: Date
  dateLabel: string
  isFuture: boolean
  status: "completed" | "scheduled" | "cancelled"
  type: "positioning" | "calendar" | "mission"
  description: string | null
  categoryLabel: string
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function formatDateWithTime(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TabTimeline({ data, events }: TabTimelineProps) {
  const { openEventDrawer } = useEventDrawerStore()
  const { closeStaffingDrawer } = useStaffingDrawerStore()

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = []
    const now = new Date()

    // 1. Add positioning events
    if (data.created_at) {
      const date = new Date(data.created_at)
      items.push({
        id: `pos-created-${data.id}`,
        title: "Profil identifié sur le besoin",
        date,
        dateLabel: formatDateShort(date),
        isFuture: date > now,
        status: "completed",
        type: "positioning",
        description: data.comment || "Positionnement initial sur le besoin.",
        categoryLabel: "Staffing",
      })
    }

    if (data.sent_to_client_at) {
      const date = new Date(data.sent_to_client_at)
      items.push({
        id: `pos-sent-${data.id}`,
        title: "Dossier de candidature transmis au client",
        date,
        dateLabel: formatDateShort(date),
        isFuture: date > now,
        status: "completed",
        type: "positioning",
        description: "Transmission du CV et de la fiche de synthèse.",
        categoryLabel: "Client",
      })
    }

    // 2. Add calendar events
    events.forEach(e => {
      const date = new Date(e.starts_at)
      const isFuture = date > now
      
      let statusVal: TimelineItem["status"] = "scheduled"
      if (e.status === "completed") statusVal = "completed"
      if (e.status === "cancelled") statusVal = "cancelled"
      
      items.push({
        id: e.id,
        title: e.title,
        date,
        dateLabel: formatDateWithTime(date),
        isFuture,
        status: statusVal,
        type: "calendar",
        description: e.description,
        categoryLabel: "Agenda",
      })
    })

    // 3. Add mission starts
    const collaborator = data.candidate?.person?.collaborators?.[0]
    if (collaborator?.missions) {
      collaborator.missions.forEach(m => {
        if (m.start_date) {
          const date = new Date(m.start_date)
          items.push({
            id: `mission-start-${m.id}`,
            title: `Démarrage de la mission : ${m.title}`,
            date,
            dateLabel: formatDateShort(date),
            isFuture: date > now,
            status: m.status === "active" ? "completed" : "scheduled",
            type: "mission",
            description: `Mission chez ${m.company?.name || "Client inconnu"}. TJM : ${m.tjm} €.`,
            categoryLabel: "Delivery",
          })
        }
      })
    }

    // Sort chronologically descending (newest first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [data, events])

  const navigateToEvent = (id: string) => {
    closeStaffingDrawer()
    openEventDrawer(id)
  }

  if (timelineItems.length === 0) {
    return (
      <div className="py-12 text-center border border-dashed border-border/50 rounded-xl select-none">
        <p className="text-xs text-muted">Aucun événement enregistré dans la timeline.</p>
      </div>
    )
  }

  return (
    <div className="relative pl-6 border-l border-border/50 space-y-5 py-2 select-none">
      {timelineItems.map((item) => {
        const isCalendar = item.type === "calendar"
        const isCompleted = item.status === "completed"
        
        return (
          <div key={item.id} className="relative group">
            {/* Timeline node dot */}
            <span
              className={cn(
                "absolute -left-[31px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border bg-surface transition duration-300",
                item.isFuture 
                  ? "border-dashed border-muted text-muted scale-95" 
                  : "border-primary text-primary"
              )}
            >
              <span 
                className={cn(
                  "size-1.5 rounded-full",
                  item.isFuture ? "bg-muted" : "bg-primary"
                )} 
              />
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-bold text-muted uppercase tracking-wider">{item.categoryLabel}</span>
                <span className="text-[10px] text-muted font-medium">{item.dateLabel}</span>
                {item.isFuture && (
                  <span className="inline-flex items-center rounded-full border border-dashed border-muted bg-canvas px-1.5 py-0.2 text-[8px] font-semibold text-muted uppercase tracking-wider">
                    Planifié
                  </span>
                )}
              </div>

              {isCalendar ? (
                <button
                  onClick={() => navigateToEvent(item.id)}
                  className="text-left font-bold text-xs text-heading hover:text-primary hover:underline bg-transparent border-0 p-0 block leading-tight cursor-pointer"
                >
                  {item.title}
                </button>
              ) : (
                <h5 className="font-bold text-xs text-heading leading-tight">{item.title}</h5>
              )}

              {item.description && (
                <p className="text-xs text-body leading-relaxed max-w-md mt-0.5 whitespace-pre-line">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

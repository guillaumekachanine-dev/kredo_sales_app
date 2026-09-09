"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import type { AgendaGroupedItem, AgendaItem, ScheduledEventItem, TaskItem } from "@/lib/agenda/agenda-types"

interface MobileAgendaTimelineProps {
  groups: AgendaGroupedItem[]
  timezone: string
  onItemClick: (item: AgendaItem) => void
  onToggleTaskStatus: (taskId: string) => void
}

function startTime(item: AgendaItem, timezone: string) {
  if (item.timebox.kind !== "slot") return null
  return new Date(item.timebox.startAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  })
}

function duration(item: AgendaItem) {
  if (item.timebox.kind !== "slot") return null
  const minutes = Math.max(0, Math.round((new Date(item.timebox.endAt).getTime() - new Date(item.timebox.startAt).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h${String(remaining).padStart(2, "0")}` : `${hours}h`
}

function context(item: AgendaItem) {
  return [item.personLabel, item.companyLabel].filter(Boolean).join(" · ")
}

function itemTone(item: AgendaItem) {
  if (item.type === "scheduled_event") {
    return AGENDA_EVENT_TYPES[item.eventType] ?? AGENDA_EVENT_TYPES.rdv_client_suivi
  }
  if (item.type === "availability_block") return { colorClasses: "bg-muted/10 border-muted/25", dotClass: "bg-muted" }
  if (item.type === "deadline") return { colorClasses: "bg-warning/10 border-warning/25", dotClass: "bg-warning" }
  if (item.type === "alert") return { colorClasses: "bg-danger/10 border-danger/25", dotClass: "bg-danger" }
  return { colorClasses: "bg-primary/10 border-primary/20", dotClass: "bg-primary" }
}

function TimelineRow({ children, dotClass }: { children: React.ReactNode; dotClass: string }) {
  return (
    <div className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center">
        <span className="relative z-10 mt-5 flex size-4 items-center justify-center rounded-full border-2 border-primary/55 bg-surface"><span className={cn("size-1.5 rounded-full", dotClass)} /></span>
      </div>
      <span className="absolute left-[1.35rem] top-[1.75rem] h-px w-[1.25rem] bg-primary/40" aria-hidden="true" />
      {children}
    </div>
  )
}

function EventBubble({ event, task, timezone, onClick, onToggleTaskStatus }: {
  event: ScheduledEventItem
  task?: TaskItem
  timezone: string
  onClick: () => void
  onToggleTaskStatus: (taskId: string) => void
}) {
  const tone = itemTone(event)
  const eventContext = context(event)
  const eventDuration = duration(event)
  const completed = task?.businessStatus === "completed"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(eventKey) => {
        if (eventKey.key === "Enter" || eventKey.key === " ") {
          eventKey.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "min-h-[7.75rem] cursor-pointer rounded-[var(--radius-medium)] border p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 active:bg-surface-hover/50",
        tone.colorClasses,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-heading text-[15px] font-bold leading-5 text-heading">{event.title}</h3>
        {startTime(event, timezone) ? <time className="shrink-0 text-sm font-bold text-heading">{startTime(event, timezone)}</time> : null}
      </div>
      {eventContext ? <p className="mt-2 text-xs font-medium leading-5 text-body">{eventContext}</p> : null}
      {eventDuration ? <p className="mt-2 text-xs font-medium text-body">Durée : {eventDuration}</p> : null}
      {task ? (
        <button
          type="button"
          onClick={(clickEvent) => {
            clickEvent.stopPropagation()
            onToggleTaskStatus(task.sourceId)
          }}
          className="-mx-2 mt-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 text-left text-xs font-semibold text-heading transition-colors hover:bg-surface/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={completed ? `Réouvrir la tâche ${task.title}` : `Terminer la tâche ${task.title}`}
        >
          <span className={cn("flex size-5 shrink-0 items-center justify-center rounded border", completed ? "border-success bg-success text-success-fg" : "border-body/35 bg-surface/70")}>
            {completed ? <svg className="size-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> : null}
          </span>
          <span className={cn("min-w-0 truncate", completed && "text-muted line-through")}>Tâche : {task.title}</span>
        </button>
      ) : null}
    </div>
  )
}

function GenericBubble({ item, timezone, onClick }: {
  item: AgendaItem
  timezone: string
  onClick: () => void
}) {
  const tone = itemTone(item)
  const itemContext = context(item) || item.subtitle
  const itemDuration = duration(item)
  const isTask = item.type === "task"
  const completed = isTask && item.businessStatus === "completed"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[6.5rem] w-full rounded-[var(--radius-medium)] border p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 active:bg-surface-hover/50",
        tone.colorClasses,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className={cn("min-w-0 font-heading text-[15px] font-bold leading-5 text-heading", completed && "text-muted line-through")}>{item.title}</h3>
        {startTime(item, timezone) ? <time className="shrink-0 text-sm font-bold text-heading">{startTime(item, timezone)}</time> : null}
      </div>
      {itemContext ? <p className="mt-2 text-xs font-medium leading-5 text-body">{itemContext}</p> : null}
      {itemDuration ? <p className="mt-2 text-xs font-medium text-body">Durée : {itemDuration}</p> : null}
      {isTask ? <span className="sr-only">{completed ? "Tâche terminée" : "Tâche à faire"}</span> : null}
    </button>
  )
}

export function MobileAgendaTimeline({ groups, timezone, onItemClick, onToggleTaskStatus }: MobileAgendaTimelineProps) {
  return (
    <div className="relative space-y-3 before:absolute before:bottom-6 before:left-[13px] before:top-6 before:w-px before:bg-primary/45">
      {groups.map((group) => {
        const event = group.items.find((item): item is ScheduledEventItem => item.type === "scheduled_event")
        const task = group.items.find((item): item is TaskItem => item.type === "task")
        const primary = event ?? group.primaryItem
        const tone = itemTone(primary)

        return (
          <TimelineRow key={group.id} dotClass={tone.dotClass}>
            {event ? (
              <EventBubble event={event} task={task} timezone={timezone} onClick={() => onItemClick(event)} onToggleTaskStatus={onToggleTaskStatus} />
            ) : (
              <GenericBubble item={primary} timezone={timezone} onClick={() => onItemClick(primary)} />
            )}
          </TimelineRow>
        )
      })}
    </div>
  )
}

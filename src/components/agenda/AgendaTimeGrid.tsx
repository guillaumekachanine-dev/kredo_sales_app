import { cn } from "@/lib/utils"
import {
  getAgendaDesktopCurrentTimeTopPct,
  getAgendaDesktopDayHours,
  isAgendaDesktopCurrentTimeVisible,
  type AgendaDesktopVisibleDay,
  type AgendaScheduledPlacement,
} from "./agenda-desktop-model"
import { AgendaScheduledEventBlock } from "./AgendaScheduledEventBlock"

interface AgendaTimeGridProps {
  visibleDays: AgendaDesktopVisibleDay[]
  scheduledColumns: Array<{
    day: AgendaDesktopVisibleDay
    items: AgendaScheduledPlacement[]
  }>
  timezone: string
  now: string
  emptyState: "empty" | "filtered" | "no-scheduled-events" | "ready"
  onScheduledEventClick: (placement: AgendaScheduledPlacement) => void
}

export function AgendaTimeGrid({
  visibleDays,
  scheduledColumns,
  timezone,
  now,
  emptyState,
  onScheduledEventClick,
}: AgendaTimeGridProps) {
  const { hours } = getAgendaDesktopDayHours()
  const currentTimeTop = getAgendaDesktopCurrentTimeTopPct(now, timezone)
  const hasScheduledItems = scheduledColumns.some((column) => column.items.length > 0)

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] border-b border-border bg-canvas/60">
        <div className="border-r border-border px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Heure
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
        >
          {visibleDays.map((day) => (
            <div
              key={day.date}
              className={cn(
                "border-r border-border px-3 py-3 last:border-r-0",
                day.isToday && "bg-primary/[0.04]",
              )}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {day.shortLabel}
              </div>
              <div className="text-sm font-semibold text-heading">
                {day.dayNumber}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[5rem_minmax(0,1fr)]">
        <div className="relative border-r border-border bg-canvas/30">
          {hours.map((hour, index) => (
            <div
              key={hour}
              style={{ top: `${(index / (hours.length - 1)) * 100}%` }}
              className="absolute right-3 -translate-y-1/2 text-[10px] font-semibold text-muted"
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        <div
          className="relative grid h-[44rem]"
          style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
        >
          {visibleDays.map((day, dayIndex) => (
            <div
              key={day.date}
              className={cn(
                "relative border-r border-border last:border-r-0",
                day.isToday && "bg-primary/[0.025]",
              )}
            >
              {hours.map((hour, index) => {
                if (index === hours.length - 1) return null
                const top = (index / (hours.length - 1)) * 100
                const halfTop = top + (100 / (hours.length - 1)) / 2

                return (
                  <div key={`${day.date}-${hour}`}>
                    <div style={{ top: `${top}%` }} className="absolute inset-x-0 border-t border-border/70" />
                    <div style={{ top: `${halfTop}%` }} className="absolute inset-x-0 border-t border-dashed border-border/35" />
                  </div>
                )
              })}

              {scheduledColumns[dayIndex]?.items.map((placement) => (
                <AgendaScheduledEventBlock
                  key={placement.id}
                  placement={placement}
                  timezone={timezone}
                  onClick={() => onScheduledEventClick(placement)}
                />
              ))}

              {isAgendaDesktopCurrentTimeVisible(day.date, now, timezone) ? (
                <div
                  style={{ top: `${currentTimeTop}%` }}
                  className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                >
                  <div className="-ml-1 size-2 rounded-full bg-danger" />
                  <div className="h-px flex-1 bg-danger" />
                </div>
              ) : null}
            </div>
          ))}

          {!hasScheduledItems ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
              <div className="rounded-[var(--radius-large)] border border-dashed border-border bg-canvas/80 px-5 py-4 text-center">
                <p className="text-sm font-semibold text-heading">
                  {emptyState === "no-scheduled-events"
                    ? "Aucun événement planifié dans la grille horaire."
                    : "Aucun événement planifié sur cette période."}
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  Les échéances, alertes et absences restent disponibles dans le rail et le bandeau all-day.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

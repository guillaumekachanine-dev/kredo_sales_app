"use client"

import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { formatDateNumeric, formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { MissionDetailViewModel } from "./mission-detail-types"

const CATEGORY_CONFIG: Record<string, { label: string; dot: string }> = {
  absence: {
    label: "Absence",
    dot: "bg-dataviz-2",
  },
  client_closure: {
    label: "Fermeture client",
    dot: "bg-dataviz-3",
  },
  client_follow_up: {
    label: "Suivi client",
    dot: "bg-primary",
  },
  collaborator_follow_up: {
    label: "Suivi consultant",
    dot: "bg-dataviz-4",
  },
}

interface MissionPlanningTabProps {
  vm: MissionDetailViewModel
}

export function MissionPlanningTab({ vm }: MissionPlanningTabProps) {
  const { mission, planningEvents } = vm

  const today = new Date().toISOString().slice(0, 10)

  const sortedEvents = [...planningEvents].sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  )

  const upcomingCount = planningEvents.filter((e) => e.startDate >= today).length
  const pastCount = planningEvents.length - upcomingCount
  const hasMissionDates = mission.start_date !== null

  const MissionRangeBar = hasMissionDates ? (
    <SurfaceCard className="p-5 flex flex-col gap-3">
      <h3 className="text-sm font-bold text-heading">Durée de la mission</h3>
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-heading whitespace-nowrap">
          {formatDateNumeric(mission.start_date)}
        </span>
        <div className="flex-1 h-2 rounded-full bg-dataviz-7/15 overflow-hidden relative">
          <div className="h-full w-full bg-dataviz-7/40 rounded-full" />
          {today >= (mission.start_date ?? "") && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-dataviz-7 rounded"
              title="Aujourd'hui"
            />
          )}
        </div>
        <span className="text-xs font-semibold text-heading whitespace-nowrap">
          {mission.end_date ? formatDateNumeric(mission.end_date) : "Open-ended"}
        </span>
      </div>
      {!mission.end_date && (
        <p className="text-[10px] text-muted">
          {"Mission sans date de fin — fenêtre d'affichage provisoire."}
        </p>
      )}
    </SurfaceCard>
  ) : null

  if (planningEvents.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {MissionRangeBar}
        <SurfaceCard className="p-5">
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <svg
              className="w-8 h-8 text-muted/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs text-muted italic">
              Aucun événement de planning rattaché à cette mission.
            </p>
            <p className="text-[10px] text-muted text-center max-w-xs">
              {"Les événements de suivi client/consultant et les absences apparaissent ici une fois créés depuis l'agenda."}
            </p>
          </div>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Main column : duration bar + timeline */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        {MissionRangeBar}

        {/* Vertical timeline — structure identique à TabTimeline, accent ocre/terre */}
        <SurfaceCard className="p-5">
          <div className="relative pl-6 border-l border-dataviz-7/30 space-y-5 py-2 select-none">
            {sortedEvents.map((event) => {
              const isPast = event.startDate < today
              const isCancelled = event.status === "cancelled"
              const cat = CATEGORY_CONFIG[event.category] ?? {
                label: event.category,
                dot: "bg-muted",
              }

              const dateLabel =
                formatDate(event.startDate) +
                (event.endDate && event.endDate !== event.startDate
                  ? ` → ${formatDate(event.endDate)}`
                  : "")

              return (
                <div key={event.id} className="relative">
                  {/* Timeline node */}
                  <span
                    className={cn(
                      "absolute -left-[31px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border bg-surface transition duration-300",
                      isCancelled
                        ? "border-dashed border-muted/40"
                        : isPast
                        ? "border-dataviz-7"
                        : "border-dashed border-muted/60"
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        isCancelled
                          ? "bg-muted/30"
                          : isPast
                          ? "bg-dataviz-7"
                          : "bg-muted/40"
                      )}
                    />
                  </span>

                  <div className="flex flex-col gap-1">
                    {/* Meta row: category dot + label + date + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            cat.dot
                          )}
                        />
                        <span className="text-[9px] font-bold text-muted uppercase tracking-wider">
                          {cat.label}
                        </span>
                      </span>
                      <span className="text-[10px] text-muted font-medium">
                        {dateLabel}
                      </span>
                      {!isPast && !isCancelled && (
                        <span className="inline-flex items-center rounded-full border border-dashed border-muted/60 bg-canvas px-1.5 py-px text-[8px] font-semibold text-muted uppercase tracking-wider">
                          Planifié
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center rounded-full bg-danger/8 border border-danger/20 px-1.5 py-px text-[8px] font-semibold text-danger uppercase tracking-wider">
                          Annulé
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h5
                      className={cn(
                        "font-bold text-xs leading-tight",
                        isCancelled ? "text-muted line-through" : "text-heading"
                      )}
                    >
                      {event.title}
                    </h5>

                    {/* Description */}
                    {event.description && (
                      <p className="text-xs text-body leading-relaxed max-w-md mt-0.5 whitespace-pre-line">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </SurfaceCard>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-5">
        {/* Stats */}
        <SurfaceCard className="p-5 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-heading">Planning</h3>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                À venir
              </span>
              <span className="text-3xl font-bold font-mono text-dataviz-7">
                {upcomingCount}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                Réalisés
              </span>
              <span className="text-3xl font-bold font-mono text-heading">
                {pastCount}
              </span>
            </div>
          </div>
        </SurfaceCard>

        {/* Legend */}
        <SurfaceCard className="p-5 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-heading">Légende</h3>

          <div className="flex flex-col gap-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, style]) => (
              <div key={key} className="flex items-center gap-2 text-[10px] text-muted">
                <span className={cn("w-2 h-2 rounded-full shrink-0", style.dot)} />
                {style.label}
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border/40 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-dataviz-7 shrink-0">
                <span className="size-1 rounded-full bg-dataviz-7" />
              </span>
              Événement passé
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-dashed border-muted/60 shrink-0">
                <span className="size-1 rounded-full bg-muted/40" />
              </span>
              Événement planifié
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}

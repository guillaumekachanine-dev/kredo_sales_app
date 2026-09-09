"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { OpportunityDeadlineSource } from "./data/opportunity-deadline.types"
import type { PlanningOpportunityItem } from "./data/opportunities-planning.types"
import { buildPlanningHref } from "./navigation/planning-url"
import {
  buildTimelinePeriod,
  getTimelinePosition,
  getTodayPosition,
  shiftTimelineAnchor,
  type PlanningScale,
} from "./planning-timeline"

const SOURCE_LABEL: Record<OpportunityDeadlineSource, string> = {
  next_action: "Prochaine action",
  calendar_event: "Événement agenda",
  target_close: "Closing visé",
}

function formatDate(dateIso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateIso))
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true" className="size-3.5">
      <path d={direction === "left" ? "m10 3-5 5 5 5" : "m6 3 5 5-5 5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DeadlineMark({ source, selected = false }: { source: OpportunityDeadlineSource; selected?: boolean }) {
  if (source === "next_action") {
    return <span className={cn("block rounded-full bg-primary", selected ? "size-4 ring-4 ring-primary/15" : "size-3")} />
  }
  if (source === "calendar_event") {
    return <span className={cn("block border-2 border-info bg-surface", selected ? "size-4 ring-4 ring-info/10" : "size-3")} />
  }
  return <span className={cn("block rotate-45 bg-brand-brass", selected ? "size-3.5 ring-4 ring-brand-brass/15" : "size-3")} />
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-body" aria-label="Nature des échéances">
      {(Object.keys(SOURCE_LABEL) as OpportunityDeadlineSource[]).map((source) => (
        <span key={source} className="inline-flex items-center gap-2">
          <DeadlineMark source={source} />
          {SOURCE_LABEL[source]}
        </span>
      ))}
    </div>
  )
}

interface PlanningTimelineProps {
  items: PlanningOpportunityItem[]
  selectedOpportunityId: string | null
  referenceDateIso: string
  searchParamsString: string
}

export function PlanningTimeline({
  items,
  selectedOpportunityId,
  referenceDateIso,
  searchParamsString,
}: PlanningTimelineProps) {
  const [scale, setScale] = useState<PlanningScale>("month")
  const [anchorIso, setAnchorIso] = useState(referenceDateIso)
  const period = useMemo(
    () => buildTimelinePeriod(scale, anchorIso, referenceDateIso),
    [anchorIso, referenceDateIso, scale],
  )
  const todayPosition = getTodayPosition(referenceDateIso, period)

  const setScaleAndReset = (nextScale: PlanningScale) => {
    setScale(nextScale)
    setAnchorIso(referenceDateIso)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-surface" aria-labelledby="planning-timeline-title">
      <header className="shrink-0 border-b border-border px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 id="planning-timeline-title" className="font-heading text-lg font-bold tracking-tight text-heading">
              Échéances commerciales
            </h1>
            <p className="mt-0.5 text-[11px] text-muted">
              Une échéance canonique par opportunité ouverte
            </p>
          </div>
          <div className="flex shrink-0 items-center rounded-[var(--radius-medium)] border border-border bg-canvas p-0.5" aria-label="Échelle du planning">
            {(["month", "year"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScaleAndReset(value)}
                aria-pressed={scale === value}
                className={cn(
                  "h-7 rounded-[calc(var(--radius-medium)-2px)] px-3 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  scale === value ? "bg-primary text-primary-fg" : "text-body hover:bg-surface",
                )}
              >
                {value === "month" ? "Mois" : "Année"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs font-bold tracking-[0.08em] text-heading">{period.title}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAnchorIso(shiftTimelineAnchor(anchorIso, scale, -1))}
              aria-label={scale === "month" ? "Mois précédent" : "Année précédente"}
              className="flex size-8 items-center justify-center rounded-[var(--radius-medium)] border border-border text-body transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <Chevron direction="left" />
            </button>
            <button
              type="button"
              onClick={() => setAnchorIso(referenceDateIso)}
              className="h-8 rounded-[var(--radius-medium)] border border-border px-2.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Aujourd’hui
            </button>
            <button
              type="button"
              onClick={() => setAnchorIso(shiftTimelineAnchor(anchorIso, scale, 1))}
              aria-label={scale === "month" ? "Mois suivant" : "Année suivante"}
              className="flex size-8 items-center justify-center rounded-[var(--radius-medium)] border border-border text-body transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <Chevron direction="right" />
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[620px]">
          <div className="sticky top-0 z-30 grid grid-cols-[180px_minmax(0,1fr)] border-b border-border bg-surface">
            <div className="flex h-10 items-center border-r border-border px-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
              Opportunité
            </div>
            <div className="relative grid" style={{ gridTemplateColumns: `repeat(${period.columns.length}, minmax(0, 1fr))` }}>
              {period.columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "flex h-10 items-center justify-center border-r border-border/50 text-[9px] font-semibold last:border-r-0",
                    column.isCurrent ? "bg-primary/[0.05] text-primary" : "text-muted",
                  )}
                >
                  {column.label}
                </div>
              ))}
              {todayPosition !== null ? (
                <div className="pointer-events-none absolute inset-y-0 z-20 w-px bg-primary" style={{ left: `${todayPosition}%` }} aria-hidden="true" />
              ) : null}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex min-h-64 items-center justify-center px-6 text-center">
              <div>
                <p className="text-sm font-bold text-heading">Aucune opportunité ouverte</p>
                <p className="mt-1 text-xs text-muted">Le planning se remplira dès qu’une échéance commerciale sera disponible.</p>
              </div>
            </div>
          ) : (
            <div>
              {items.map((item) => {
                const position = item.deadline ? getTimelinePosition(item.deadline.dueAt, period) : null
                const isSelected = item.id === selectedOpportunityId
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "grid grid-cols-[180px_minmax(0,1fr)] border-b border-border/70 transition-colors",
                      isSelected ? "min-h-[88px] bg-primary/[0.045]" : "min-h-[58px] hover:bg-canvas/60",
                    )}
                  >
                    <div className={cn("border-r border-border px-4", isSelected ? "py-4" : "py-3")}>
                      <p className={cn("truncate text-[11px] font-semibold", isSelected ? "text-primary-deep" : "text-heading")}>
                        {item.clientName}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-body">{item.title}</p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${period.columns.length}, minmax(0, 1fr))` }} aria-hidden="true">
                        {period.columns.map((column) => (
                          <div key={column.key} className={cn("border-r border-border/35 last:border-r-0", column.isCurrent && "bg-primary/[0.025]")} />
                        ))}
                      </div>
                      <div className="pointer-events-none absolute inset-x-3 top-1/2 h-px bg-border/70" aria-hidden="true" />
                      {todayPosition !== null ? (
                        <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary/55" style={{ left: `${todayPosition}%` }} aria-hidden="true" />
                      ) : null}

                      {position !== null && item.deadline ? (
                        <Link
                          href={buildPlanningHref(searchParamsString, item.id)}
                          replace
                          scroll={false}
                          aria-label={`${item.title}, ${item.clientName}, ${SOURCE_LABEL[item.deadline.source]}, ${formatDate(item.deadline.dueAt)}`}
                          aria-current={isSelected ? "true" : undefined}
                          className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          style={{ left: `${position}%` }}
                        >
                          <DeadlineMark source={item.deadline.source} selected={isSelected} />
                        </Link>
                      ) : null}

                      {isSelected && item.deadline && position !== null ? (
                        <div
                          className={cn(
                            "pointer-events-none absolute top-2 z-20 w-[202px] border border-border bg-surface px-3 py-2 text-[10px] leading-4",
                            position > 68 ? "-translate-x-full -ml-3" : "ml-3",
                          )}
                          style={{ left: `${position}%` }}
                        >
                          <p className="truncate font-bold text-heading">{item.title}</p>
                          <p className="truncate text-body">{item.clientName}</p>
                          <p className="mt-0.5 font-medium text-primary">
                            {formatDate(item.deadline.dueAt)} · {SOURCE_LABEL[item.deadline.source]}
                          </p>
                        </div>
                      ) : null}

                      {isSelected && (!item.deadline || position === null) ? (
                        <div className="absolute inset-y-0 left-4 z-20 flex items-center text-[10px] text-muted">
                          {item.deadline ? "Échéance hors de la période affichée" : "Aucune échéance canonique"}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-surface px-5 py-3">
        <Legend />
        <span className="shrink-0 text-[9px] text-muted">Jalons futurs · UTC</span>
      </footer>
    </section>
  )
}

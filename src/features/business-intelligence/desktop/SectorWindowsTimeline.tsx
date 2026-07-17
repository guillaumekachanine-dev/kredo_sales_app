"use client"

import { useMemo, useState } from "react"
import {
  SECTOR_ACTIVATION_SOURCE_LABELS,
  type SectorActivationWindow,
} from "@/lib/prospection/sector-activation-types"

interface SectorWindowsTimelineProps {
  windows: SectorActivationWindow[]
  onSelectWindow: (window: SectorActivationWindow) => void
}

function getTimelineDate(window: SectorActivationWindow) {
  return window.deadlineAt ?? window.detectedAt
}

function getSortableTime(window: SectorActivationWindow) {
  const value = getTimelineDate(window)
  if (!value) return Number.POSITIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function formatTimelineDate(value: string | null) {
  if (!value) return "À dater"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "À dater"

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function urgencyClassName(score: number) {
  if (score >= 80) return "border-danger/30 bg-danger/10 text-danger"
  if (score >= 60) return "border-warning/30 bg-warning/10 text-warning"
  return "border-border/40 bg-surface-hover/40 text-heading"
}

export function SectorWindowsTimeline({ windows, onSelectWindow }: SectorWindowsTimelineProps) {
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null)

  const timelineWindows = useMemo(() => (
    [...windows].sort((left, right) => {
      const leftTime = getSortableTime(left)
      const rightTime = getSortableTime(right)
      if (leftTime === rightTime) return left.title.localeCompare(right.title, "fr")
      return leftTime - rightTime
    })
  ), [windows])

  function selectWindow(window: SectorActivationWindow) {
    setSelectedWindowId(window.id)
    onSelectWindow(window)
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border/30 bg-surface/30">
      <div className="flex items-end justify-between gap-4 border-b border-border/30 px-5 py-4">
        <div className="space-y-1">
          <h2 className="font-heading text-sm font-bold text-heading">Fenêtres sectorielles</h2>
          <p className="text-xs text-muted">Les cinq signaux sélectionnés, positionnés par échéance.</p>
        </div>
        <span className="shrink-0 text-xxs text-muted">{timelineWindows.length} jalons</span>
      </div>

      {timelineWindows.length === 0 ? (
        <p className="px-5 py-10 text-center text-xs text-muted">Aucune fenêtre active détectée.</p>
      ) : (
        <ol className="divide-y divide-border/20 px-5 py-1">
          {timelineWindows.map((window, index) => {
            const isSelected = selectedWindowId === window.id
            const date = getTimelineDate(window)

            return (
              <li key={window.id} className="relative grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-4 last:pb-5">
                <div className="relative pt-1 text-right">
                  <time dateTime={date ?? undefined} className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {formatTimelineDate(date)}
                  </time>
                  <span className="mt-1 block text-xxs text-muted">{date ? "Échéance" : "Calendrier"}</span>
                  {index < timelineWindows.length - 1 ? (
                    <span aria-hidden="true" className="absolute right-[-1.15rem] top-8 h-[calc(100%+1rem)] w-px bg-border/50" />
                  ) : null}
                  <span aria-hidden="true" className={`absolute right-[-1.42rem] top-3 size-2.5 rounded-full border-2 ${isSelected ? "border-primary bg-primary ring-4 ring-primary/15" : "border-border bg-surface"}`} />
                </div>

                <button
                  type="button"
                  onClick={() => selectWindow(window)}
                  aria-pressed={isSelected}
                  className={`group w-full rounded-xl border p-4 text-left transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected
                    ? "border-primary/60 bg-primary/10 shadow-sm"
                    : "border-border/30 bg-surface/20 hover:border-border hover:bg-surface-hover/30"
                    }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <h3 className={`text-sm font-bold leading-snug transition-colors ${isSelected ? "text-primary" : "text-body group-hover:text-heading"}`}>{window.title}</h3>
                      <p className="mt-1 text-xs text-muted">{window.sectorName} <span aria-hidden="true">·</span> {window.practiceLabel}</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-[10px] font-bold ${urgencyClassName(window.urgencyScore)}`}>
                      Urgence&nbsp; {window.urgencyScore}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-x-5 gap-y-3 border-t border-border/20 pt-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Source</dt>
                      <dd className="mt-1 truncate text-xs text-body" title={window.sourceLabel}>{SECTOR_ACTIVATION_SOURCE_LABELS[window.sourceType]} · {window.sourceLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Comptes exposés</dt>
                      <dd className="mt-1 text-xs font-semibold text-heading">{window.exposedAccountCount} compte{window.exposedAccountCount > 1 ? "s" : ""}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Action suggérée</dt>
                      <dd className="mt-1 line-clamp-2 text-xs leading-relaxed text-body" title={window.suggestedAction}>{window.suggestedAction}</dd>
                    </div>
                  </dl>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

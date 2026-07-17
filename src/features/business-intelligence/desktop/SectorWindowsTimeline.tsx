"use client"

import type { CSSProperties } from "react"
import { useMemo, useState } from "react"
import {
  SECTOR_ACTIVATION_SOURCE_LABELS,
  type SectorActivationWindow,
} from "@/lib/prospection/sector-activation-types"

type SectorWindowsTimelineMode = "summary" | "expanded"

interface SectorWindowsTimelineProps {
  windows: SectorActivationWindow[]
  onSelectWindow: (window: SectorActivationWindow) => void
  selectedWindowId?: string | null
  mode?: SectorWindowsTimelineMode
  onShowAll?: () => void
}

interface TimelineGroup {
  key: string
  label: string
  windows: SectorActivationWindow[]
}

const TIMELINE_TONES = {
  regulation: {
    border: "border-primary/45",
    connector: "bg-primary/70",
    marker: "border-primary bg-primary/20",
    signal: "bg-primary",
    source: "text-primary",
  },
  event: {
    border: "border-info/45",
    connector: "bg-info/70",
    marker: "border-info bg-info/20",
    signal: "bg-info",
    source: "text-info",
  },
  news: {
    border: "border-success/45",
    connector: "bg-success/70",
    marker: "border-success bg-success/20",
    signal: "bg-success",
    source: "text-success",
  },
} as const

function getTimelineDate(window: SectorActivationWindow) {
  return window.deadlineAt ?? window.detectedAt
}

function getSortableTime(window: SectorActivationWindow) {
  const value = getTimelineDate(window)
  if (!value) return Number.POSITIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function sortWindows(windows: SectorActivationWindow[]) {
  return [...windows].sort((left, right) => {
    const leftTime = getSortableTime(left)
    const rightTime = getSortableTime(right)
    if (leftTime === rightTime) return left.title.localeCompare(right.title, "fr")
    return leftTime - rightTime
  })
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

function groupWindowsByPeriod(windows: SectorActivationWindow[]): TimelineGroup[] {
  return sortWindows(windows).reduce<TimelineGroup[]>((groups, window) => {
    const date = getTimelineDate(window)
    const parsedDate = date ? new Date(date) : null
    const isUndated = !parsedDate || Number.isNaN(parsedDate.getTime())
    const year = isUndated ? null : parsedDate.getFullYear()
    const quarter = isUndated ? null : Math.floor(parsedDate.getMonth() / 3) + 1
    const key = isUndated ? "undated" : `${year}-T${quarter}`
    const label = isUndated ? "À dater" : `${year} — T${quarter}`
    const existing = groups.find((group) => group.key === key)

    if (existing) {
      existing.windows.push(window)
      return groups
    }

    groups.push({ key, label, windows: [window] })
    return groups
  }, [])
}

function TimelineCard({
  window,
  isSelected,
  isInteractive,
  onSelect,
  onInteract,
  onLeave,
}: {
  window: SectorActivationWindow
  isSelected: boolean
  isInteractive: boolean
  onSelect: () => void
  onInteract: () => void
  onLeave: () => void
}) {
  const isAccent = isSelected || isInteractive
  const date = getTimelineDate(window)
  const tone = TIMELINE_TONES[window.sourceType]

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onInteract}
      onMouseLeave={onLeave}
      onFocus={onInteract}
      onBlur={onLeave}
      aria-pressed={isSelected}
      className={`group relative h-full w-full overflow-hidden rounded-xl border p-3 text-left transition-[background-color,border-color,color,box-shadow,transform] duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isAccent
        ? "border-primary/70 bg-primary/10 shadow-sm"
        : `${tone.border} bg-surface/20 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10`
        }`}
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-0.5 transition-colors duration-200 motion-reduce:transition-none ${isAccent ? "bg-primary" : tone.signal}`} />
      <div className="flex items-start justify-between gap-2">
        <time dateTime={date ?? undefined} className={`text-[9px] font-semibold uppercase tracking-[0.08em] ${isAccent ? "text-primary" : `${tone.source} group-hover:text-primary`}`}>
          {formatTimelineDate(date)}
        </time>
        <span className="shrink-0 rounded border border-border/40 bg-surface-hover/30 px-1.5 py-0.5 text-[9px] font-semibold text-body">
          U. {window.urgencyScore}
        </span>
      </div>

      <h3 className={`mt-2 text-xs font-bold leading-snug transition-colors ${isAccent ? "text-primary" : "text-body group-hover:text-primary"}`}>{window.title}</h3>
      <p className="mt-1 text-[10px] leading-snug text-muted">{window.sectorName} <span aria-hidden="true">·</span> {window.practiceLabel}</p>
      <p className="mt-2 text-[10px] leading-snug text-body"><span className={`font-semibold ${isAccent ? "text-primary" : `${tone.source} group-hover:text-primary`}`}>{SECTOR_ACTIVATION_SOURCE_LABELS[window.sourceType]}</span> <span aria-hidden="true">·</span> {window.sourceLabel}</p>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/20 pt-2 text-[10px]">
        <span className="text-muted">{window.exposedAccountCount} compte{window.exposedAccountCount > 1 ? "s" : ""}</span>
        <span className="text-muted">{date ? "Échéance" : "À dater"}</span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-body">{window.suggestedAction}</p>
    </button>
  )
}

function TimelineRail({
  windows,
  mode,
  selectedWindowId,
  interactiveWindowId,
  onSelectWindow,
  onInteractiveWindowChange,
}: {
  windows: SectorActivationWindow[]
  mode: SectorWindowsTimelineMode
  selectedWindowId: string | null | undefined
  interactiveWindowId: string | null
  onSelectWindow: (window: SectorActivationWindow) => void
  onInteractiveWindowChange: (windowId: string | null) => void
}) {
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${windows.length}, minmax(0, 1fr))`,
  }
  const expandedMinWidth = `${Math.max(48, windows.length * 14)}rem`

  return (
    <div className={mode === "expanded" ? "overflow-x-auto pb-2 [scrollbar-width:thin]" : "overflow-hidden"}>
      <div
        className="relative grid grid-rows-[auto_2rem_1rem_2rem_auto] gap-x-3"
        style={mode === "expanded" ? { ...gridStyle, minWidth: expandedMinWidth } : gridStyle}
      >
        <span aria-hidden="true" className="col-span-full row-start-3 h-px self-center bg-border/70" />
        {windows.map((window, index) => {
          const isUpper = index % 2 === 0
          const isSelected = selectedWindowId === window.id
          const isInteractive = interactiveWindowId === window.id
          const isAccent = isSelected || isInteractive
          const tone = TIMELINE_TONES[window.sourceType]
          const columnStyle: CSSProperties = { gridColumnStart: index + 1 }

          return (
            <div key={window.id} className="contents">
              <div className={isUpper ? "row-start-1" : "row-start-5"} style={columnStyle}>
                <TimelineCard
                  window={window}
                  isSelected={isSelected}
                  isInteractive={isInteractive}
                  onSelect={() => onSelectWindow(window)}
                  onInteract={() => onInteractiveWindowChange(window.id)}
                  onLeave={() => onInteractiveWindowChange(null)}
                />
              </div>
              <span
                aria-hidden="true"
                className={`${isUpper ? "row-start-2 self-end" : "row-start-4 self-start"} mx-auto h-full w-px transition-colors duration-200 motion-reduce:transition-none ${isAccent ? "bg-primary" : tone.connector}`}
                style={columnStyle}
              />
              <span
                aria-hidden="true"
                className={`row-start-3 mx-auto size-2.5 self-center rounded-full border-2 transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none ${isAccent ? "border-primary bg-primary ring-4 ring-primary/15" : `${tone.marker} bg-surface`}`}
                style={columnStyle}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SectorWindowsTimeline({
  windows,
  onSelectWindow,
  selectedWindowId,
  mode = "summary",
  onShowAll,
}: SectorWindowsTimelineProps) {
  const [interactiveWindowId, setInteractiveWindowId] = useState<string | null>(null)
  const timelineWindows = useMemo(() => sortWindows(windows), [windows])
  const timelineGroups = useMemo(() => groupWindowsByPeriod(windows), [windows])

  function handleSelectWindow(window: SectorActivationWindow) {
    onSelectWindow(window)
  }

  if (timelineWindows.length === 0) {
    return mode === "summary" ? (
      <section className="rounded-xl border border-border/30 bg-surface/30 px-5 py-10 text-center text-xs text-muted">
        Aucune fenêtre active détectée.
      </section>
    ) : <p className="py-8 text-center text-xs text-muted">Aucune fenêtre active détectée.</p>
  }

  if (mode === "expanded") {
    return (
      <div className="space-y-8">
        {timelineGroups.map((group) => (
          <section key={group.key} aria-labelledby={`sector-timeline-${group.key}`}>
            <div className="mb-3 flex items-center gap-3">
              <h3 id={`sector-timeline-${group.key}`} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-heading">{group.label}</h3>
              <span aria-hidden="true" className="h-px flex-1 bg-border/40" />
            </div>
            <TimelineRail
              windows={group.windows}
              mode={mode}
              selectedWindowId={selectedWindowId}
              interactiveWindowId={interactiveWindowId}
              onSelectWindow={handleSelectWindow}
              onInteractiveWindowChange={setInteractiveWindowId}
            />
          </section>
        ))}
      </div>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border/30 bg-surface/30">
      <div className="flex items-end justify-between gap-4 border-b border-border/30 px-5 py-4">
        <div className="space-y-1">
          <h2 className="font-heading text-sm font-bold text-heading">Fenêtres sectorielles</h2>
          <p className="text-xs text-muted">Les cinq signaux sélectionnés, positionnés par échéance.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xxs text-muted">{timelineWindows.length} jalons</span>
          {onShowAll ? (
            <button type="button" onClick={onShowAll} className="min-h-8 rounded-lg border border-border/40 bg-surface/30 px-2.5 text-[10px] font-semibold text-body transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Voir toutes
            </button>
          ) : null}
        </div>
      </div>
      <div className="px-4 py-5 lg:px-5">
        <TimelineRail
          windows={timelineWindows}
          mode={mode}
          selectedWindowId={selectedWindowId}
          interactiveWindowId={interactiveWindowId}
          onSelectWindow={handleSelectWindow}
          onInteractiveWindowChange={setInteractiveWindowId}
        />
      </div>
    </section>
  )
}

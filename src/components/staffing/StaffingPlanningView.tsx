"use client"

import React, { useMemo, useState } from "react"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { cn } from "@/lib/utils"
import type { StaffingPlanningData, StaffingPlanningMilestone } from "@/app/(app)/staffing/_data/get-staffings-planning"

interface StaffingPlanningViewProps {
  planningData: StaffingPlanningData[]
  scale?: "year" | "quarter" | "month" | "week"
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TimelineColumn = { key: string; label: string; isCurrent: boolean }
type TimelineRange = { start: Date; end: Date; totalDays: number; columns: TimelineColumn[] }

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000
const LABEL_COLUMN_WIDTH = 200
const COL_MIN_WIDTH = 80

const MILESTONE_COLORS: Record<string, string> = {
  identification: "bg-indigo-500 border-indigo-600 text-white",
  cv_sent: "bg-orange-500 border-orange-600 text-white",
  prequal: "bg-violet-500 border-violet-600 text-white",
  client_interview: "bg-pink-500 border-pink-600 text-white",
  decision: "bg-rose-500 border-rose-600 text-white",
  demarrage: "bg-teal-500 border-teal-600 text-white",
}

// ─── UTILITAIRES DE DATE ──────────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function differenceInDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)
}

function buildTimelineRange(scale: "year" | "quarter" | "month" | "week", today: Date): TimelineRange {
  const year = today.getFullYear()

  if (scale === "week") {
    const day = today.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const start = new Date(today)
    start.setDate(today.getDate() + diffToMonday)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    const columns = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      return {
        key: `d${i}`,
        label: date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }).toUpperCase(),
        isCurrent: today.getDate() === date.getDate() && today.getMonth() === date.getMonth(),
      }
    })
    return { start, end, totalDays: 7, columns }
  }

  if (scale === "month") {
    const start = new Date(year, today.getMonth(), 1)
    const end = new Date(year, today.getMonth() + 1, 0)
    const columns = Array.from({ length: 4 }, (_, i) => {
      const sDay = i * 7 + 1
      const eDay = Math.min((i + 1) * 7, end.getDate())
      return {
        key: `w${i + 1}`,
        label: `SEM ${i + 1} (${sDay}–${eDay})`,
        isCurrent: Math.floor((today.getDate() - 1) / 7) === i,
      }
    })
    return { start, end, totalDays: differenceInDays(start, end) + 1, columns }
  }

  if (scale === "quarter") {
    const quarterIndex = Math.floor(today.getMonth() / 3)
    const start = new Date(year, quarterIndex * 3, 1)
    const end = new Date(year, quarterIndex * 3 + 3, 0)
    const columns = Array.from({ length: 3 }, (_, i) => {
      const mIdx = quarterIndex * 3 + i
      const date = new Date(year, mIdx, 1)
      return {
        key: `${year}-${String(mIdx + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("fr-FR", { month: "long" }).toUpperCase(),
        isCurrent: today.getMonth() === mIdx,
      }
    })
    return { start, end, totalDays: differenceInDays(start, end) + 1, columns }
  }

  // year (default)
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const columns = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i, 1)
    return {
      key: `${year}-${String(i + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "").toUpperCase(),
      isCurrent: today.getMonth() === i,
    }
  })
  return { start, end, totalDays: differenceInDays(start, end) + 1, columns }
}

function getPercentOffset(dateStr: string, rangeStart: Date, totalDays: number): number {
  const date = new Date(dateStr)
  const diff = differenceInDays(rangeStart, date)
  return Math.max(0, Math.min(100, (diff / totalDays) * 100))
}

// ─── COMPOSANT ───────────────────────────────────────────────────────────────

export function StaffingPlanningView({ planningData, scale = "week" }: StaffingPlanningViewProps) {
  const { openStaffingDrawer } = useStaffingDrawerStore()
  const [hoveredMilestone, setHoveredMilestone] = useState<{
    m: StaffingPlanningMilestone
    fullName: string
    x: number
    y: number
  } | null>(null)

  const today = useMemo(() => startOfDay(new Date()), [])
  const range = useMemo(() => buildTimelineRange(scale, today), [scale, today])

  const todayOffset = getPercentOffset(today.toISOString(), range.start, range.totalDays)
  const showToday = todayOffset >= 0 && todayOffset <= 100

  const gridStyle = {
    gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px minmax(${range.columns.length * COL_MIN_WIDTH}px, 1fr)`,
    minWidth: `${LABEL_COLUMN_WIDTH + range.columns.length * COL_MIN_WIDTH}px`,
  }

  const colGridStyle = {
    gridTemplateColumns: `repeat(${range.columns.length}, minmax(${COL_MIN_WIDTH}px, 1fr))`,
  }

  // Filtrer les lignes qui ont au least un milestone dans la fenêtre courante
  const visibleRows = useMemo(() => {
    return planningData.filter((row) =>
      row.milestones.some((m) => {
        const d = new Date(m.date)
        return d >= range.start && d <= range.end
      })
    )
  }, [planningData, range])

  const handleMilestoneMouseEnter = (
    m: StaffingPlanningMilestone,
    fullName: string,
    e: React.MouseEvent<HTMLSpanElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredMilestone({
      m,
      fullName,
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  return (
    <div className="w-full select-none">
      <div className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface shadow-sm">
        {/* Header */}
        <div className="grid border-b border-border/80" style={gridStyle}>
          <div className="flex h-11 items-center border-r border-border bg-surface px-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Identité</span>
          </div>
          <div className="relative bg-surface">
            <div className="grid" style={colGridStyle}>
              {range.columns.map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    "flex h-11 items-center justify-center border-r border-border/70 text-[10px] font-bold tracking-[0.12em] last:border-r-0 px-1 text-center",
                    col.isCurrent ? "text-primary font-extrabold" : "text-muted"
                  )}
                >
                  {col.label}
                </div>
              ))}
            </div>
            {showToday && (
              <div
                className="absolute inset-y-0 z-20 w-px bg-danger/80"
                style={{ left: `${todayOffset}%` }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        {/* Body */}
        <div className="divide-y divide-border/60">
          {visibleRows.map((row) => {
            const visibleMilestones = row.milestones.filter((m) => {
              const d = new Date(m.date)
              return d >= range.start && d <= range.end
            })

            return (
              <div key={row.id} className="group grid min-h-[52px] hover:bg-canvas/30 transition-colors duration-150" style={gridStyle}>
                {/* Identity col */}
                <div className="flex items-center border-r border-border bg-surface px-4 py-2 min-w-0">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openStaffingDrawer(row.id)}
                      className="text-left font-bold text-xs text-heading hover:text-primary hover:underline truncate block w-full"
                    >
                      {row.fullName}
                    </button>
                    <span className="text-[9px] text-muted truncate block mt-0.5 leading-tight">
                      {row.opportunityTitle}
                    </span>
                  </div>
                </div>

                {/* Timeline col */}
                <div className="relative flex items-center bg-surface">
                  {showToday && (
                    <div
                      className="absolute inset-y-0 z-10 w-px bg-danger/10 group-hover:bg-danger/25 pointer-events-none"
                      style={{ left: `${todayOffset}%` }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="absolute inset-0 grid pointer-events-none" style={colGridStyle}>
                    {range.columns.map((col) => (
                      <div key={col.key} className="border-r border-border/40 h-full last:border-r-0" />
                    ))}
                  </div>
                  <div className="absolute h-0.5 left-4 right-4 bg-border/40 pointer-events-none" />

                  {/* Milestones */}
                  <div className="absolute inset-x-4 h-full flex items-center">
                    <div className="relative w-full h-6">
                      {visibleMilestones.map((m) => {
                        const leftPct = getPercentOffset(m.date, range.start, range.totalDays)
                        const colorClass = MILESTONE_COLORS[m.type] || "bg-muted border-border"
                        return (
                          <span
                            key={m.key}
                            style={{ left: `calc(${leftPct}% - 7px)` }}
                            onMouseEnter={(e) => handleMilestoneMouseEnter(m, row.fullName, e)}
                            onMouseLeave={() => setHoveredMilestone(null)}
                            className={cn(
                              "absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full border border-surface flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-125 z-10",
                              colorClass,
                              m.isFuture && "border-dashed"
                            )}
                          >
                            <span className="size-1 rounded-full bg-white" />
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {visibleRows.length === 0 && (
            <div className="flex h-40 items-center justify-center text-center bg-surface">
              <div>
                <p className="text-sm font-semibold text-heading">Aucun jalon sur cette période</p>
                <p className="text-xs text-muted mt-1">Changez l&apos;échelle ou les filtres pour voir des données.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredMilestone && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 w-[260px] rounded-xl bg-heading p-3.5 text-primary-fg shadow-2xl border border-border/20"
          style={{
            left: Math.max(12, Math.min(hoveredMilestone.x - 130, typeof window !== "undefined" ? window.innerWidth - 272 : 300)),
            top: hoveredMilestone.y - 110,
          }}
        >
          <p className="truncate text-xs font-bold text-primary-fg leading-tight">{hoveredMilestone.m.label}</p>
          <p className="mt-0.5 truncate text-[10px] text-primary-fg/70">{hoveredMilestone.fullName}</p>
          <div className="mt-2 pt-2 border-t border-primary-fg/10 text-[10px] text-primary-fg/80">
            <span>
              {new Date(hoveredMilestone.m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            {hoveredMilestone.m.description && (
              <p className="text-[9px] text-primary-fg/60 mt-1 italic leading-snug">{hoveredMilestone.m.description}</p>
            )}
          </div>
          <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-heading" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

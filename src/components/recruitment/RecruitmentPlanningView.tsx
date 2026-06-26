"use client"

import React, { useMemo, useState } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import {
  EntityPlanningView,
  type EntityPlanningColumn,
} from "@/components/common/EntityPlanningView"
import type {
  RecruitmentPlanningMilestone,
  RecruitmentWorkspaceRow,
} from "@/app/(app)/recruitment/_data/get-recruitment-workspace"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { cn } from "@/lib/utils"

interface RecruitmentPlanningViewProps {
  rows: RecruitmentWorkspaceRow[]
  year: number
}

type TimelineRange = {
  start: Date
  end: Date
  totalDays: number
  columns: EntityPlanningColumn[]
}

interface MilestoneConfig {
  label: string
  bgClass: string
  borderClass: string
  iconName: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const LABEL_COLUMN_WIDTH = 280
const MONTH_COLUMN_WIDTH = 90

const RECRUITMENT_LEGEND: Record<string, MilestoneConfig> = {
  identification: {
    label: "Identification",
    bgClass: "bg-blue-500",
    borderClass: "border-blue-600",
    iconName: "lightbulb",
  },
  prequalification: {
    label: "Préqualification",
    bgClass: "bg-violet-500",
    borderClass: "border-violet-600",
    iconName: "chat",
  },
  manager_interview: {
    label: "Entretien manager",
    bgClass: "bg-cyan-500",
    borderClass: "border-cyan-600",
    iconName: "user-check",
  },
  tech_test: {
    label: "Tests techniques",
    bgClass: "bg-amber-500",
    borderClass: "border-amber-600",
    iconName: "bolt",
  },
  hiring_offer: {
    label: "Proposition",
    bgClass: "bg-fuchsia-500",
    borderClass: "border-fuchsia-600",
    iconName: "document-user",
  },
  signature: {
    label: "Signature",
    bgClass: "bg-emerald-600",
    borderClass: "border-emerald-700",
    iconName: "pencil",
  },
  start: {
    label: "Démarrage",
    bgClass: "bg-teal-500",
    borderClass: "border-teal-600",
    iconName: "flag",
  },
}

function MilestoneIcon({ name }: { name: string }) {
  const cl = "h-3 w-3 text-white"

  switch (name) {
    case "lightbulb":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
        </svg>
      )
    case "chat":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      )
    case "user-check":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      )
    case "bolt":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
      )
    case "document-user":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    case "pencil":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      )
    case "flag":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
      )
    default:
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      )
  }
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function differenceInDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)
}

function buildYearRange(year: number, today: Date): TimelineRange {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const columns = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, index, 1)
    return {
      key: `${year}-${String(index + 1).padStart(2, "0")}`,
      label: date
        .toLocaleDateString("fr-FR", { month: "short" })
        .replace(".", "")
        .toUpperCase(),
      isCurrent: today.getFullYear() === year && today.getMonth() === index,
    }
  })

  return {
    start,
    end,
    totalDays: differenceInDays(start, end) + 1,
    columns,
  }
}

function getPercentOffset(date: string, range: TimelineRange) {
  return (differenceInDays(range.start, new Date(date)) / range.totalDays) * 100
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function formatTooltipDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function RecruitmentPlanningView({
  rows,
  year,
}: RecruitmentPlanningViewProps) {
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)
  const openStaffingDrawer = useStaffingDrawerStore((state) => state.openStaffingDrawer)
  const today = useMemo(() => startOfDay(new Date()), [])
  const range = useMemo(() => buildYearRange(year, today), [today, year])
  const [hoveredMilestone, setHoveredMilestone] = useState<{
    milestone: RecruitmentPlanningMilestone
    row: RecruitmentWorkspaceRow
    x: number
    y: number
  } | null>(null)

  const visibleRows = useMemo(
    () =>
      rows
        .map((row) => ({
          ...row,
          visibleMilestones: row.planningMilestones.filter((milestone) => {
            const date = new Date(milestone.date)
            return date >= range.start && date <= range.end
          }),
        }))
        .filter((row) => row.visibleMilestones.length > 0),
    [range.end, range.start, rows],
  )

  const todayOffset = getPercentOffset(today.toISOString(), range)
  const showToday = today.getFullYear() === year
  const todayLeft = `${clampPercent(todayOffset)}%`

  return (
    <div className="relative flex flex-col gap-5 select-none">
      <EntityPlanningView
        rows={visibleRows}
        columns={range.columns}
        getRowId={(row) => row.id}
        labelColumnHeader="Candidat / Besoin"
        labelColumnWidth={LABEL_COLUMN_WIDTH}
        timelineColumnMinWidth={MONTH_COLUMN_WIDTH}
        currentMarkerLeft={showToday ? todayLeft : null}
        emptyState={
          <div>
            <p className="text-sm font-semibold text-heading">Aucun planning disponible</p>
            <p className="mt-1 text-xs text-muted">
              Aucun recrutement ne possède de jalon sur cette période.
            </p>
          </div>
        }
        renderRowLabel={(row) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <CompanyLogo
              name={row.clientName || "Client"}
              logoPath={row.clientLogoPath}
              website={row.clientWebsite}
              size="sm"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <button
                type="button"
                onClick={() => openStaffingDrawer(row.id)}
                className="block max-w-full truncate text-left text-[11px] font-bold text-heading transition-colors hover:text-primary"
              >
                {row.candidateName}
              </button>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-muted">
                <span className="truncate font-semibold text-heading/70">
                  {row.currentTitle || "Profil"}
                </span>
                <span>•</span>
                <span className="truncate">{row.opportunityTitle}</span>
              </div>
            </div>
          </div>
        )}
        renderTimelineRow={(row) => {
          const first = row.visibleMilestones[0]
          const last = row.visibleMilestones[row.visibleMilestones.length - 1]
          const firstOffset = clampPercent(getPercentOffset(first.date, range))
          const lastOffset = clampPercent(getPercentOffset(last.date, range))

          return (
            <>
              {showToday ? (
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-px bg-danger/10 group-hover:bg-danger/25"
                  style={{ left: todayLeft }}
                  aria-hidden="true"
                />
              ) : null}

              <div
                className="pointer-events-none absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${range.columns.length}, minmax(${MONTH_COLUMN_WIDTH}px, 1fr))`,
                }}
              >
                {range.columns.map((column) => (
                  <div key={column.key} className="h-full border-r border-border/40 last:border-r-0" />
                ))}
              </div>

              <div className="pointer-events-none absolute left-6 right-6 h-0.5 bg-border/60" />

              {row.visibleMilestones.length > 1 ? (
                <div
                  className="pointer-events-none absolute h-0.8 bg-primary/20"
                  style={{
                    left: `calc(${firstOffset}% + 6px)`,
                    width: `calc(${lastOffset - firstOffset}% - 12px)`,
                  }}
                />
              ) : null}

              <div className="absolute inset-x-6 flex h-full items-center">
                <div className="relative h-6 w-full">
                  {row.visibleMilestones.map((milestone) => {
                    const offset = clampPercent(getPercentOffset(milestone.date, range))
                    const config = RECRUITMENT_LEGEND[milestone.type]

                    return (
                      <button
                        key={milestone.key}
                        type="button"
                        onMouseEnter={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect()
                          setHoveredMilestone({
                            milestone,
                            row,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          })
                        }}
                        onMouseLeave={() => setHoveredMilestone(null)}
                        onClick={() => {
                          if (milestone.eventId) {
                            openEventDrawer(milestone.eventId)
                            return
                          }
                          openStaffingDrawer(row.id)
                        }}
                        className={cn(
                          "absolute top-1/2 z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-transform duration-150 hover:scale-125",
                          config.bgClass,
                          config.borderClass,
                          milestone.status === "cancelled" && "opacity-40",
                        )}
                        style={{ left: `${offset}%` }}
                      >
                        <MilestoneIcon name={config.iconName} />
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )
        }}
      />

      <div className="rounded-[var(--radius-medium)] border border-border bg-surface px-5 py-4 shadow-sm">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-heading">
          Légende des jalons
        </h4>
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4 xl:grid-cols-7">
          {Object.entries(RECRUITMENT_LEGEND).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2.5 text-xs font-medium text-body">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-white shadow-sm",
                  config.bgClass,
                  config.borderClass,
                )}
              >
                <MilestoneIcon name={config.iconName} />
              </span>
              <span>{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {hoveredMilestone ? (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 w-[280px] rounded-xl border border-border/20 bg-heading p-3.5 text-primary-fg shadow-2xl transition-all duration-150"
          style={{
            left: Math.max(
              12,
              Math.min(
                hoveredMilestone.x - 140,
                typeof window !== "undefined" ? window.innerWidth - 292 : 300,
              ),
            ),
            top: hoveredMilestone.y - 128,
          }}
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold leading-tight text-primary-fg">
                {RECRUITMENT_LEGEND[hoveredMilestone.milestone.type].label}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-primary-fg/75">
                {hoveredMilestone.row.candidateName}
              </p>
              <p className="text-[9px] font-bold text-primary-fg/60">
                {hoveredMilestone.row.clientName}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em]",
                hoveredMilestone.milestone.status === "completed"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : hoveredMilestone.milestone.status === "cancelled"
                    ? "bg-danger/20 text-danger"
                    : "bg-amber-500/20 text-amber-300",
              )}
            >
              {hoveredMilestone.milestone.status === "completed"
                ? "Fait"
                : hoveredMilestone.milestone.status === "cancelled"
                  ? "Annulé"
                  : "À venir"}
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5 border-t border-primary-fg/10 pt-2 text-[10px] leading-normal text-primary-fg/85">
            <div className="flex items-center justify-between">
              <span className="text-primary-fg/60">Date :</span>
              <span className="font-semibold">
                {formatTooltipDate(hoveredMilestone.milestone.date)}
              </span>
            </div>
            <p className="text-[9px] italic leading-normal text-primary-fg/75">
              {hoveredMilestone.milestone.description || "Aucune description."}
            </p>
          </div>

          <div
            className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-heading"
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  )
}

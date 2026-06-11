"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import type { MissionPlanningRow } from "./mission-planning-types"
import { MissionTimelineLegend } from "./MissionTimelineLegend"
import { HeaderKpiCard } from "@/components/missions/HeaderKpiCard"
import {
  addDays,
  formatDateFr,
  formatEuro,
  formatPercent,
  getDaysRemaining,
  getInitials,
  getMissionProgress,
  getMissionSubtitle,
  getMissionTemporalStatus,
  getPersonName,
  getStatusCounts,
  getTimelineRange,
  parseDateOnly,
  startOfDay,
  STATUS_BADGE_CLASSES,
  STATUS_DOT_CLASSES,
  STATUS_LABELS,
} from "./mission-planning-utils"

interface MissionPlanningMobileProps {
  rows: MissionPlanningRow[]
}

function getDeadlineLabel(daysRemaining: number | null): string {
  if (daysRemaining === null) return "Fin non renseignée"
  if (daysRemaining < 0) return `Expirée depuis ${Math.abs(daysRemaining)} j`
  if (daysRemaining === 0) return "Fin aujourd'hui"
  return `${daysRemaining} j restants`
}

export function MissionPlanningMobile({ rows }: MissionPlanningMobileProps) {
  const { openTab } = useMissionsTabStore()
  const today = useMemo(() => startOfDay(new Date()), [])
  const range = useMemo(() => getTimelineRange(rows, today), [rows, today])
  const endingSoonCount = rows.filter(
    (row) => getMissionTemporalStatus(row, today) === "ending_soon"
  ).length

  const limitDate = useMemo(() => addDays(today, 21), [today])
  const arretsS3 = useMemo(() => {
    return rows.filter((row) => {
      const endDate = parseDateOnly(row.endDate)
      return endDate !== null && endDate >= today && endDate <= limitDate
    }).length
  }, [rows, today, limitDate])

  const demarragesS3 = useMemo(() => {
    return rows.filter((row) => {
      const startDate = parseDateOnly(row.startDate)
      return startDate !== null && startDate >= today && startDate <= limitDate
    }).length
  }, [rows, today, limitDate])

  const deltaS3 = demarragesS3 - arretsS3
  const formattedDeltaS3 = deltaS3 > 0 ? `+${deltaS3}` : `${deltaS3}`

  const statusCounts = useMemo(() => getStatusCounts(rows, today), [rows, today])

  return (
    <div className="flex w-full flex-col gap-4 px-4 py-5">
      <header className="border-b border-border pb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-heading text-xl font-bold tracking-tight text-heading">
            Planning
          </h1>
          <span className="shrink-0 rounded border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-heading">
            {formatDateFr(today)}
          </span>
        </div>
        <div className="flex items-center justify-around divide-x divide-border/60 w-full mt-2">
          <HeaderKpiCard label="Arrêt mission S+3" value={arretsS3} className="flex-1" valueClassName={arretsS3 > 0 ? "text-danger" : ""} />
          <HeaderKpiCard label="Démarrage S+3" value={demarragesS3} className="flex-1" valueClassName={demarragesS3 > 0 ? "text-success" : ""} />
          <HeaderKpiCard label="Delta mission S+3" value={formattedDeltaS3} className="flex-1" valueClassName={deltaS3 < 0 ? "text-warning" : ""} />
        </div>
        {endingSoonCount > 0 && (
          <div className="mt-1 rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
            {endingSoonCount} mission{endingSoonCount > 1 ? "s" : ""} à sécuriser sous 30 jours.
          </div>
        )}
      </header>

      <MissionTimelineLegend compact counts={statusCounts} />

      {rows.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-border bg-surface/60 px-5 text-center">
          <div>
            <p className="text-sm font-bold text-heading">Aucune mission active</p>
            <p className="mt-1 text-xs text-body">
              Les missions actives apparaîtront ici dès qu&apos;elles seront créées en base.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const status = getMissionTemporalStatus(row, today)
            const personName = getPersonName(row)
            const daysRemaining = getDaysRemaining(row, today)
            const progress = getMissionProgress(row, today)

            return (
              <button
                key={row.id}
                type="button"
                onClick={() =>
                  openTab({
                    entityType: "mission",
                    entityId: row.id,
                    title: row.title,
                    subtitle: `${personName} · ${row.company.name}`,
                  })
                }
                className="min-h-44 w-full rounded-lg border border-border bg-surface p-4 text-left transition-colors active:bg-surface-hover"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
                    {getInitials(personName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-heading">
                          {personName}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-medium text-body">
                          {row.company.name}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold",
                          STATUS_BADGE_CLASSES[status]
                        )}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                    </span>

                    <span className="mt-2 block text-xs text-body">
                      {getMissionSubtitle(row)}
                    </span>
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-muted">
                    <span>{formatDateFr(row.startDate)}</span>
                    <span>{row.endDate ? formatDateFr(row.endDate) : "Fin ouverte"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border/60">
                    <div
                      className={cn("h-full rounded-full", STATUS_DOT_CLASSES[status])}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                  <span className="rounded border border-border bg-canvas px-2 py-2">
                    <span className="block text-muted">TJM</span>
                    <span className="mt-0.5 block truncate font-bold tabular-nums text-heading">
                      {formatEuro(row.tjm)}
                    </span>
                  </span>
                  <span className="rounded border border-border bg-canvas px-2 py-2">
                    <span className="block text-muted">Marge</span>
                    <span className="mt-0.5 block truncate font-bold tabular-nums text-heading">
                      {formatPercent(row.grossMarginPct)}
                    </span>
                  </span>
                  <span className="rounded border border-border bg-canvas px-2 py-2">
                    <span className="block text-muted">Échéance</span>
                    <span className="mt-0.5 block truncate font-bold tabular-nums text-heading">
                      {getDeadlineLabel(daysRemaining)}
                    </span>
                  </span>
                </div>

                {status === "ending_soon" && (
                  <div className="mt-3 rounded border border-warning/20 bg-warning/10 px-3 py-2 text-[11px] font-semibold text-warning">
                    Fin proche : vérifier le renouvellement ou la sortie de mission.
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

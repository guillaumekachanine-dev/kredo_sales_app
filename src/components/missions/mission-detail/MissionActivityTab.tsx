"use client"

import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { StatusPill } from "@/components/ui/StatusPill"
import { cn } from "@/lib/utils"
import type { MissionDetailViewModel } from "./mission-detail-types"
import {
  ACTIVITY_THRESHOLDS,
  computeOverallActivityRate,
  computeYtdActivityRate,
  computeTotalBillableDays,
  computeYtdBillableDays,
  buildCraAlerts,
  getCraStatusLabel,
  getPeriodLabel,
} from "./mission-detail-utils"

const CRA_STATUS_VARIANT: Record<string, "success" | "neutral" | "danger" | "inProgress"> = {
  validated: "success",
  submitted: "inProgress",
  draft: "neutral",
  rejected: "danger",
}

interface ActivityBarProps {
  billable: number
  nonBillable: number
  pto: number
  sick: number
  total: number
}

function ActivityBar({ billable, nonBillable, pto, sick, total }: ActivityBarProps) {
  if (total <= 0) return <div className="h-2 rounded bg-border w-full" />
  const billablePct = Math.round((billable / total) * 100)
  const nonBillablePct = Math.round((nonBillable / total) * 100)
  const ptoPct = Math.round((pto / total) * 100)
  const sickPct = Math.round((sick / total) * 100)

  return (
    <div className="flex h-2 rounded overflow-hidden w-full bg-border/40">
      <div
        className="bg-primary transition-all"
        style={{ width: `${billablePct}%` }}
        title={`Facturable : ${billable}j`}
      />
      <div
        className="bg-dataviz-3 transition-all"
        style={{ width: `${nonBillablePct}%` }}
        title={`Non facturable : ${nonBillable}j`}
      />
      <div
        className="bg-dataviz-2 transition-all"
        style={{ width: `${ptoPct}%` }}
        title={`Congés : ${pto}j`}
      />
      <div
        className="bg-danger/60 transition-all"
        style={{ width: `${sickPct}%` }}
        title={`Maladie : ${sick}j`}
      />
    </div>
  )
}

function ActivityRateGauge({ rate }: { rate: number }) {
  const isLow = rate < ACTIVITY_THRESHOLDS.LOW
  const isTarget = rate >= ACTIVITY_THRESHOLDS.TARGET
  const color = isLow ? "text-danger" : isTarget ? "text-success" : "text-warning"
  const barColor = isLow ? "bg-danger" : isTarget ? "bg-success" : "bg-warning"
  const pct = Math.min(100, Math.max(0, rate))

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <span className={cn("text-3xl font-bold font-mono", color)}>
          {rate.toFixed(0)}%
        </span>
        <span className="text-[10px] text-muted mb-1">
          Cible : {ACTIVITY_THRESHOLDS.TARGET}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Threshold marker */}
      <div className="relative h-0">
        <div
          className="absolute top-0 w-0.5 h-2 -translate-y-2 bg-muted/40 rounded"
          style={{ left: `${ACTIVITY_THRESHOLDS.TARGET}%` }}
          title={`Seuil cible : ${ACTIVITY_THRESHOLDS.TARGET}%`}
        />
      </div>
    </div>
  )
}

interface MissionActivityTabProps {
  vm: MissionDetailViewModel
}

export function MissionActivityTab({ vm }: MissionActivityTabProps) {
  const { activityReports } = vm

  const overallRate = computeOverallActivityRate(activityReports)
  const ytdRate = computeYtdActivityRate(activityReports)
  const totalBillable = computeTotalBillableDays(activityReports)
  const ytdBillable = computeYtdBillableDays(activityReports)
  const alerts = buildCraAlerts(activityReports)

  const totalPto = activityReports.reduce((s, r) => s + r.pto_days, 0)
  const totalSick = activityReports.reduce((s, r) => s + r.sick_days, 0)
  const totalNonBillable = activityReports.reduce((s, r) => s + r.non_billable_days, 0)

  const sortedReports = [...activityReports].sort(
    (a, b) => b.period_start.localeCompare(a.period_start)
  )

  if (activityReports.length === 0) {
    return (
      <SurfaceCard className="p-5">
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <svg className="w-8 h-8 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-xs text-muted italic">{"Aucun compte rendu d'activité saisi."}</p>
        </div>
      </SurfaceCard>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-2.5 p-3 rounded border text-xs",
                alert.severity === "danger"
                  ? "bg-danger/5 border-danger/20 text-danger"
                  : "bg-warning/5 border-warning/20 text-warning"
              )}
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SurfaceCard className="!p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
            Taux global
          </span>
          {overallRate !== null ? (
            <ActivityRateGauge rate={overallRate} />
          ) : (
            <span className="text-2xl font-bold font-mono text-muted">—</span>
          )}
        </SurfaceCard>

        <SurfaceCard className="!p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
            Taux YTD
          </span>
          {ytdRate !== null ? (
            <ActivityRateGauge rate={ytdRate} />
          ) : (
            <span className="text-2xl font-bold font-mono text-muted">—</span>
          )}
        </SurfaceCard>

        <SurfaceCard className="!p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
            Jours produits (total)
          </span>
          <span className="text-3xl font-bold font-mono text-heading">{totalBillable}</span>
          <span className="text-[10px] text-muted">jours facturés</span>
        </SurfaceCard>

        <SurfaceCard className="!p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
            Jours produits YTD
          </span>
          <span className="text-3xl font-bold font-mono text-heading">{ytdBillable}</span>
          <span className="text-[10px] text-muted">jours facturés</span>
        </SurfaceCard>
      </div>

      {/* Absence summary */}
      <div className="grid grid-cols-3 gap-3">
        <SurfaceCard className="!p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
            Congés (CP/RTT)
          </span>
          <span className="text-xl font-bold font-mono text-heading">{totalPto}j</span>
        </SurfaceCard>
        <SurfaceCard className="!p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
            Maladie / Absence
          </span>
          <span className={cn("text-xl font-bold font-mono", totalSick >= ACTIVITY_THRESHOLDS.SICK_ALERT ? "text-danger" : "text-heading")}>
            {totalSick}j
          </span>
        </SurfaceCard>
        <SurfaceCard className="!p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
            Non facturable
          </span>
          <span className={cn("text-xl font-bold font-mono", totalNonBillable >= ACTIVITY_THRESHOLDS.NON_BILLABLE_ALERT ? "text-warning" : "text-heading")}>
            {totalNonBillable}j
          </span>
        </SurfaceCard>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { color: "bg-primary", label: "Facturable" },
          { color: "bg-dataviz-3", label: "Non facturable" },
          { color: "bg-dataviz-2", label: "Congés" },
          { color: "bg-danger/60", label: "Maladie" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className={cn("w-2.5 h-2.5 rounded-sm", item.color)} />
            {item.label}
          </div>
        ))}
      </div>

      {/* CRA table */}
      <SurfaceCard className="p-5 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-heading">Historique des CRA</h3>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border/60">
                {["Période", "Statut", "Facturable", "Non fact.", "Congés", "Maladie", "Ouvrés", "Taux", ""].map((h) => (
                  <th key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted text-left pb-2 pr-3 last:pr-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedReports.map((report) => {
                const rate = report.activity_rate_percent
                const rateColor =
                  rate === null
                    ? "text-muted"
                    : rate < ACTIVITY_THRESHOLDS.LOW
                    ? "text-danger"
                    : rate < ACTIVITY_THRESHOLDS.TARGET
                    ? "text-warning"
                    : "text-success"
                const variant = CRA_STATUS_VARIANT[report.status] ?? "neutral"
                return (
                  <tr key={report.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2.5 pr-3 text-xs font-semibold text-heading whitespace-nowrap">
                      {getPeriodLabel(report.period_start)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusPill
                        label={getCraStatusLabel(report.status)}
                        variant={variant}
                        dot
                      />
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-mono text-heading text-right">
                      {report.billable_days}j
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-mono text-right">
                      <span className={report.non_billable_days >= ACTIVITY_THRESHOLDS.NON_BILLABLE_ALERT ? "text-warning" : "text-muted"}>
                        {report.non_billable_days}j
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-mono text-muted text-right">
                      {report.pto_days}j
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-mono text-right">
                      <span className={report.sick_days >= ACTIVITY_THRESHOLDS.SICK_ALERT ? "text-danger" : "text-muted"}>
                        {report.sick_days}j
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-mono text-muted text-right">
                      {report.business_days}j
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <span className={cn("text-xs font-bold font-mono", rateColor)}>
                        {rate !== null ? `${rate.toFixed(0)}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <ActivityBar
                        billable={report.billable_days}
                        nonBillable={report.non_billable_days}
                        pto={report.pto_days}
                        sick={report.sick_days}
                        total={report.business_days || (report.billable_days + report.non_billable_days + report.pto_days + report.sick_days)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  )
}

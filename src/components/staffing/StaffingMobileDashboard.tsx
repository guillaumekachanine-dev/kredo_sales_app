import { HeaderAlerts } from "@/components/ui/HeaderAlerts"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { StaffingDashboardData, StaffingStatus, WeeklyStaffingDeadline } from "@/lib/staffing/staffing-data"

function toneClasses(status: StaffingStatus) {
  return {
    success: "border-success/20 bg-success/10 text-success",
    warning: "border-warning/25 bg-warning/10 text-warning",
    danger: "border-danger/25 bg-danger/10 text-danger",
    neutral: "border-border bg-canvas text-muted",
  }[status]
}

function barClasses(status: StaffingStatus) {
  return {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    neutral: "bg-primary",
  }[status]
}

function groupDeadlinesByDay(deadlines: WeeklyStaffingDeadline[]) {
  return deadlines.reduce<Record<string, WeeklyStaffingDeadline[]>>((acc, deadline) => {
    const key = deadline.shortDateLabel
    acc[key] = [...(acc[key] ?? []), deadline]
    return acc
  }, {})
}

export function StaffingMobileDashboard({ data }: { data: StaffingDashboardData }) {
  const deadlinesByDay = groupDeadlinesByDay(data.weeklyDeadlines)

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-canvas px-4 py-5 pb-24">
      <header className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Staffing</p>
          <h1 className="truncate font-heading text-lg font-bold text-heading">Synthèse</h1>
        </div>

        <div className="flex items-center gap-3">
          <HeaderCalendar />
          <HeaderAlerts />
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-primary text-[10px] font-bold text-white">
            GK
          </div>
        </div>
      </header>

      <section>
        <p className="mb-2 text-[11px] font-medium text-body">
          Données au {data.asOfLabel} · {data.sourceNote}
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {data.kpis.map((kpi) => (
            <SurfaceCard key={kpi.id} className="min-h-36 w-44 shrink-0 p-3.5">
              <div className="flex h-full flex-col justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{kpi.label}</p>
                  <p className="mt-3 font-heading text-2xl font-bold text-heading">{kpi.value}</p>
                </div>
                <div>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", toneClasses(kpi.status))}>
                    {kpi.detail}
                  </span>
                  <p className="mt-2 text-[11px] leading-snug text-body">{kpi.description}</p>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <SurfaceCard className="p-4">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-heading">Étapes à date</h2>
          <p className="mt-1 text-[11px] text-muted">Positionnements sur besoins ouverts.</p>
        </div>

        <div className="flex flex-col gap-3">
          {data.stageDistribution.length === 0 ? (
            <p className="rounded-lg border border-border bg-canvas px-3 py-6 text-center text-xs text-muted">
              Aucun positionnement actif.
            </p>
          ) : (
            data.stageDistribution.map((stage) => (
              <div key={stage.key}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-heading">{stage.label}</p>
                  <p className="font-mono text-xs font-bold text-heading">{stage.count}</p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-canvas">
                  <div className={cn("h-full rounded-full", barClasses(stage.status))} style={{ width: `${Math.max(stage.share, 4)}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-heading">Origines</h2>
          <p className="mt-1 text-[11px] text-muted">Candidats poussés sur les besoins.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {data.originDistribution.length === 0 ? (
            <p className="col-span-2 rounded-lg border border-border bg-canvas px-3 py-6 text-center text-xs text-muted">
              Aucune origine disponible.
            </p>
          ) : (
            data.originDistribution.map((origin) => (
              <div key={origin.key} className="rounded-lg border border-border/70 bg-canvas/35 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold leading-snug text-heading">{origin.label}</p>
                  <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-bold", toneClasses(origin.status))}>
                    {origin.count}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                  <div className={cn("h-full rounded-full", barClasses(origin.status))} style={{ width: `${Math.max(origin.share, 4)}%` }} />
                </div>
                <p className="mt-1 text-right text-[10px] font-semibold text-muted">{origin.share}%</p>
              </div>
            ))
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-heading">Planning semaine</h2>
            <p className="mt-1 text-[11px] text-muted">{data.weeklyDeadlines.length} échéance(s) staffing.</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.weekDays.map((day) => {
            const dayDeadlines = deadlinesByDay[day.shortDateLabel] ?? []
            return (
              <div key={day.date} className="min-h-44 w-36 shrink-0 rounded-lg border border-border/70 bg-canvas/35 p-2.5">
                <div className="mb-3">
                  <p className="text-[11px] font-bold uppercase text-heading">{day.dayLabel}</p>
                  <p className="text-[10px] font-semibold text-muted">{day.shortDateLabel}</p>
                </div>

                <div className="flex flex-col gap-2">
                  {dayDeadlines.length === 0 ? (
                    <span className="rounded border border-border/60 bg-surface px-2 py-2 text-[10px] text-muted">Libre</span>
                  ) : (
                    dayDeadlines.map((deadline) => (
                      <div key={deadline.id} className={cn("rounded-md border p-2", toneClasses(deadline.status))}>
                        <p className="text-[10px] font-bold uppercase">{deadline.type}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-heading">{deadline.title}</p>
                        <p className="mt-1 truncate text-[10px] text-body">{deadline.company}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <div className="mb-2">
          <h2 className="text-sm font-bold text-heading">3 priorités du moment</h2>
        </div>

        <div className="flex flex-col divide-y divide-border/70">
          {data.priorities.map((priority) => (
            <div key={priority.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold", toneClasses(priority.status))}>
                {priority.rank}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-heading">{priority.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">{priority.company}</p>
                  </div>
                  <span className="shrink-0 rounded border border-border bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                    {priority.dueLabel}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-body">{priority.reason}</p>
                <p className="mt-2 text-[11px] font-bold text-primary">{priority.action}</p>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  )
}

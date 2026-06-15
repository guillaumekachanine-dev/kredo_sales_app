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

export function StaffingDesktopDashboard({ data }: { data: StaffingDashboardData }) {
  const deadlinesByDay = groupDeadlinesByDay(data.weeklyDeadlines)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 bg-canvas px-6 py-6">
      <header className="flex items-start justify-between border-b border-border/70 pb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Staffing</p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-heading">
            Synthèse des besoins ouverts
          </h1>
          <p className="mt-1 text-xs font-medium text-body">
            Données au {data.asOfLabel} · {data.sourceNote}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <HeaderCalendar />
          <HeaderAlerts />
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-primary text-xs font-bold text-white">
            GK
          </div>
        </div>
      </header>

      <section className="grid grid-cols-4 gap-4">
        {data.kpis.map((kpi) => (
          <SurfaceCard key={kpi.id} className="p-4">
            <div className="flex min-h-28 flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{kpi.label}</p>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", toneClasses(kpi.status))}>
                    {kpi.detail}
                  </span>
                </div>
                <p className="mt-3 font-heading text-3xl font-bold tracking-tight text-heading">{kpi.value}</p>
              </div>
              <p className="text-xs leading-relaxed text-body">{kpi.description}</p>
            </div>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid grid-cols-12 gap-5">
        <SurfaceCard className="col-span-7 p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-heading">Répartition par étape</h2>
              <p className="mt-1 text-xs text-muted">Positionnements rattachés aux besoins ouverts.</p>
            </div>
            <span className="rounded-md border border-border bg-canvas px-2 py-1 text-[11px] font-semibold text-muted">
              {data.stageDistribution.reduce((sum, item) => sum + item.count, 0)} profils
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {data.stageDistribution.length === 0 ? (
              <p className="rounded-lg border border-border bg-canvas px-3 py-8 text-center text-xs text-muted">
                Aucun positionnement actif sur les besoins ouverts.
              </p>
            ) : (
              data.stageDistribution.map((stage) => (
                <div key={stage.key} className="grid grid-cols-[150px_1fr_70px] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-heading">{stage.label}</p>
                    <p className="text-[10px] text-muted">{stage.count} profil(s)</p>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-canvas">
                    <div className={cn("h-full rounded-full", barClasses(stage.status))} style={{ width: `${Math.max(stage.share, 4)}%` }} />
                  </div>
                  <p className="text-right font-mono text-xs font-bold text-heading">{stage.share}%</p>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="col-span-5 p-5">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-heading">Origine des candidats poussés</h2>
            <p className="mt-1 text-xs text-muted">Lecture consolidée de `candidates.source`.</p>
          </div>

          <div className="flex flex-col gap-3">
            {data.originDistribution.length === 0 ? (
              <p className="rounded-lg border border-border bg-canvas px-3 py-8 text-center text-xs text-muted">
                Aucune origine disponible.
              </p>
            ) : (
              data.originDistribution.map((origin) => (
                <div key={origin.key} className="rounded-lg border border-border/70 bg-canvas/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-heading">{origin.label}</p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", toneClasses(origin.status))}>
                      {origin.count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div className={cn("h-full rounded-full", barClasses(origin.status))} style={{ width: `${Math.max(origin.share, 4)}%` }} />
                  </div>
                  <p className="mt-1 text-right text-[10px] font-semibold text-muted">{origin.share}% du flux</p>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </section>

      <section className="grid grid-cols-12 gap-5">
        <SurfaceCard className="col-span-8 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-heading">Échéances et priorités de la semaine</h2>
              <p className="mt-1 text-xs text-muted">Actions staffing datées sur la semaine courante.</p>
            </div>
            <span className="rounded-md border border-border bg-canvas px-2 py-1 text-[11px] font-semibold text-muted">
              {data.weeklyDeadlines.length} échéance(s)
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {data.weekDays.map((day) => {
              const dayDeadlines = deadlinesByDay[day.shortDateLabel] ?? []
              return (
                <div key={day.date} className="min-h-52 rounded-lg border border-border/70 bg-canvas/35 p-2">
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

        <SurfaceCard className="col-span-4 p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-heading">Top 3 priorités du moment</h2>
            <p className="mt-1 text-xs text-muted">Score calculé sur urgence, couverture et démarrage cible.</p>
          </div>

          <div className="flex flex-col divide-y divide-border/70">
            {data.priorities.map((priority) => (
              <div key={priority.id} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold", toneClasses(priority.status))}>
                  {priority.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-heading">{priority.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">{priority.company} · {priority.practice}</p>
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
      </section>
    </div>
  )
}

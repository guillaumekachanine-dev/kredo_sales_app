"use client"

import { useMemo, useState } from "react"
import { HeaderAlerts } from "@/components/ui/HeaderAlerts"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"

import type {
  StaffingDashboardData,
  StaffingKpi,
  StaffingNeedSnapshot,
  StaffingOriginBucket,
  StaffingPositioningDetail,
  StaffingPriority,
  StaffingStageBucket,
  StaffingStatus,
  WeeklyStaffingDeadline,
} from "@/lib/staffing/staffing-data"

type ToneStyle = {
  border: string
  soft: string
  text: string
  fill: string
}

type TaskDrawerState = {
  open: boolean
  dayLabel?: string
}

const toneStyles: Record<StaffingStatus, ToneStyle> = {
  success: {
    border: "border-success/25",
    soft: "bg-success/10",
    text: "text-success",
    fill: "bg-success",
  },
  warning: {
    border: "border-warning/25",
    soft: "bg-warning/10",
    text: "text-warning",
    fill: "bg-warning",
  },
  danger: {
    border: "border-danger/25",
    soft: "bg-danger/10",
    text: "text-danger",
    fill: "bg-danger",
  },
  neutral: {
    border: "border-primary/20",
    soft: "bg-primary/10",
    text: "text-primary",
    fill: "bg-primary",
  },
}

const statusLabels: Record<StaffingStatus, string> = {
  success: "Contrôle",
  warning: "Surveiller",
  danger: "Traiter",
  neutral: "Qualifier",
}

function groupDeadlinesByDay(deadlines: WeeklyStaffingDeadline[]) {
  return deadlines.reduce<Record<string, WeeklyStaffingDeadline[]>>((acc, deadline) => {
    const key = deadline.shortDateLabel
    acc[key] = [...(acc[key] ?? []), deadline]
    return acc
  }, {})
}

function getStatusTone(status: StaffingStatus) {
  return toneStyles[status]
}

function getCountTotal<T extends { count: number }>(items: T[]) {
  return items.reduce((sum, item) => sum + item.count, 0)
}

export function StaffingMobileDashboard({ data }: { data: StaffingDashboardData }) {
  const [activeStageKey, setActiveStageKey] = useState<string | null>(data.stageDistribution[0]?.key ?? null)
  const [selectedNeed, setSelectedNeed] = useState<StaffingNeedSnapshot | null>(null)
  const [staffingNeed, setStaffingNeed] = useState<StaffingNeedSnapshot | null>(null)
  const [taskDrawer, setTaskDrawer] = useState<TaskDrawerState>({ open: false })

  const deadlinesByDay = useMemo(() => groupDeadlinesByDay(data.weeklyDeadlines), [data.weeklyDeadlines])
  const stageTotal = getCountTotal(data.stageDistribution)
  const stageMax = Math.max(1, ...data.stageDistribution.map((stage) => stage.count))
  const originMax = Math.max(1, ...data.originDistribution.map((origin) => origin.count))
  const activeStage = data.stageDistribution.find((stage) => stage.key === activeStageKey) ?? data.stageDistribution[0] ?? null
  const activePositioningDetails = activeStage
    ? data.positioningDetails.filter((detail) => detail.stageKey === activeStage.key)
    : []

  function openStaffingFromNeed(need: StaffingNeedSnapshot) {
    setSelectedNeed(null)
    setStaffingNeed(need)
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-canvas px-4 py-5 pb-24">
      <header className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Staffing</p>
          <h1 className="truncate font-heading text-xl font-bold text-heading">Cockpit staffing</h1>
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
        <p className="mb-3 text-[11px] font-medium text-body">
          Données au {data.asOfLabel} - {data.sourceNote}
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {data.kpis.map((kpi) => (
            <MobileKpiCard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </section>

      <SurfaceCard className="p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-heading">Pipeline</h2>
            <p className="mt-1 text-[11px] text-muted">{stageTotal} profil(s). Touchez une étape.</p>
          </div>
        </div>

        <MobileStageFlow
          stages={data.stageDistribution}
          maxCount={stageMax}
          activeStageKey={activeStage?.key ?? null}
          onStageSelect={setActiveStageKey}
        />
        <MobilePositioningDetailPanel stage={activeStage} details={activePositioningDetails} />
      </SurfaceCard>

      <MobileNeedCoveragePanel data={data} onNeedSelect={setSelectedNeed} />

      <SurfaceCard className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-heading">Semaine active</h2>
            <p className="mt-1 text-[11px] text-muted">{data.weeklyDeadlines.length} échéance(s) staffing.</p>
          </div>
          <button
            type="button"
            onClick={() => setTaskDrawer({ open: true })}
            className="rounded-lg bg-heading px-3 py-2 text-[11px] font-bold text-primary-fg shadow-sm"
          >
            + tâche
          </button>
        </div>

        <div className="space-y-3">
          {data.weekDays.map((day) => {
            const dayDeadlines = deadlinesByDay[day.shortDateLabel] ?? []
            return (
              <div key={day.date} className="grid grid-cols-[54px_1fr] gap-3 rounded-lg border border-border/70 bg-canvas/35 p-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-heading">{day.dayLabel}</p>
                  <p className="mt-1 text-[10px] font-semibold text-muted">{day.shortDateLabel}</p>
                  <button
                    type="button"
                    onClick={() => setTaskDrawer({ open: true, dayLabel: day.shortDateLabel })}
                    className="mt-2 rounded-full border border-border bg-surface px-2 py-1 text-[10px] font-bold text-muted"
                  >
                    +
                  </button>
                </div>
                <div className="space-y-2">
                  {dayDeadlines.length === 0 ? (
                    <span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-muted">
                      Libre
                    </span>
                  ) : (
                    dayDeadlines.map((deadline) => {
                      const tone = getStatusTone(deadline.status)
                      return (
                        <div key={deadline.id} className={cn("rounded-lg border bg-surface px-3 py-2", tone.border)}>
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("text-[10px] font-bold uppercase tracking-[0.12em]", tone.text)}>{deadline.type}</p>
                            <span className="text-[10px] font-semibold text-muted">{deadline.priority}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] font-bold text-heading">{deadline.title}</p>
                          <p className="mt-0.5 truncate text-[10px] text-body">{deadline.company}</p>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-heading">Dossiers à débloquer</h2>
          <p className="mt-1 text-[11px] text-muted">Actions prioritaires du moment.</p>
        </div>

        <div className="space-y-3">
          {data.priorities.map((priority) => (
            <MobilePriority key={priority.id} priority={priority} />
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-heading">Sources candidates</h2>
          <p className="mt-1 text-[11px] text-muted">Poids relatif des canaux de sourcing.</p>
        </div>

        <MobileSourceConstellation origins={data.originDistribution} maxCount={originMax} />
      </SurfaceCard>

      <NeedDetailDrawer
        need={selectedNeed}
        onOpenChange={(open) => {
          if (!open) setSelectedNeed(null)
        }}
        onCreateStaffing={openStaffingFromNeed}
      />
      <CreateStaffingDrawer
        need={staffingNeed}
        onOpenChange={(open) => {
          if (!open) setStaffingNeed(null)
        }}
      />
      <CreateTaskDrawer
        open={taskDrawer.open}
        dayLabel={taskDrawer.dayLabel}
        onOpenChange={(open) => setTaskDrawer((current) => ({ ...current, open }))}
      />
    </div>
  )
}

function MobileKpiCard({ kpi }: { kpi: StaffingKpi }) {
  const tone = getStatusTone(kpi.status)

  return (
    <SurfaceCard className="group min-h-40 w-52 shrink-0 p-3.5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="max-w-36 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{kpi.label}</p>
            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full transition-transform duration-300 group-hover:scale-150", tone.fill)} />
          </div>
          <p className="mt-4 font-heading text-3xl font-bold leading-none tracking-tight text-heading">
            {kpi.value}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className={cn("h-px w-7", tone.fill)} />
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.12em]", tone.text)}>
              {statusLabels[kpi.status]}
            </span>
          </div>
          <p className="text-[11px] leading-snug text-body">
            <span className="font-semibold text-heading">{kpi.detail}</span> - {kpi.description}
          </p>
        </div>
      </div>
    </SurfaceCard>
  )
}

function MobileStageFlow({
  stages,
  maxCount,
  activeStageKey,
  onStageSelect,
}: {
  stages: StaffingStageBucket[]
  maxCount: number
  activeStageKey: string | null
  onStageSelect: (stageKey: string) => void
}) {
  if (stages.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-canvas px-3 py-6 text-center text-xs text-muted">
        Aucun positionnement actif.
      </p>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {stages.map((stage, index) => {
        const tone = getStatusTone(stage.status)
        const height = 36 + Math.round((stage.count / maxCount) * 58)
        const active = stage.key === activeStageKey

        return (
          <button
            key={stage.key}
            type="button"
            onClick={() => onStageSelect(stage.key)}
            aria-expanded={active}
            className={cn(
              "flex min-h-40 w-32 shrink-0 flex-col justify-between rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/35",
              active ? "border-heading bg-surface shadow-sm" : "border-border/70 bg-canvas/35"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black", tone.soft, tone.text)}>
                {index + 1}
              </span>
              <span className="text-[11px] font-bold text-heading">{stage.share}%</span>
            </div>
            <div className="mt-3 flex flex-1 items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold leading-snug text-heading">{stage.label}</p>
                <p className="mt-1 text-[10px] text-muted">{stage.count} profil(s)</p>
              </div>
              <div className="flex h-24 w-4 items-end rounded-full bg-surface">
                <div className={cn("w-full rounded-full", tone.fill)} style={{ height }} />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function MobilePositioningDetailPanel({
  stage,
  details,
}: {
  stage: StaffingStageBucket | null
  details: StaffingPositioningDetail[]
}) {
  const openStaffingDrawer = useStaffingDrawerStore((state) => state.openStaffingDrawer)

  if (!stage) return null
  const tone = getStatusTone(stage.status)

  return (
    <div className={cn("mt-3 rounded-lg border bg-canvas/35", tone.border)}>
      <div className="border-b border-border/70 bg-surface px-3 py-2">
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", tone.text)}>Détails</p>
        <p className="mt-0.5 text-xs font-bold text-heading">{stage.label}</p>
      </div>
      <div className="divide-y divide-border/70">
        {details.length === 0 ? (
          <p className="px-3 py-5 text-center text-xs text-muted">Aucun détail disponible.</p>
        ) : (
          details.map((detail) => (
            <button
              key={detail.id}
              type="button"
              onClick={() => openStaffingDrawer(detail.id)}
              className="w-full text-left px-3 py-3 hover:bg-surface-hover transition duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-heading">{detail.candidateName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">{detail.clientName}</p>
                </div>
                <p className="text-xs font-bold text-heading">{detail.tjmLabel}</p>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] text-body">{detail.needTitle}</p>
              <p className="mt-1 text-[10px] font-semibold text-muted">Démarrage {detail.startDateLabel}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}


function MobileNeedCoveragePanel({
  data,
  onNeedSelect,
}: {
  data: StaffingDashboardData
  onNeedSelect: (need: StaffingNeedSnapshot) => void
}) {
  return (
    <SurfaceCard className="overflow-hidden border-primary/20 bg-surface p-0 text-heading">
      <div className="relative p-4">
        <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-heading" aria-hidden="true" />
        <div className="absolute right-0 top-0 h-20 w-28 border-l border-primary/10 bg-primary/10" aria-hidden="true" />
        <div className="relative mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">À couvrir</p>
            <h2 className="mt-1 text-base font-bold text-heading">Besoins ouverts</h2>
            <p className="mt-1 text-[11px] text-body">Touchez une ligne pour ouvrir le drawer.</p>
          </div>
          <span className="rounded-lg bg-heading px-2.5 py-1.5 font-heading text-2xl font-bold text-primary-fg">
            {data.openNeeds.length}
          </span>
        </div>

        <div className="relative space-y-2">
          {data.openNeeds.slice(0, 5).map((need, index) => (
            <button
              key={need.id}
              type="button"
              onClick={() => onNeedSelect(need)}
              className="grid w-full grid-cols-[24px_1fr_auto] items-center gap-2 rounded-lg border border-border bg-canvas/70 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-surface-hover"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-heading text-[10px] font-black text-primary-fg">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-heading">{need.title}</span>
                <span className="mt-0.5 block truncate text-[11px] text-body">{need.company}</span>
              </span>
              <span className="text-right">
                <span className="block text-xs font-bold text-heading">{need.coverageLabel}</span>
                <span className="block text-[10px] text-muted">{need.targetDailyRateLabel}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </SurfaceCard>
  )
}

function MobileSourceConstellation({ origins, maxCount }: { origins: StaffingOriginBucket[]; maxCount: number }) {
  if (origins.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-canvas px-3 py-6 text-center text-xs text-muted">
        Aucune origine disponible.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {origins.map((origin) => {
        const tone = getStatusTone(origin.status)
        const size = 58 + Math.round((origin.count / maxCount) * 34)

        return (
          <div key={origin.key} className={cn("relative min-h-32 overflow-hidden rounded-lg border bg-canvas/40 p-3", tone.border)}>
            <div className={cn("absolute -right-5 -top-5 rounded-full opacity-15", tone.fill)} style={{ height: size, width: size }} aria-hidden="true" />
            <p className="relative text-[11px] font-bold leading-snug text-heading">{origin.label}</p>
            <div className="relative mt-7 flex items-end justify-between">
              <p className="font-heading text-2xl font-bold text-heading">{origin.count}</p>
              <p className="text-[10px] font-semibold text-muted">{origin.share}%</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MobilePriority({ priority }: { priority: StaffingPriority }) {
  const tone = getStatusTone(priority.status)

  return (
    <div className={cn("rounded-lg border bg-canvas/35 p-3", tone.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", tone.text)}>Priorité #{priority.rank}</p>
          <p className="mt-1 line-clamp-2 text-xs font-bold text-heading">{priority.title}</p>
          <p className="mt-1 truncate text-[11px] text-muted">{priority.company}</p>
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black", tone.soft, tone.text)}>
          {priority.score}
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-body">{priority.reason}</p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
        <p className="text-[11px] font-bold text-primary">{priority.action}</p>
        <span className="shrink-0 rounded border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-muted">
          {priority.dueLabel}
        </span>
      </div>
    </div>
  )
}

function NeedDetailDrawer({
  need,
  onOpenChange,
  onCreateStaffing,
}: {
  need: StaffingNeedSnapshot | null
  onOpenChange: (open: boolean) => void
  onCreateStaffing: (need: StaffingNeedSnapshot) => void
}) {
  return (
    <AppDrawer
      open={Boolean(need)}
      onOpenChange={onOpenChange}
      title={need?.title ?? "Besoin"}
      subtitle={need ? `${need.company} - ${need.practice}` : undefined}
      side="bottom"
      footer={
        need ? (
          <>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-body">
              Fermer
            </button>
            <button type="button" onClick={() => onCreateStaffing(need)} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-fg">
              + créer un staffing
            </button>
          </>
        ) : null
      }
    >
      {need && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <DrawerMetric label="Etape" value={need.stage} />
            <DrawerMetric label="Priorité" value={need.priority} />
            <DrawerMetric label="Démarrage" value={need.startDateLabel} />
            <DrawerMetric label="TJM cible" value={need.targetDailyRateLabel} />
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-sm font-bold text-heading">Couverture</h3>
            <p className="mt-2 text-xs text-body">{need.coverageLabel} positionné(s) sur ce besoin.</p>
            <p className="mt-3 text-xs font-bold text-primary">{need.actionLabel}</p>
          </div>
        </div>
      )}
    </AppDrawer>
  )
}

function CreateStaffingDrawer({
  need,
  onOpenChange,
}: {
  need: StaffingNeedSnapshot | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AppDrawer
      open={Boolean(need)}
      onOpenChange={onOpenChange}
      title="+ créer un staffing"
      subtitle={need?.title}
      side="bottom"
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-body">
            Annuler
          </button>
          <button type="button" className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-fg opacity-80">
            Creer
          </button>
        </>
      }
    >
      {need && (
        <div className="space-y-4">
          <MockInput label="Besoin" value={need.title} />
          <MockInput label="Client" value={need.company} />
          <MockInput label="TJM cible" value={need.targetDailyRateLabel} />
          <MockInput label="Premier statut" value="Identifie" />
        </div>
      )}
    </AppDrawer>
  )
}

function CreateTaskDrawer({
  open,
  dayLabel,
  onOpenChange,
}: {
  open: boolean
  dayLabel?: string
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="+ ajouter une tâche"
      subtitle={dayLabel ? `Cible ${dayLabel}` : "Semaine active"}
      side="bottom"
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-body">
            Annuler
          </button>
          <button type="button" className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-fg opacity-80">
            Ajouter
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <MockInput label="Type de tâche" value="Relance staffing" />
        <MockInput label="Date cible" value={dayLabel ?? "Cette semaine"} />
        <MockInput label="Responsable" value="Equipe staffing" />
      </div>
    </AppDrawer>
  )
}

function DrawerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-canvas px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-xs font-bold text-heading">{value}</p>
    </div>
  )
}

function MockInput({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
      <input
        className="mt-2 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-xs font-semibold text-heading outline-none focus:ring-2 focus:ring-primary/30"
        defaultValue={value}
      />
    </label>
  )
}

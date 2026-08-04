"use client"

import { useMemo, useState } from "react"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { DrawerSection } from "@/components/ui/DrawerSection"
import { Button } from "@/components/ui/Button"
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
  glow: string
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
    glow: "shadow-success/10",
  },
  warning: {
    border: "border-warning/25",
    soft: "bg-warning/10",
    text: "text-warning",
    fill: "bg-warning",
    glow: "shadow-warning/10",
  },
  danger: {
    border: "border-danger/25",
    soft: "bg-danger/10",
    text: "text-danger",
    fill: "bg-danger",
    glow: "shadow-danger/10",
  },
  neutral: {
    border: "border-primary/20",
    soft: "bg-primary/10",
    text: "text-primary",
    fill: "bg-primary",
    glow: "shadow-primary/10",
  },
}

const statusLabels: Record<StaffingStatus, string> = {
  success: "Sous controle",
  warning: "À surveiller",
  danger: "À traiter",
  neutral: "À qualifier",
}

const sparkPaths = [
  "M2 26 C18 24 18 12 34 14 C51 16 48 28 64 20 C78 13 82 12 94 10",
  "M2 24 C15 18 24 28 38 18 C52 8 58 17 70 14 C82 11 86 18 94 12",
  "M2 18 C15 10 26 12 36 22 C49 34 55 18 68 20 C82 22 85 12 94 8",
  "M2 28 C16 30 24 18 38 20 C50 22 53 10 66 12 C80 14 82 24 94 18",
]

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

export function StaffingDesktopDashboard({ data }: { data: StaffingDashboardData }) {
  const [activeStageKey, setActiveStageKey] = useState<string | null>(data.stageDistribution[0]?.key ?? null)
  const [selectedNeed, setSelectedNeed] = useState<StaffingNeedSnapshot | null>(null)
  const [staffingNeed, setStaffingNeed] = useState<StaffingNeedSnapshot | null>(null)
  const [taskDrawer, setTaskDrawer] = useState<TaskDrawerState>({ open: false })

  const deadlinesByDay = useMemo(() => groupDeadlinesByDay(data.weeklyDeadlines), [data.weeklyDeadlines])
  const stageTotal = getCountTotal(data.stageDistribution)
  const stageMax = Math.max(1, ...data.stageDistribution.map((stage) => stage.count))
  const originMax = Math.max(1, ...data.originDistribution.map((origin) => origin.count))
  const busiestDay = data.weekDays
    .map((day) => ({ day, count: deadlinesByDay[day.shortDateLabel]?.length ?? 0 }))
    .sort((a, b) => b.count - a.count)[0]

  const activeStage = data.stageDistribution.find((stage) => stage.key === activeStageKey) ?? data.stageDistribution[0] ?? null
  const activePositioningDetails = activeStage
    ? data.positioningDetails.filter((detail) => detail.stageKey === activeStage.key)
    : []

  function openStaffingFromNeed(need: StaffingNeedSnapshot) {
    setSelectedNeed(null)
    setStaffingNeed(need)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 bg-canvas px-6 py-6">
      <header className="flex items-start justify-between border-b border-border/70 pb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Staffing</p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-heading">
            Cockpit staffing
          </h1>
          <p className="mt-1 text-xs font-medium text-body">
            Données au {data.asOfLabel} - {data.sourceNote}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <HeaderCalendar />
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-primary text-xs font-bold text-white">
            GK
          </div>
        </div>
      </header>

      <section className="grid grid-cols-4 gap-4">
        {data.kpis.map((kpi, index) => (
          <PremiumKpiCard key={kpi.id} kpi={kpi} index={index} />
        ))}
      </section>

      <section className="grid grid-cols-12 items-start gap-5">
        <SurfaceCard className="col-span-7 p-5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-heading">Pipeline de positionnement</h2>
              <p className="mt-1 text-xs text-muted">Cliquez une étape pour ouvrir les positionnements rattachés.</p>
            </div>
            <span className="rounded-md border border-border bg-canvas px-2 py-1 text-[11px] font-semibold text-muted">
              {stageTotal} profils
            </span>
          </div>

          <StageFlow
            stages={data.stageDistribution}
            maxCount={stageMax}
            activeStageKey={activeStage?.key ?? null}
            onStageSelect={setActiveStageKey}
          />
          <PositioningDetailPanel stage={activeStage} details={activePositioningDetails} />
        </SurfaceCard>

        <NeedCoveragePanel
          data={data}
          onNeedSelect={setSelectedNeed}
        />
      </section>

      <section className="grid grid-cols-12 items-start gap-5">
        <SurfaceCard className="col-span-7 p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-heading">Semaine active</h2>
              <p className="mt-1 text-xs text-muted">Échéances de staffing placées sur la semaine courante.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-lg font-bold text-heading">{data.weeklyDeadlines.length}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  échéances
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTaskDrawer({ open: true })}
                className="rounded-lg bg-heading px-3 py-2 text-xs font-bold text-primary-fg shadow-sm transition hover:-translate-y-0.5 hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/35"
              >
                + ajouter une tâche
              </button>
            </div>
          </div>

          <WeekTimeline
            weekDays={data.weekDays}
            deadlinesByDay={deadlinesByDay}
            busiestDayLabel={busiestDay?.day.shortDateLabel}
            onAddTask={(dayLabel) => setTaskDrawer({ open: true, dayLabel })}
          />
        </SurfaceCard>

        <div className="col-span-5 flex flex-col gap-5">
          <PriorityBoard priorities={data.priorities} />
          <SourcePanel origins={data.originDistribution} maxCount={originMax} />
        </div>
      </section>

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

function PremiumKpiCard({ kpi, index }: { kpi: StaffingKpi; index: number }) {
  const tone = getStatusTone(kpi.status)
  const path = sparkPaths[index % sparkPaths.length]

  return (
    <SurfaceCard
      className={cn(
        "group min-h-40 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl",
        tone.glow
      )}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="max-w-36 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              {kpi.label}
            </p>
            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full transition-transform duration-300 group-hover:scale-150", tone.fill)} />
          </div>
          <p className="mt-4 font-heading text-4xl font-bold leading-none tracking-tight text-heading">
            {kpi.value}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className={cn("h-px w-8", tone.fill)} />
            <span className={cn("text-[11px] font-bold uppercase tracking-[0.12em]", tone.text)}>
              {statusLabels[kpi.status]}
            </span>
          </div>
        </div>

        <div>
          <svg className="mb-3 h-9 w-full overflow-visible" viewBox="0 0 96 34" aria-hidden="true">
            <path d={path} className={cn("fill-none stroke-current transition-all duration-300 group-hover:translate-y-[-2px]", tone.text)} strokeWidth="2.4" strokeLinecap="round" />
            <path d={`${path} L94 34 L2 34 Z`} className={cn("fill-current opacity-[0.08]", tone.text)} />
          </svg>
          <p className="text-xs leading-relaxed text-body">
            <span className="font-semibold text-heading">{kpi.detail}</span> - {kpi.description}
          </p>
        </div>
      </div>
    </SurfaceCard>
  )
}

function StageFlow({
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
      <p className="rounded-lg border border-border bg-canvas px-3 py-10 text-center text-xs text-muted">
        Aucun positionnement actif sur les besoins ouverts.
      </p>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-6 right-6 top-9 h-px bg-border" aria-hidden="true" />
      <div className="grid grid-cols-4 gap-3">
        {stages.map((stage, index) => {
          const tone = getStatusTone(stage.status)
          const height = 42 + Math.round((stage.count / maxCount) * 54)
          const active = stage.key === activeStageKey

          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => onStageSelect(stage.key)}
              aria-expanded={active}
              className={cn(
                "relative rounded-lg border p-3 text-left transition duration-300 focus:outline-none focus:ring-2 focus:ring-primary/35",
                active ? "border-heading bg-surface shadow-md" : "border-border/70 bg-canvas/35 hover:-translate-y-0.5 hover:bg-surface-hover"
              )}
            >
              <div className="relative z-10 mb-3 flex items-center justify-between gap-2">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border bg-surface text-[11px] font-black", tone.border, tone.text)}>
                  {index + 1}
                </span>
                <span className="text-right text-xs font-bold text-heading">{stage.share}%</span>
              </div>
              <div className="flex min-h-28 items-end gap-3">
                <div className="flex-1">
                  <p className="text-xs font-bold leading-snug text-heading">{stage.label}</p>
                  <p className="mt-1 text-[11px] text-muted">{stage.count} profil(s)</p>
                </div>
                <div className="flex h-28 w-5 items-end rounded-full bg-surface">
                  <div className={cn("w-full rounded-full transition-all duration-500", tone.fill)} style={{ height }} />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PositioningDetailPanel({
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
    <div className={cn("mt-4 overflow-hidden rounded-lg border bg-canvas/35", tone.border)}>
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-surface px-4 py-3">
        <div>
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", tone.text)}>Détails positionnement</p>
          <h3 className="mt-1 text-sm font-bold text-heading">{stage.label}</h3>
        </div>
        <span className="font-heading text-2xl font-bold text-heading">{details.length}</span>
      </div>

      {details.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted">
          Aucun détail disponible pour cette étape.
        </p>
      ) : (
        <div className="divide-y divide-border/70">
          {details.map((detail) => (
            <button
              key={detail.id}
              type="button"
              onClick={() => openStaffingDrawer(detail.id)}
              className="w-full text-left grid grid-cols-[1.1fr_0.95fr_1.1fr_88px_80px] items-center gap-3 px-4 py-3 hover:bg-surface-hover transition duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-heading">{detail.candidateName}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted">{detail.nextAction}</p>
              </div>
              <p className="truncate text-xs font-semibold text-body">{detail.clientName}</p>
              <p className="truncate text-xs text-body">{detail.needTitle}</p>
              <p className="text-right text-xs font-semibold text-heading">{detail.startDateLabel}</p>
              <p className="text-right text-xs font-bold text-heading">{detail.tjmLabel}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


function NeedCoveragePanel({
  data,
  onNeedSelect,
}: {
  data: StaffingDashboardData
  onNeedSelect: (need: StaffingNeedSnapshot) => void
}) {
  const needs = data.openNeeds.slice(0, 5)

  return (
    <SurfaceCard className="col-span-5 overflow-hidden border-primary/20 bg-surface p-0 text-heading">
      <div className="relative p-5">
        <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-heading" aria-hidden="true" />
        <div className="absolute right-0 top-0 h-24 w-40 border-l border-primary/10 bg-primary/10" aria-hidden="true" />
        <div className="relative mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">À couvrir</p>
            <h2 className="mt-1 text-lg font-bold text-heading">Besoins ouverts</h2>
            <p className="mt-1 text-xs text-body">Cliquez une ligne pour ouvrir le dossier besoin.</p>
          </div>
          <span className="rounded-lg bg-heading px-3 py-2 font-heading text-3xl font-bold text-primary-fg">
            {data.openNeeds.length}
          </span>
        </div>

        <div className="relative space-y-2">
          {needs.map((need, index) => (
            <button
              key={need.id}
              type="button"
              onClick={() => onNeedSelect(need)}
              className="group grid w-full grid-cols-[26px_1fr_auto] items-center gap-3 rounded-lg border border-border bg-canvas/70 px-3 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary/35"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-heading text-[10px] font-black text-primary-fg">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-heading">{need.title}</span>
                <span className="mt-0.5 block truncate text-[11px] text-body">
                  {need.company} - {need.practice}
                </span>
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

function SourcePanel({ origins, maxCount }: { origins: StaffingOriginBucket[]; maxCount: number }) {
  return (
    <SurfaceCard className="p-5">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-heading">Constellation des sources</h2>
        <p className="mt-1 text-xs text-muted">Origine des candidats pousses, lisible par poids relatif.</p>
      </div>
      <SourceConstellation origins={origins} maxCount={maxCount} />
    </SurfaceCard>
  )
}

function SourceConstellation({ origins, maxCount }: { origins: StaffingOriginBucket[]; maxCount: number }) {
  if (origins.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-canvas px-3 py-10 text-center text-xs text-muted">
        Aucune origine disponible.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {origins.map((origin, index) => {
        const tone = getStatusTone(origin.status)
        const size = 88 + Math.round((origin.count / maxCount) * 44)

        return (
          <div
            key={origin.key}
            className={cn(
              "group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-lg border bg-canvas/40 p-3 transition duration-300 hover:-translate-y-1 hover:bg-surface-hover",
              tone.border
            )}
          >
            <div
              className={cn("absolute -right-8 -top-8 rounded-full opacity-15 transition-transform duration-500 group-hover:scale-110", tone.fill)}
              style={{ height: size, width: size }}
              aria-hidden="true"
            />
            <div className="relative">
              <p className="text-xs font-bold leading-snug text-heading">{origin.label}</p>
              <p className="mt-1 text-[11px] text-muted">{origin.share}% du flux</p>
            </div>
            <div className="relative flex items-end justify-between">
              <p className="font-heading text-3xl font-bold text-heading">{origin.count}</p>
              <span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", tone.soft, tone.text)}>
                #{index + 1}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeekTimeline({
  weekDays,
  deadlinesByDay,
  busiestDayLabel,
  onAddTask,
}: {
  weekDays: StaffingDashboardData["weekDays"]
  deadlinesByDay: Record<string, WeeklyStaffingDeadline[]>
  busiestDayLabel?: string
  onAddTask: (dayLabel?: string) => void
}) {
  return (
    <div className="space-y-3">
      {weekDays.map((day) => {
        const dayDeadlines = deadlinesByDay[day.shortDateLabel] ?? []
        const isBusiest = day.shortDateLabel === busiestDayLabel && dayDeadlines.length > 0

        return (
          <div key={day.date} className={cn("grid grid-cols-[76px_1fr_auto] gap-4 rounded-lg border p-3", isBusiest ? "border-primary/30 bg-primary/5" : "border-border/70 bg-canvas/30")}>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-heading">{day.dayLabel}</p>
              <p className="mt-1 text-[11px] font-semibold text-muted">{day.shortDateLabel}</p>
            </div>

            <div className="flex min-h-12 flex-wrap items-center gap-2">
              {dayDeadlines.length === 0 ? (
                <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted">
                  Libre
                </span>
              ) : (
                dayDeadlines.map((deadline) => {
                  const tone = getStatusTone(deadline.status)
                  return (
                    <div key={deadline.id} className={cn("min-w-44 flex-1 rounded-lg border bg-surface px-3 py-2", tone.border)}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-[10px] font-bold uppercase tracking-[0.12em]", tone.text)}>{deadline.type}</p>
                        <span className="text-[10px] font-semibold text-muted">{deadline.priority}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs font-bold text-heading">{deadline.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-body">{deadline.company}</p>
                    </div>
                  )
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => onAddTask(day.shortDateLabel)}
              className="self-center rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold text-muted transition hover:border-primary/30 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/35"
            >
              + tâche
            </button>
          </div>
        )
      })}
    </div>
  )
}

function PriorityBoard({ priorities }: { priorities: StaffingPriority[] }) {
  const [first, ...rest] = priorities

  return (
    <SurfaceCard className="p-5">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-heading">Dossiers à débloquer</h2>
        <p className="mt-1 text-xs text-muted">Priorités calculées sur urgence, couverture et démarrage cible.</p>
      </div>

      {first ? (
        <div className="space-y-3">
          <PriorityHero priority={first} />
          {rest.map((priority) => (
            <PriorityCompact key={priority.id} priority={priority} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-canvas px-3 py-8 text-center text-xs text-muted">
          Aucune priorité ouverte.
        </p>
      )}
    </SurfaceCard>
  )
}

function PriorityHero({ priority }: { priority: StaffingPriority }) {
  const tone = getStatusTone(priority.status)
  return (
    <div className={cn("rounded-lg border bg-canvas/40 p-4", tone.border)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", tone.text)}>Priorité #{priority.rank}</p>
          <h3 className="mt-2 text-sm font-bold leading-snug text-heading">{priority.title}</h3>
          <p className="mt-1 text-xs text-muted">{priority.company} - {priority.practice}</p>
        </div>
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full border bg-surface text-lg font-black", tone.border, tone.text)}>
          {priority.score}
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-body">{priority.reason}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
        <p className="text-xs font-bold text-primary">{priority.action}</p>
        <span className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-muted">
          {priority.dueLabel}
        </span>
      </div>
    </div>
  )
}

function PriorityCompact({ priority }: { priority: StaffingPriority }) {
  const tone = getStatusTone(priority.status)
  return (
    <div className="grid grid-cols-[32px_1fr_auto] items-start gap-3 rounded-lg border border-border/70 bg-surface px-3 py-3">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-black", tone.soft, tone.text)}>
        {priority.rank}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-heading">{priority.title}</p>
        <p className="mt-1 truncate text-[11px] text-muted">{priority.company}</p>
      </div>
      <span className="rounded border border-border bg-canvas px-2 py-1 text-[10px] font-semibold text-muted">
        {priority.dueLabel}
      </span>
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
      eyebrow="Besoin staffing"
      description={need ? `${need.company} - ${need.practice}` : undefined}
      width="default"
      footer={
        need ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button variant="primary" size="sm" onClick={() => onCreateStaffing(need)}>
              + créer un staffing
            </Button>
          </>
        ) : null
      }
    >
      {need && (
        <div className="space-y-5">
          <DrawerSection title="Statut besoin">
            <div className="rounded-[var(--radius-large)] border border-border bg-canvas/40 p-4">
              <div className="grid grid-cols-2 gap-3">
                <DrawerMetric label="Étape" value={need.stage} />
                <DrawerMetric label="Priorité" value={need.priority} />
                <DrawerMetric label="Démarrage" value={need.startDateLabel} />
                <DrawerMetric label="TJM cible" value={need.targetDailyRateLabel} />
              </div>
            </div>
          </DrawerSection>

          <DrawerSection
            title="Couverture"
            description={`${need.coverageLabel} positionné(s) sur ce besoin.`}
            divided
          >
            <div className="rounded-[var(--radius-large)] border border-border bg-surface p-4">
              <p className="text-xs font-semibold text-primary">{need.actionLabel}</p>
            </div>
          </DrawerSection>

          <DrawerSection title="Cadrage" divided>
            <div className="rounded-[var(--radius-large)] border border-border bg-surface p-4">
              <dl className="space-y-2">
                <DrawerRow label="Client" value={need.company} />
                <DrawerRow label="Practice" value={need.practice} />
                <DrawerRow label="Séniorité" value={need.seniority} />
              </dl>
            </div>
          </DrawerSection>
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
      description="Prototype d'action: les champs sont pre-remplis depuis le besoin selectionne."
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-body transition hover:bg-surface-hover"
          >
            Annuler
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-fg opacity-80"
          >
            Creer le staffing
          </button>
        </>
      }
    >
      {need && (
        <div className="space-y-4">
          <MockInput label="Besoin" value={need.title} />
          <MockInput label="Client" value={need.company} />
          <MockInput label="Practice" value={need.practice} />
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
      description="Drawer de creation pret pour raccordement aux actions staffing."
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-body transition hover:bg-surface-hover"
          >
            Annuler
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-fg opacity-80"
          >
            Ajouter
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <MockInput label="Type de tâche" value="Relance staffing" />
        <MockInput label="Date cible" value={dayLabel ?? "Cette semaine"} />
        <MockInput label="Responsable" value="Equipe staffing" />
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Note</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-none rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-2 focus:ring-primary/30"
            defaultValue="Qualifier le prochain mouvement et confirmer le candidat a pousser."
          />
        </label>
      </div>
    </AppDrawer>
  )
}

function DrawerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-xs font-bold text-heading">{value}</p>
    </div>
  )
}

function DrawerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-right text-xs font-semibold text-heading">{value}</dd>
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

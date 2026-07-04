"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AgendaEventDrawer, type AgendaEventDrawerInitialValues } from "@/components/agenda/AgendaEventDrawer"
import { EntityWorkspaceHeader } from "@/components/common/EntityWorkspaceHeader"
import { EntityWorkspacePage } from "@/components/common/EntityWorkspacePage"
import { EntityWorkspaceTemplate } from "@/components/common/EntityWorkspaceTemplate"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import { Button } from "@/components/ui/Button"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { HeaderKpiCard } from "@/components/missions/HeaderKpiCard"
import { StaffingDrawer } from "@/components/staffing/StaffingDrawer"
import { NewCandidateDrawer } from "@/components/recruitment/NewCandidateDrawer"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import type { RecruitmentWorkspaceRow } from "@/app/(app)/recruitment/_data/get-recruitment-workspace"
import { updateHiringStep } from "@/app/(app)/recruitment/_actions/update-hiring-step"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { RecruitmentListView } from "./RecruitmentListView"
import { RecruitmentKanbanView } from "./RecruitmentKanbanView"
import { RecruitmentPlanningView, type PlanningScale } from "./RecruitmentPlanningView"
import {
  HIRING_KANBAN_STAGES,
  RECRUITMENT_TERMINAL_STATUSES,
  type HiringKanbanStageKey,
} from "@/lib/recruitment/recruitment-stages"

type RecruitmentViewMode = "list" | "kanban" | "planning"
type PeriodDisplay = "week" | "month" | "quarter" | "year"

interface RecruitmentWorkspaceProps {
  rows: RecruitmentWorkspaceRow[]
  isMobile: boolean
}

// ── Period helpers ─────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getMondayOfWeek(date: Date): Date {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatDD(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}

function getPeriodLabel(period: PeriodDisplay): string {
  const today = new Date()
  if (period === "week") {
    const monday = getMondayOfWeek(today)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const weekNum = getISOWeek(today)
    return `semaine ${weekNum} - ${formatDD(monday)} au ${formatDD(sunday)}`
  }
  if (period === "month") {
    return today.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
  }
  if (period === "quarter") {
    const q = Math.ceil((today.getMonth() + 1) / 3)
    return `T${q} ${today.getFullYear()}`
  }
  return String(today.getFullYear())
}

function getPeriodStart(period: PeriodDisplay): Date | null {
  const now = new Date()
  if (period === "week") {
    return getMondayOfWeek(now)
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3)
    return new Date(now.getFullYear(), q * 3, 1)
  }
  if (period === "year") {
    return new Date(now.getFullYear(), 0, 1)
  }
  return null
}

// ── Misc helpers ───────────────────────────────────────────────────────────────

function getRoundedQuarterTime() {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15
  const start = new Date(now)
  start.setMinutes(roundedMinutes, 0, 0)
  const end = new Date(start)
  end.setHours(start.getHours() + 1)
  const toTime = (value: Date) =>
    `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
  return { date, start_time: toTime(start), end_time: toTime(end) }
}

// ── Mobile cards ───────────────────────────────────────────────────────────────

function RecruitmentMobileCards({
  rows,
  viewMode,
}: {
  rows: RecruitmentWorkspaceRow[]
  viewMode: RecruitmentViewMode
}) {
  const openStaffingDrawer = useStaffingDrawerStore((state) => state.openStaffingDrawer)

  if (viewMode === "planning") {
    return (
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <SurfaceCard
            key={row.id}
            className="cursor-pointer p-4 transition-colors active:bg-canvas/40"
            onClick={() => openStaffingDrawer(row.id)}
          >
            <p className="text-xs font-bold text-heading">{row.candidateName}</p>
            <p className="mt-0.5 text-[11px] text-muted">{row.opportunityTitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {row.planningMilestones.slice(0, 4).map((milestone) => (
                <span
                  key={milestone.key}
                  className="rounded-full border border-border bg-canvas px-2 py-1 text-[10px] font-medium text-body"
                >
                  {milestone.label}
                </span>
              ))}
            </div>
          </SurfaceCard>
        ))}
      </div>
    )
  }

  if (viewMode === "kanban") {
    return (
      <div className="flex flex-col gap-3">
        {HIRING_KANBAN_STAGES.map((stage) => {
          const stageRows = rows.filter((row) => (row.hiringCurrentStep ?? "prequalification") === stage.key)
          return (
            <SurfaceCard key={stage.key} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: stage.color }}>
                  {stage.label}
                </h3>
                <span className="text-xs font-semibold text-muted">{stageRows.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {stageRows.length === 0 ? (
                  <p className="text-xs text-muted">Aucun profil.</p>
                ) : (
                  stageRows.map((row) => (
                    <div
                      key={row.id}
                      className="cursor-pointer rounded-xl border border-border/60 bg-canvas/30 p-3"
                      onClick={() => openStaffingDrawer(row.id)}
                    >
                      <p className="text-xs font-bold text-heading">{row.candidateName}</p>
                      <p className="mt-0.5 text-[11px] text-body">{row.currentTitle || "Profil"}</p>
                      <p className="mt-2 text-[10px] text-muted">
                        {row.clientName} · {row.opportunityTitle}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </SurfaceCard>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <SurfaceCard
          key={row.id}
          className="cursor-pointer p-4 transition-colors active:bg-canvas/40"
          onClick={() => openStaffingDrawer(row.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-heading">{row.candidateName}</p>
              <p className="mt-0.5 truncate text-[11px] text-body">
                {row.currentTitle || "Profil non renseigné"}
              </p>
            </div>
            <span className="rounded-full border border-brand-brass/10 bg-brand-brass/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-brass">
              Externe
            </span>
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-body">
            <p>{row.opportunityTitle}</p>
            <p className="text-muted">{row.clientName}</p>
            <p className="text-muted">{row.availability || "—"}</p>
          </div>
        </SurfaceCard>
      ))}
    </div>
  )
}

// ── Hiring steps filter options ────────────────────────────────────────────────

const HIRING_STEP_OPTIONS = [
  { value: "all", label: "Étapes" },
  { value: "prequalification", label: "Préqualification" },
  { value: "entretien_manager", label: "Entretien manager" },
  { value: "tests_techniques", label: "Tests techniques" },
  { value: "proposition", label: "Proposition" },
  { value: "signature", label: "Signature" },
  { value: "integration", label: "Intégration" },
]

// ── Period selector display in header ─────────────────────────────────────────

function PeriodSelector({
  period,
  onChange,
}: {
  period: PeriodDisplay
  onChange: (value: PeriodDisplay) => void
}) {
  const label = getPeriodLabel(period)

  return (
    <div className="relative inline-flex items-center gap-2">
      <span className="text-sm font-semibold text-primary">
        {label}
      </span>
      <svg
        className="size-4 shrink-0 text-primary/60"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
      <select
        value={period}
        onChange={(e) => onChange(e.target.value as PeriodDisplay)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Changer la période d'affichage"
      >
        <option value="week">Semaine en cours</option>
        <option value="month">Mois en cours</option>
        <option value="quarter">Trimestre en cours</option>
        <option value="year">Année en cours</option>
      </select>
    </div>
  )
}

// ── Scale picker (planning) — same design as Opportunités ─────────────────────

function ScalePicker({
  scale,
  onChange,
}: {
  scale: PlanningScale
  onChange: (value: PlanningScale) => void
}) {
  return (
    <div className="relative inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-medium)] border border-brand-brass bg-brand-brass/[0.08] px-3 text-brand-brass transition-colors sm:h-8">
      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brass opacity-85">
        Échelle
      </span>
      <select
        value={scale}
        onChange={(e) => onChange(e.target.value as PlanningScale)}
        className="appearance-none border-0 bg-transparent pr-4 text-xs font-semibold text-brand-brass outline-none focus:outline-none focus:ring-0"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23C89A2B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right center",
          backgroundSize: "10px",
        }}
      >
        <option value="week" className="bg-surface font-normal text-body">Semaine</option>
        <option value="month" className="bg-surface font-normal text-body">Mois</option>
        <option value="quarter" className="bg-surface font-normal text-body">Trimestre</option>
        <option value="year" className="bg-surface font-normal text-body">Année</option>
      </select>
    </div>
  )
}

// ── Workspace ──────────────────────────────────────────────────────────────────

export function RecruitmentWorkspace({
  rows: initialRows,
  isMobile,
}: RecruitmentWorkspaceProps) {
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [viewMode, setViewMode] = useState<RecruitmentViewMode>("list")
  const [stageFilter, setStageFilter] = useState("all")
  const [hiringFilter, setHiringFilter] = useState("all")
  const [periodDisplay, setPeriodDisplay] = useState<PeriodDisplay>("month")
  const [practiceFilter, setPracticeFilter] = useState("all")
  const [planningScale, setPlanningScale] = useState<PlanningScale>("month")
  const [kanbanDisplayMode, setKanbanDisplayMode] = useState<"candidates" | "opportunities">("candidates")
  const [newCandidateDrawerOpen, setNewCandidateDrawerOpen] = useState(false)
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [eventInitialValues, setEventInitialValues] = useState<AgendaEventDrawerInitialValues>()

  const practiceOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.practice).filter((value): value is string => Boolean(value))),
      ).sort(),
    [rows],
  )

  const externalRows = useMemo(() => rows.filter((row) => !row.isCollaborator), [rows])

  const filteredRows = useMemo(() => {
    const periodStart = getPeriodStart(periodDisplay)

    return externalRows.filter((row) => {
      if (stageFilter !== "all" && row.hiringCurrentStep !== stageFilter) return false
      if (hiringFilter === "oui" && !row.hasActiveHiringProcess) return false
      if (hiringFilter === "non" && row.hasActiveHiringProcess) return false
      if (practiceFilter !== "all" && row.practice !== practiceFilter) return false
      if (periodStart) {
        const rowDate = new Date(row.updatedAt)
        if (rowDate < periodStart) return false
      }
      return true
    })
  }, [externalRows, hiringFilter, periodDisplay, practiceFilter, stageFilter])

  const activeFilterCount =
    (stageFilter !== "all" ? 1 : 0) +
    (hiringFilter !== "all" ? 1 : 0) +
    (practiceFilter !== "all" ? 1 : 0)

  const resetFilters = () => {
    setStageFilter("all")
    setHiringFilter("all")
    setPracticeFilter("all")
    setPeriodDisplay("month")
  }

  const activeRows = externalRows.filter((row) => !RECRUITMENT_TERMINAL_STATUSES.has(row.positioningStatus))
  const distinctCandidates = new Set(externalRows.map((row) => row.candidateId)).size
  const upcomingEvents = externalRows.reduce((count, row) => {
    return (
      count +
      row.planningMilestones.filter((milestone) => milestone.eventId && milestone.status === "planned")
        .length
    )
  }, 0)

  const openCreateEventDrawer = (row?: RecruitmentWorkspaceRow) => {
    const baseTime = getRoundedQuarterTime()
    setEventInitialValues({
      title: row ? `Suivi recrutement · ${row.candidateName}` : "",
      event_type: "entretien_candidat",
      date: baseTime.date,
      start_time: baseTime.start_time,
      end_time: baseTime.end_time,
      description: row?.comment || "",
      candidate_id: row?.candidateId,
      opportunity_id: row?.opportunityId,
      company: row?.companyId
        ? { id: row.companyId, name: row.clientName, isNew: false }
        : null,
    })
    setEventDrawerOpen(true)
  }

  // ── Kanban move: hiring step ──────────────────────────────────────────────────
  const handleMoveHiringStep = async (itemId: string, step: HiringKanbanStageKey) => {
    const row = rows.find((r) => r.id === itemId)
    if (!row?.hiringProcessId) return

    const previousRows = rows
    setRows((current) =>
      current.map((r) => r.id === itemId ? { ...r, hiringCurrentStep: step } : r),
    )

    const result = await updateHiringStep(row.hiringProcessId, step)
    if (result.error) {
      console.error("[recruitment] Failed to update hiring step:", result.error)
      setRows(previousRows)
    }
  }

  // ── Period selector shown in header subtitle ────────────────────────────────
  const headerSubtitle = (
    <PeriodSelector period={periodDisplay} onChange={setPeriodDisplay} />
  )

  // ── Filters per view mode ──────────────────────────────────────────────────

  const listFilters = (
    <>
      <PageFilterSelect
        id="recruitment-stage-filter"
        label="Étape recrutement"
        value={stageFilter}
        onChange={setStageFilter}
        defaultValue="all"
        className="sm:min-w-[9rem]"
        options={HIRING_STEP_OPTIONS}
      />
      <PageFilterSelect
        id="recruitment-hiring-filter"
        label="Recrutement"
        value={hiringFilter}
        onChange={setHiringFilter}
        defaultValue="all"
        className="sm:min-w-[8rem]"
        options={[
          { value: "all", label: "Recrutement" },
          { value: "oui", label: "En cours" },
          { value: "non", label: "Sans processus" },
        ]}
      />
      <PageFilterSelect
        id="recruitment-practice-filter"
        label="Practice"
        value={practiceFilter}
        onChange={setPracticeFilter}
        defaultValue="all"
        className="sm:min-w-[9rem]"
        options={[
          { value: "all", label: "Practice" },
          ...practiceOptions.map((practice) => ({
            value: practice,
            label: practice,
          })),
        ]}
      />
    </>
  )

  const kanbanFilters = (
    <>
      <PageFilterSelect
        id="recruitment-kanban-practice-filter"
        label="Practice"
        value={practiceFilter}
        onChange={setPracticeFilter}
        defaultValue="all"
        className="sm:min-w-[9rem]"
        options={[
          { value: "all", label: "Practice" },
          ...practiceOptions.map((practice) => ({
            value: practice,
            label: practice,
          })),
        ]}
      />
      {/* Basculer candidat ↔ opportunité — identique à la page Opportunités kanban */}
      <button
        type="button"
        onClick={() =>
          setKanbanDisplayMode((current) =>
            current === "candidates" ? "opportunities" : "candidates",
          )
        }
        className="inline-flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-medium)] border border-brand-brass bg-brand-brass/[0.08] px-3 py-1.5 text-brand-brass transition-colors hover:bg-brand-brass/[0.15] active:scale-95"
        title={
          kanbanDisplayMode === "candidates"
            ? "Afficher les infos opportunités"
            : "Afficher les infos candidats"
        }
      >
        <svg
          className="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
        <span className="text-xs font-semibold">
          {kanbanDisplayMode === "candidates" ? "Candidats" : "Opportunités"}
        </span>
      </button>
    </>
  )

  // Planning : bouton créer + sélecteur échelle côte à côte à gauche (même hauteur)
  const planningFilters = (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => openCreateEventDrawer()}
        leftIcon={
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        }
        className="h-9 sm:h-8"
      >
        Créer un événement
      </Button>
      <ScalePicker scale={planningScale} onChange={setPlanningScale} />
    </>
  )

  // ── Mobile ─────────────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <>
        <EntityWorkspacePage>
          <EntityWorkspaceHeader
            title="Recrutement"
            subtitle={headerSubtitle}
            kpis={
              <>
                <HeaderKpiCard label="Actifs" value={activeRows.length} className="flex-1" />
                <HeaderKpiCard label="Candidats" value={distinctCandidates} className="flex-1" />
                <HeaderKpiCard label="À venir" value={upcomingEvents} className="flex-1" />
              </>
            }
          />

          <div className="flex flex-col gap-4">
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openReportGeneration({ origin: "recruitment" })}
              >
                Nouveau rapport
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setNewCandidateDrawerOpen(true)}
                leftIcon={
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                }
              >
                Nouveau candidat
              </Button>
            </div>

            <PageFilterBar
              activeCount={activeFilterCount}
              onReset={resetFilters}
              viewSelector={
                <PageViewSelector
                  items={[
                    { value: "list", label: "Liste" },
                    { value: "kanban", label: "Kanban" },
                    { value: "planning", label: "Planning" },
                  ]}
                  value={viewMode}
                  onChange={(value) => setViewMode(value as RecruitmentViewMode)}
                  ariaLabel="Mode d'affichage du recrutement"
                />
              }
            >
              {viewMode === "list" && listFilters}
              {viewMode === "kanban" && kanbanFilters}
              {viewMode === "planning" && planningFilters}
            </PageFilterBar>

            <RecruitmentMobileCards rows={filteredRows} viewMode={viewMode} />
          </div>
        </EntityWorkspacePage>

        <AgendaEventDrawer
          open={eventDrawerOpen}
          onOpenChange={setEventDrawerOpen}
          event={null}
          onSaved={() => {
            setEventDrawerOpen(false)
            router.refresh()
          }}
          initialValues={eventInitialValues}
        />
        <NewCandidateDrawer open={newCandidateDrawerOpen} onOpenChange={setNewCandidateDrawerOpen} />
        <StaffingDrawer />
      </>
    )
  }

  // ── Desktop ────────────────────────────────────────────────────────────────

  return (
    <>
      <EntityWorkspaceTemplate
        title="Recrutement"
        headerSubtitle={headerSubtitle}
        kpis={
          <>
            <HeaderKpiCard label="Candidatures actives" value={activeRows.length} className="flex-1" />
            <HeaderKpiCard label="Candidats suivis" value={distinctCandidates} className="flex-1" />
            <HeaderKpiCard label="Événements à venir" value={upcomingEvents} className="flex-1" />
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openReportGeneration({ origin: "recruitment" })}
            >
              Nouveau rapport
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setNewCandidateDrawerOpen(true)}
              leftIcon={
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              }
            >
              Nouveau candidat
            </Button>
          </div>
        }
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode as RecruitmentViewMode)}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        filters={
          viewMode === "list"
            ? listFilters
            : viewMode === "kanban"
              ? kanbanFilters
              : planningFilters
        }
        secondaryActions={null}
        listView={<RecruitmentListView rows={filteredRows} />}
        kanbanView={
          <RecruitmentKanbanView
            rows={filteredRows}
            onMoveRow={handleMoveHiringStep}
            displayMode={kanbanDisplayMode}
          />
        }
        planningView={<RecruitmentPlanningView rows={filteredRows} scale={planningScale} />}
      />

      <AgendaEventDrawer
        open={eventDrawerOpen}
        onOpenChange={setEventDrawerOpen}
        event={null}
        onSaved={() => {
          setEventDrawerOpen(false)
          router.refresh()
        }}
        initialValues={eventInitialValues}
      />
      <NewCandidateDrawer open={newCandidateDrawerOpen} onOpenChange={setNewCandidateDrawerOpen} />
      <StaffingDrawer />
    </>
  )
}

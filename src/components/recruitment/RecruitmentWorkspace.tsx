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
import { IconButton } from "@/components/ui/IconButton"
import { StaffingDrawer } from "@/components/staffing/StaffingDrawer"
import { NewCandidateDrawer } from "@/components/recruitment/NewCandidateDrawer"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import type { RecruitmentWorkspaceRow } from "@/app/(app)/recruitment/_data/get-recruitment-workspace"
import { updateRecruitmentStatus } from "@/app/(app)/recruitment/_actions/update-recruitment-status"
import { RecruitmentListView } from "./RecruitmentListView"
import { RecruitmentKanbanView } from "./RecruitmentKanbanView"
import { RecruitmentPlanningView } from "./RecruitmentPlanningView"
import {
  RECRUITMENT_STAGES,
  RECRUITMENT_TERMINAL_STATUSES,
  type RecruitmentStageKey,
} from "@/lib/recruitment/recruitment-stages"
import { cn } from "@/lib/utils"

type RecruitmentViewMode = "list" | "kanban" | "planning"

interface RecruitmentWorkspaceProps {
  rows: RecruitmentWorkspaceRow[]
  isMobile: boolean
}

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

  return {
    date,
    start_time: toTime(start),
    end_time: toTime(end),
  }
}

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
        {RECRUITMENT_STAGES.map((stage) => {
          const stageRows = rows.filter((row) => row.stageKey === stage.key)

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
                        {row.clientName} • {row.opportunityTitle}
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
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                row.isCollaborator
                  ? "border-primary/10 bg-primary/5 text-primary"
                  : "border-brand-brass/10 bg-brand-brass/5 text-brand-brass",
              )}
            >
              {row.isCollaborator ? "Interne" : "Externe"}
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

export function RecruitmentWorkspace({
  rows: initialRows,
  isMobile,
}: RecruitmentWorkspaceProps) {
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [viewMode, setViewMode] = useState<RecruitmentViewMode>("list")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [stageFilter, setStageFilter] = useState("all")
  const [hiringFilter, setHiringFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("all")
  const [practiceFilter, setPracticeFilter] = useState("all")
  const [seniorityFilter, setSeniorityFilter] = useState("all")
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

  const seniorityOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.seniority).filter((value): value is string => Boolean(value))),
      ).sort(),
    [rows],
  )

  const externalRows = useMemo(() => rows.filter((row) => !row.isCollaborator), [rows])

  const filteredRows = useMemo(() => {
    const now = new Date()
    let periodStart: Date | null = null
    if (periodFilter === "week") {
      periodStart = new Date(now)
      periodStart.setDate(now.getDate() - now.getDay() + 1)
      periodStart.setHours(0, 0, 0, 0)
    } else if (periodFilter === "month") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (periodFilter === "year") {
      periodStart = new Date(now.getFullYear(), 0, 1)
    }

    return externalRows.filter((row) => {
      if (stageFilter !== "all" && row.stageKey !== stageFilter) return false
      if (hiringFilter === "oui" && !row.hasActiveHiringProcess) return false
      if (hiringFilter === "non" && row.hasActiveHiringProcess) return false
      if (practiceFilter !== "all" && row.practice !== practiceFilter) return false
      if (seniorityFilter !== "all" && row.seniority !== seniorityFilter) return false
      if (periodStart) {
        const rowDate = new Date(row.updatedAt)
        if (rowDate < periodStart) return false
      }
      return true
    })
  }, [externalRows, hiringFilter, periodFilter, practiceFilter, seniorityFilter, stageFilter])

  const activeFilterCount =
    (stageFilter !== "all" ? 1 : 0) +
    (hiringFilter !== "all" ? 1 : 0) +
    (periodFilter !== "all" ? 1 : 0) +
    (practiceFilter !== "all" ? 1 : 0) +
    (seniorityFilter !== "all" ? 1 : 0)

  const resetFilters = () => {
    setStageFilter("all")
    setHiringFilter("all")
    setPeriodFilter("all")
    setPracticeFilter("all")
    setSeniorityFilter("all")
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

  const handleMoveRow = async (itemId: string, nextStage: RecruitmentStageKey) => {
    const previousRows = rows

    setRows((current) =>
      current.map((row) =>
        row.id === itemId
          ? {
              ...row,
              stageKey: nextStage,
              positioningStatus:
                RECRUITMENT_STAGES.find((stage) => stage.key === nextStage)?.statuses[0] ??
                row.positioningStatus,
            }
          : row,
      ),
    )

    const result = await updateRecruitmentStatus({ id: itemId, stage: nextStage })

    if (result.error) {
      console.error("[recruitment] Failed to update stage:", result.error)
      setRows(previousRows)
    }
  }

  const filters = (
    <>
      <PageFilterSelect
        id="recruitment-stage-filter"
        label="Étape"
        value={stageFilter}
        onChange={setStageFilter}
        className="sm:min-w-[9rem]"
        options={[
          { value: "all", label: "Toutes les étapes" },
          ...RECRUITMENT_STAGES.map((stage) => ({
            value: stage.key,
            label: stage.label,
          })),
        ]}
      />
      <PageFilterSelect
        id="recruitment-hiring-filter"
        label="Recrutement"
        value={hiringFilter}
        onChange={setHiringFilter}
        className="sm:min-w-[8rem]"
        options={[
          { value: "all", label: "Tous" },
          { value: "oui", label: "En cours" },
          { value: "non", label: "Sans processus" },
        ]}
      />
      <PageFilterSelect
        id="recruitment-period-filter"
        label="Période"
        value={periodFilter}
        onChange={setPeriodFilter}
        className="sm:min-w-[8rem]"
        options={[
          { value: "all", label: "Toutes les périodes" },
          { value: "week", label: "Cette semaine" },
          { value: "month", label: "Ce mois" },
          { value: "year", label: "Cette année" },
        ]}
      />
      <PageFilterSelect
        id="recruitment-practice-filter"
        label="Practice"
        value={practiceFilter}
        onChange={setPracticeFilter}
        className="sm:min-w-[9rem]"
        options={[
          { value: "all", label: "Toutes les practices" },
          ...practiceOptions.map((practice) => ({
            value: practice,
            label: practice,
          })),
        ]}
      />
      <PageFilterSelect
        id="recruitment-seniority-filter"
        label="Séniorité"
        value={seniorityFilter}
        onChange={setSeniorityFilter}
        className="sm:min-w-[9rem]"
        options={[
          { value: "all", label: "Toutes séniorités" },
          ...seniorityOptions.map((seniority) => ({
            value: seniority,
            label: seniority,
          })),
        ]}
      />
    </>
  )

  const planningControls = (
    <>
      <div className="inline-flex items-center overflow-hidden rounded-[var(--radius-medium)] border border-brand-brass bg-brand-brass/[0.08] text-brand-brass">
        <IconButton
          aria-label="Année précédente"
          variant="ghost"
          size="sm"
          onClick={() => setSelectedYear((year) => year - 1)}
          className="size-8 rounded-none border-r border-brand-brass/20 text-brand-brass hover:bg-brand-brass/[0.12]"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </IconButton>
        <span className="px-3 text-xs font-semibold tracking-wide">{selectedYear}</span>
        <IconButton
          aria-label="Année suivante"
          variant="ghost"
          size="sm"
          onClick={() => setSelectedYear((year) => year + 1)}
          className="size-8 rounded-none border-l border-brand-brass/20 text-brand-brass hover:bg-brand-brass/[0.12]"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </IconButton>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={() => openCreateEventDrawer()}
        leftIcon={
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        }
        className="h-8"
      >
        Créer un événement
      </Button>
    </>
  )

  if (isMobile) {
    return (
      <>
        <EntityWorkspacePage>
          <EntityWorkspaceHeader
            title="Recrutement"
            kpis={
              <>
                <HeaderKpiCard label="Actifs" value={activeRows.length} className="flex-1" />
                <HeaderKpiCard label="Candidats" value={distinctCandidates} className="flex-1" />
                <HeaderKpiCard label="À venir" value={upcomingEvents} className="flex-1" />
              </>
            }
          />

          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
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
              controlsClassName={viewMode === "planning" ? "[&>*]:h-8 [&>*]:shrink-0" : undefined}
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
              {filters}
              {viewMode === "planning" ? planningControls : null}
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

  return (
    <>
      <EntityWorkspaceTemplate
        title="Recrutement"
        kpis={
          <>
            <HeaderKpiCard label="Candidatures actives" value={activeRows.length} className="flex-1" />
            <HeaderKpiCard label="Candidats suivis" value={distinctCandidates} className="flex-1" />
            <HeaderKpiCard label="Événements à venir" value={upcomingEvents} className="flex-1" />
          </>
        }
        actions={
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
        }
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode as RecruitmentViewMode)}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        filters={
          <>
            {filters}
            {viewMode === "planning" ? planningControls : null}
          </>
        }
        listView={<RecruitmentListView rows={filteredRows} />}
        kanbanView={
          <RecruitmentKanbanView rows={filteredRows} onMoveRow={handleMoveRow} />
        }
        planningView={<RecruitmentPlanningView rows={filteredRows} year={selectedYear} />}
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

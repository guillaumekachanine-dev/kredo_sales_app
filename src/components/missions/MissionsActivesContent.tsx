"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { EntityWorkspaceTemplate } from "@/components/common/EntityWorkspaceTemplate"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { AgendaEventDrawer, type AgendaEventDrawerInitialValues } from "@/components/agenda/AgendaEventDrawer"
import { HeaderKpiCard } from "@/components/missions/HeaderKpiCard"
import { MissionsListView, type MissionsListRow } from "./MissionsListView"
import { NewMissionButton } from "./NewMissionButton"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import { formatEuro, formatPct } from "@/lib/formatters"
import type { MissionPlanningRow } from "@/components/missions/planning/mission-planning-types"
import { MissionAnnualPlanningLegend } from "@/components/missions/planning/MissionAnnualPlanningLegend"
import { MissionsAnnualPlanningDesktop } from "@/components/missions/planning/MissionsAnnualPlanningDesktop"
import { MissionsAnnualPlanningMobile } from "@/components/missions/planning/MissionsAnnualPlanningMobile"
import { getMissionPlanningSubtitle } from "@/components/missions/planning/mission-annual-planning-utils"

type MissionsActivesViewMode = "list" | "planning"

interface MissionsActivesContentProps {
  missions: MissionsListRow[]
  planningRows: MissionPlanningRow[]
  isMobile: boolean
}

interface MissionsActivesMobileViewProps {
  missions: MissionsListRow[]
  planningRows: MissionPlanningRow[]
  viewMode: MissionsActivesViewMode
  onViewModeChange: (viewMode: MissionsActivesViewMode) => void
  filters: React.ReactNode
  planningControls: React.ReactNode
  activeFilterCount: number
  onResetFilters: () => void
  onOpenMission: (row: MissionPlanningRow) => void
  onOpenEvent: (eventId: string) => void
  onCreateEventForMission: (row: MissionPlanningRow) => void
  selectedYear: number
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

function MissionsActivesMobileView({
  missions,
  planningRows,
  viewMode,
  onViewModeChange,
  filters,
  planningControls,
  activeFilterCount,
  onResetFilters,
  onOpenMission,
  onOpenEvent,
  onCreateEventForMission,
  selectedYear,
}: MissionsActivesMobileViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewMissionButton />
      </div>

      <PageFilterBar
        activeCount={activeFilterCount}
        onReset={onResetFilters}
        controlsClassName={viewMode === "planning" ? "[&>*]:h-8 [&>*]:shrink-0" : undefined}
        viewSelector={
          <PageViewSelector
            items={[
              { value: "list", label: "Liste" },
              { value: "planning", label: "Planning" },
            ]}
            value={viewMode}
            onChange={(value) => onViewModeChange(value as MissionsActivesViewMode)}
            ariaLabel="Mode d'affichage des missions"
          />
        }
      >
        {filters}
        {viewMode === "planning" ? planningControls : null}
      </PageFilterBar>

      {viewMode === "list" ? (
        <MissionsListView rows={missions} emptyMessage="Aucune mission active." />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2 text-xs text-body">
            Planning annuel {selectedYear}
          </div>
          <MissionAnnualPlanningLegend rows={planningRows} year={selectedYear} />
          <MissionsAnnualPlanningMobile
            rows={planningRows}
            year={selectedYear}
            onOpenMission={onOpenMission}
            onOpenEvent={onOpenEvent}
            onCreateEventForMission={onCreateEventForMission}
          />
        </div>
      )}
    </div>
  )
}

export function MissionsActivesContent({
  missions,
  planningRows,
  isMobile,
}: MissionsActivesContentProps) {
  const router = useRouter()
  const { openTab } = useMissionsTabStore()
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)

  const [viewMode, setViewMode] = useState<MissionsActivesViewMode>("list")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [riskFilter, setRiskFilter] = useState("all")
  const [practiceFilter, setPracticeFilter] = useState("all")
  const [tjmFilter, setTjmFilter] = useState("all")
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [eventInitialValues, setEventInitialValues] = useState<AgendaEventDrawerInitialValues>()

  const practiceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          missions
            .map((row) => row.practice)
            .filter((practice): practice is string => Boolean(practice))
        )
      ).sort(),
    [missions],
  )

  const filteredMissions = useMemo(() => {
    return missions.filter((mission) => {
      if (practiceFilter !== "all" && mission.practice !== practiceFilter) return false

      if (riskFilter !== "all") {
        const isHighRisk = mission.riskLevel === "critique" || mission.riskLevel === "modere"
        if (riskFilter === "high" && !isHighRisk) return false
        if (riskFilter === "normal" && isHighRisk) return false
      }

      if (tjmFilter !== "all") {
        const tjmValue = mission.tjm || 0
        if (tjmFilter === "500" && tjmValue <= 500) return false
        if (tjmFilter === "700" && tjmValue <= 700) return false
      }

      return true
    })
  }, [missions, practiceFilter, riskFilter, tjmFilter])

  const filteredMissionIds = useMemo(
    () => new Set(filteredMissions.map((mission) => mission.entityId)),
    [filteredMissions],
  )

  const filteredPlanningRows = useMemo(
    () => planningRows.filter((row) => filteredMissionIds.has(row.id)),
    [filteredMissionIds, planningRows],
  )

  const activeFilterCount =
    (practiceFilter !== "all" ? 1 : 0) +
    (riskFilter !== "all" ? 1 : 0) +
    (tjmFilter !== "all" ? 1 : 0)

  const activeMissionsWithTjm = missions.filter((mission) => mission.tjm !== undefined && mission.tjm > 0)
  const avgTjm = activeMissionsWithTjm.length > 0
    ? Math.round(activeMissionsWithTjm.reduce((sum, mission) => sum + (mission.tjm || 0), 0) / activeMissionsWithTjm.length)
    : 0

  const activeMissionsWithMargin = missions.filter((mission) => mission.grossMarginPct !== null && mission.grossMarginPct !== undefined)
  const avgMargin = activeMissionsWithMargin.length > 0
    ? activeMissionsWithMargin.reduce((sum, mission) => sum + (mission.grossMarginPct || 0), 0) / activeMissionsWithMargin.length
    : 0

  const resetFilters = () => {
    setPracticeFilter("all")
    setRiskFilter("all")
    setTjmFilter("all")
  }

  const openMissionFromPlanning = (row: MissionPlanningRow) => {
    openTab({
      entityType: "mission",
      entityId: row.id,
      title: row.title,
      subtitle: getMissionPlanningSubtitle(row),
    })
  }

  const openExistingEvent = (eventId: string) => {
    openEventDrawer(eventId)
  }

  const openCreateEventDrawer = (mission?: MissionPlanningRow) => {
    const baseTime = getRoundedQuarterTime()
    setEventInitialValues({
      title: mission ? `Suivi mission · ${mission.title}` : "",
      event_type: mission ? "suivi_mission_client" : "rdv_client_suivi",
      date: baseTime.date,
      start_time: baseTime.start_time,
      end_time: baseTime.end_time,
      description: "",
      company: mission?.companyId
        ? { id: mission.companyId, name: mission.company.name, isNew: false }
        : null,
    })
    setEventDrawerOpen(true)
  }

  const listFilters = (
    <>
      <PageFilterSelect
        id="missions-practice-filter"
        label="Practice"
        value={practiceFilter}
        onChange={setPracticeFilter}
        options={[
          { value: "all", label: "Toutes les practices" },
          ...practiceOptions.map((practice) => ({
            value: practice,
            label: practice,
          })),
        ]}
        className="sm:min-w-[10rem]"
      />
      <PageFilterSelect
        id="missions-risk-filter"
        label="Criticité"
        value={riskFilter}
        onChange={setRiskFilter}
        options={[
          { value: "all", label: "Toutes criticités" },
          { value: "high", label: "Priorité haute" },
          { value: "normal", label: "Priorité normale" },
        ]}
      />
      <PageFilterSelect
        id="missions-tjm-filter"
        label="TJM"
        value={tjmFilter}
        onChange={setTjmFilter}
        options={[
          { value: "all", label: "Tous les TJM" },
          { value: "500", label: "Sup. à 500 €" },
          { value: "700", label: "Sup. à 700 €" },
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

  return (
    <>
      <EntityWorkspaceTemplate
        title="Missions en cours"
        kpis={
          <div className="flex items-center justify-around divide-x divide-border/60 w-full max-w-2xl">
            <HeaderKpiCard label="Missions en cours" value={missions.length} className="flex-1" />
            <HeaderKpiCard label="TJ moyen" value={formatEuro(avgTjm)} className="flex-1" />
            <HeaderKpiCard label="Tx marge moyen" value={formatPct(avgMargin)} className="flex-1" />
          </div>
        }
        actions={<NewMissionButton />}
        filters={
          <>
            {listFilters}
            {viewMode === "planning" ? planningControls : null}
          </>
        }
        viewMode={viewMode}
        onViewModeChange={(nextMode) => setViewMode(nextMode as MissionsActivesViewMode)}
        viewItems={[
          { value: "list", label: "Liste" },
          { value: "planning", label: "Planning" },
        ]}
        controlsClassName={viewMode === "planning" ? "[&>*]:h-8 [&>*]:shrink-0" : undefined}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        isMobile={isMobile}
        listView={<MissionsListView rows={filteredMissions} emptyMessage="Aucune mission active." />}
        planningView={
          <div className="flex flex-col gap-4">
            <MissionAnnualPlanningLegend rows={filteredPlanningRows} year={selectedYear} />
            <MissionsAnnualPlanningDesktop
              rows={filteredPlanningRows}
              year={selectedYear}
              onOpenMission={openMissionFromPlanning}
              onOpenEvent={openExistingEvent}
              onCreateEventForMission={openCreateEventDrawer}
            />
          </div>
        }
        mobileView={
          <MissionsActivesMobileView
            missions={filteredMissions}
            planningRows={filteredPlanningRows}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filters={listFilters}
            planningControls={planningControls}
            activeFilterCount={activeFilterCount}
            onResetFilters={resetFilters}
            onOpenMission={openMissionFromPlanning}
            onOpenEvent={openExistingEvent}
            onCreateEventForMission={openCreateEventDrawer}
            selectedYear={selectedYear}
          />
        }
      />

      <AgendaEventDrawer
        open={eventDrawerOpen}
        onOpenChange={setEventDrawerOpen}
        event={null}
        initialValues={eventInitialValues}
        onSaved={() => {
          setEventDrawerOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}

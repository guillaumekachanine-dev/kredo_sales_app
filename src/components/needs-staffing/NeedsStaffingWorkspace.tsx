"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { OpportunityPlanningData } from "@/app/(app)/missions/_data/get-opportunities-planning"
import type { NeedsStaffingSharedData } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"
import type { StaffingPlanningData } from "@/app/(app)/staffing/_data/get-staffings-planning"
import { updateOpportunity } from "@/app/(app)/missions/_actions/update-opportunity"
import { NewOpportunityButton } from "@/components/missions/NewOpportunityButton"
import { OpportunitiesKanbanView } from "@/components/missions/kanban/OpportunitiesKanbanView"
import { OpportunitiesPlanningView } from "@/components/missions/planning/OpportunitiesPlanningView"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import React from "react"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import { MobileFilterTrigger } from "@/components/ui/mobile/MobileFilterTrigger"
import type { MissionsListRow } from "@/components/missions/MissionsListView"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import {
  cycleAcvSort,
  filterNeedsRows,
  filterStaffingRows,
} from "@/lib/needs-staffing/model"
import { useNeedsStaffingUrlState } from "@/lib/needs-staffing/use-needs-staffing-url-state"
import { OPPORTUNITY_STAGES } from "@/lib/opportunities/stages"
import { cn } from "@/lib/utils"
import { NeedsListView } from "./NeedsListView"
import { NewStaffingButton } from "./NewStaffingButton"
import { StaffingListWorkspaceView } from "./StaffingListWorkspaceView"
import { StaffingKanbanView } from "@/components/staffing/StaffingKanbanView"
import { StaffingPlanningView } from "@/components/staffing/StaffingPlanningView"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { formatDateShort } from "@/lib/formatters"

const PRIORITY_OPTIONS = [
  { value: "all", label: "Priorité" },
  { value: "haute", label: "Haute" },
  { value: "normale", label: "Normale" },
  { value: "basse", label: "Basse" },
]

const STAFFING_STAGE_OPTIONS = [
  { value: "all", label: "Étape" },
  { value: "identifie", label: "Identifié" },
  { value: "propose_interne", label: "Proposé en interne" },
  { value: "preselectionne", label: "Présélectionné" },
  { value: "envoye_client", label: "CV envoyé" },
  { value: "entretien_planifie", label: "Entretien client" },
  { value: "entretien_realise", label: "Entretien client" },
  { value: "retenu", label: "Retenu" },
  { value: "gagne", label: "Gagné" },
  { value: "refuse_client", label: "Refus client" },
  { value: "refuse_candidat", label: "Refus candidat" },
  { value: "abandonne", label: "Abandonné" },
]

interface NeedsStaffingWorkspaceProps {
  device: DashboardDevice
  sharedData: NeedsStaffingSharedData
  needsData?: {
    rows: MissionsListRow[]
    planningData: OpportunityPlanningData[]
  }
  staffingData?: {
    rows: StaffingListRow[]
    planningData: StaffingPlanningData[]
  }
}

function ScopeSwitcher({
  scope,
  onChange,
}: {
  scope: "needs" | "staffing"
  onChange: (scope: "needs" | "staffing") => void
}) {
  return (
    <div
      role="group"
      aria-label="Perspective Besoins ou Staffing"
      className="inline-flex items-center rounded-[var(--radius-medium)] border border-border bg-surface p-0.5"
    >
      {[
        { value: "needs", label: "Besoins" },
        { value: "staffing", label: "Staffing" },
      ].map((item) => {
        const isActive = scope === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value as "needs" | "staffing")}
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-7 items-center rounded-[calc(var(--radius-medium)-1px)] px-3",
              "text-[length:var(--font-size-label-sm)] font-semibold whitespace-nowrap",
              "transition-[background-color,color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
              "outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]",
              isActive
                ? "bg-primary text-primary-fg"
                : "text-body hover:bg-surface-hover hover:text-heading",
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function MiniKpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-1.5 min-w-[7rem]">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted leading-none">{label}</p>
      <p className="mt-1 font-heading text-lg font-bold leading-none tracking-tight text-heading">{value}</p>
    </div>
  )
}

function SharedKpis({
  sharedData,
  compact,
}: {
  sharedData: NeedsStaffingSharedData
  compact: boolean
}) {
  return (
    <div className={cn("flex gap-2", compact ? "flex-col" : "flex-row")}>
      <MiniKpi label="Besoins ouverts" value={sharedData.kpis.openNeedsCount} />
      <MiniKpi label="Positionnements" value={sharedData.kpis.activePositioningsCount} />
      <MiniKpi label="Couverture" value={`${sharedData.kpis.coverageRate}%`} />
    </div>
  )
}

function renderNeedNextAction(row: MissionsListRow) {
  if (row.nextActionLabel && row.nextActionAt) {
    return `${row.nextActionLabel} · ${formatDateShort(row.nextActionAt)}`
  }

  if (row.nextActionLabel) {
    return row.nextActionLabel
  }

  if (row.nextActionAt) {
    return formatDateShort(row.nextActionAt)
  }

  return "À qualifier"
}

function NeedsMobileCards({
  rows,
}: {
  rows: MissionsListRow[]
}) {
  const { openOpportunityDrawer } = useStaffingDrawerStore()

  if (rows.length === 0) {
    return <div className="py-12 text-center text-sm text-muted">Aucun besoin ne correspond aux filtres.</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <button
          key={row.entityId}
          type="button"
          onClick={() => openOpportunityDrawer(row.entityId, "besoin")}
          className="flex min-h-[44px] flex-col gap-3 rounded-[var(--radius-medium)] border border-border bg-surface p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <CompanyLogo
              name={row.client || "Client"}
              logoPath={row.clientLogoPath}
              website={row.clientWebsite}
              size="sm"
            />
            <span className="text-xs font-bold text-heading">{row.client}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-body">{row.title}</p>
            <p className="mt-1 text-xs text-muted">{row.practice ?? "Practice non renseignée"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Priorité</p>
              <p className="mt-1 text-body">{row.priority ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">ACV</p>
              <p className="mt-1 text-body">{row.amount ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Effectif</p>
              <p className="mt-1 text-body">{row.requiredHeadcount ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Action</p>
              <p className="mt-1 line-clamp-2 text-body">{renderNeedNextAction(row)}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function StaffingMobileCards({
  rows,
}: {
  rows: StaffingListRow[]
}) {
  const { openStaffingDrawer } = useStaffingDrawerStore()

  if (rows.length === 0) {
    return <div className="py-12 text-center text-sm text-muted">Aucun positionnement ne correspond aux filtres.</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => openStaffingDrawer(row.id)}
          className="flex min-h-[44px] flex-col gap-3 rounded-[var(--radius-medium)] border border-border bg-surface p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <CompanyLogo
              name={row.clientName || "Client"}
              logoPath={row.clientLogoPath}
              website={row.clientWebsite}
              size="sm"
            />
            <span className="text-xs font-bold text-heading">{row.clientName}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-body">{row.fullName}</p>
            <p className="mt-1 text-xs text-muted">{row.profileTitle ?? "Profil non renseigné"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Besoin</p>
              <p className="mt-1 text-body">{row.opportunityTitle}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Étape</p>
              <p className="mt-1 text-body">{row.status}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Disponibilité</p>
              <p className="mt-1 text-body">{row.availability ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Action</p>
              <p className="mt-1 line-clamp-2 text-body">{row.nextAction ?? "À définir"}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

export function NeedsStaffingWorkspace({
  device,
  sharedData,
  needsData,
  staffingData,
}: NeedsStaffingWorkspaceProps) {
  const isMobile = device === "mobile"
  const router = useRouter()
  const { state, setScope, setView, setStage, setPriority, setPractice, setSort, resetFilters } =
    useNeedsStaffingUrlState()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  // Kanban flip: "besoin" = face avant, "candidat" = face arrière
  const [kanbanDisplayMode, setKanbanDisplayMode] = useState<"besoin" | "candidat">("besoin")
  // Planning layer cycle: besoin → staffing → both
  const [planningLayer, setPlanningLayer] = useState<"besoin" | "staffing" | "both">("both")
  // Planning scale cycle: month → quarter → year → week
  const [planningScale, setPlanningScale] = useState<"month" | "quarter" | "year" | "week">("month")

  const isNeedsScope = state.scope === "needs"
  const needsRows = needsData?.rows ?? []
  const needsPlanning = needsData?.planningData ?? []
  const staffingRows = staffingData?.rows ?? []
  const staffingPlanning = staffingData?.planningData ?? []

  const practiceOptions = useMemo(() => {
    const source = isNeedsScope ? needsRows : staffingRows
    const uniquePractices = [...new Set(source.map((row) => row.practice).filter(Boolean))]

    return [
      { value: "all", label: "Practice" },
      ...uniquePractices.map((practice) => ({ value: practice!, label: practice! })),
    ]
  }, [isNeedsScope, needsRows, staffingRows])

  const stageOptions = isNeedsScope
    ? [
        { value: "all", label: "Étape" },
        ...OPPORTUNITY_STAGES.map((stage) => ({
          value: stage.value,
          label: stage.label,
        })),
      ]
    : STAFFING_STAGE_OPTIONS

  const filteredNeedsRows = useMemo(() => (
    filterNeedsRows(needsRows, state)
  ), [needsRows, state])

  const filteredNeedsPlanning = useMemo(() => (
    filterNeedsRows(needsPlanning, {
      stage: state.stage,
      priority: state.priority,
      practice: state.practice,
      sort: null,
      direction: null,
    })
  ), [needsPlanning, state.direction, state.practice, state.priority, state.sort, state.stage])

  const filteredStaffingRows = useMemo(() => (
    filterStaffingRows(staffingRows, state)
  ), [staffingRows, state])

  const visibleStaffingIds = useMemo(() => new Set(filteredStaffingRows.map((row) => row.id)), [filteredStaffingRows])

  const filteredStaffingPlanning = useMemo(() => (
    staffingPlanning.filter((row) => visibleStaffingIds.has(row.id))
  ), [staffingPlanning, visibleStaffingIds])

  const activeFilterCount =
    (state.stage ? 1 : 0)
    + (state.priority ? 1 : 0)
    + (state.practice ? 1 : 0)
    + (isNeedsScope && state.sort === "acv" && state.direction ? 1 : 0)

  const handleToggleAcvSort = () => {
    const next = cycleAcvSort(state.sort, state.direction)
    setSort(next.sort, next.direction)
  }

  const handleMoveOpportunity = async (opportunityId: string, newStage: string) => {
    const result = await updateOpportunity({
      id: opportunityId,
      stage: newStage as Parameters<typeof updateOpportunity>[0]["stage"],
    })

    if (result.error) {
      console.error("Failed to update opportunity stage:", result.error)
      return
    }

    router.refresh()
  }

  const createAction = isNeedsScope
    ? <NewOpportunityButton fullWidth={isMobile} />
    : <NewStaffingButton openNeeds={sharedData.openNeeds} fullWidth={isMobile} />

  // Bouton flip kanban
  const kanbanFlipButton = (
    <button
      type="button"
      onClick={() => setKanbanDisplayMode((m) => m === "besoin" ? "candidat" : "besoin")}
      className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-medium)] border px-3 text-[length:var(--font-size-label-sm)] font-semibold transition-colors hover:opacity-85 active:scale-95 cursor-pointer select-none"
      style={{
        borderColor: kanbanDisplayMode === "besoin" ? "#FFC107" : "#9C27B0",
        backgroundColor: kanbanDisplayMode === "besoin" ? "rgba(255, 193, 7, 0.08)" : "rgba(156, 39, 176, 0.08)",
        color: kanbanDisplayMode === "besoin" ? "#D8A400" : "#9C27B0",
      }}
      title="Alterner entre la vue Besoin et la vue Candidat"
    >
      <svg className="size-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 5h12M2 11h12M11 2l3 3-3 3M5 8l-3 3 3 3" />
      </svg>
      <span className="capitalize">{kanbanDisplayMode === "besoin" ? "besoin" : "candidat"}</span>
    </button>
  )

  // Boutons planning : couche (cycle) + période (cycle)
  const PLANNING_LAYER_CYCLE: Array<"besoin" | "staffing" | "both"> = ["besoin", "staffing", "both"]
  const PLANNING_LAYER_LABELS: Record<string, string> = { besoin: "Besoin", staffing: "Staffing", both: "Besoin + Staffing" }
  const PLANNING_SCALE_CYCLE: Array<"month" | "quarter" | "year" | "week"> = ["month", "quarter", "year", "week"]
  const PLANNING_SCALE_LABELS: Record<string, string> = { month: "Période : Mois", quarter: "Période : Trimestre", year: "Période : Année", week: "Période : Semaine" }

  const getLayerButtonStyle = () => {
    switch (planningLayer) {
      case "besoin":
        return {
          borderColor: "#FFC107",
          backgroundColor: "rgba(255, 193, 7, 0.08)",
          color: "#D8A400",
        }
      case "staffing":
        return {
          borderColor: "#9C27B0",
          backgroundColor: "rgba(156, 39, 176, 0.08)",
          color: "#9C27B0",
        }
      case "both":
      default:
        return {
          borderColor: "#607D8B",
          backgroundColor: "rgba(96, 125, 139, 0.08)",
          color: "#455A64",
        }
    }
  }

  const planningLayerButtons = (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPlanningLayer((cur) => PLANNING_LAYER_CYCLE[(PLANNING_LAYER_CYCLE.indexOf(cur) + 1) % PLANNING_LAYER_CYCLE.length])}
        className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-medium)] border px-3 text-[length:var(--font-size-label-sm)] font-semibold transition-colors hover:opacity-85 active:scale-95 cursor-pointer select-none"
        style={getLayerButtonStyle()}
      >
        <svg className="size-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 5h12M2 11h12M11 2l3 3-3 3M5 8l-3 3 3 3" />
        </svg>
        {PLANNING_LAYER_LABELS[planningLayer]}
      </button>
      <button
        type="button"
        onClick={() => setPlanningScale((cur) => PLANNING_SCALE_CYCLE[(PLANNING_SCALE_CYCLE.indexOf(cur) + 1) % PLANNING_SCALE_CYCLE.length])}
        className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-medium)] border px-3 text-[length:var(--font-size-label-sm)] font-semibold transition-colors hover:opacity-85 active:scale-95 cursor-pointer select-none"
        style={{
          borderColor: "#FF5252",
          backgroundColor: "rgba(255, 82, 82, 0.08)",
          color: "#FF5252",
        }}
      >
        <svg className="size-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 4h10M3 8h6M3 12h8" />
        </svg>
        {PLANNING_SCALE_LABELS[planningScale]}
      </button>
    </div>
  )

  // Filtres liste (3 selects, practice rétréci)
  const listFilters = (
    <>
      <PageFilterSelect
        id="needs-staffing-stage"
        label="Étape"
        value={state.stage ?? "all"}
        onChange={(value) => setStage(value === "all" ? null : value)}
        options={stageOptions}
      />
      <PageFilterSelect
        id="needs-staffing-priority"
        label="Priorité"
        value={state.priority ?? "all"}
        onChange={(value) => setPriority(value === "all" ? null : value)}
        options={PRIORITY_OPTIONS}
      />
      <PageFilterSelect
        id="needs-staffing-practice"
        label="Practice"
        value={state.practice ?? "all"}
        onChange={(value) => setPractice(value === "all" ? null : value)}
        options={practiceOptions}
        className="sm:min-w-[7rem] sm:max-w-[9rem]"
      />
    </>
  )

  const desktopFilters = state.view === "list" ? listFilters : null

  return (
    <div className={cn(
      "mx-auto flex w-full max-w-7xl flex-col",
      isMobile ? "gap-4 px-4 py-4" : "gap-5 px-6 py-8",
    )}>
      <header className="border-b border-border/70 pb-4">
        {isMobile ? (
          <>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
              Besoins & Staffing
            </h1>
            <div className="mt-3">
              <ScopeSwitcher scope={state.scope} onChange={setScope} />
            </div>
            <div className="mt-4">
              <SharedKpis sharedData={sharedData} compact={isMobile} />
            </div>
          </>
        ) : (
          <>
            {/* Ligne 1 : titre + KPIs + bouton nouveau besoin */}
            <div className="flex items-center gap-4">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-heading shrink-0">
                Besoins & Staffing
              </h1>
              <div className="flex-1 flex items-center justify-center">
                <SharedKpis sharedData={sharedData} compact={false} />
              </div>
              <div className="shrink-0">
                {createAction}
              </div>
            </div>
            {/* Ligne 2 : sélecteur Besoins/Staffing */}
            <div className="mt-3">
              <ScopeSwitcher scope={state.scope} onChange={setScope} />
            </div>
          </>
        )}
      </header>

      {isMobile ? (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <MobileFilterTrigger
                activeCount={activeFilterCount}
                onClick={() => setMobileFiltersOpen(true)}
              />
              <PageViewSelector
                ariaLabel="Mode d'affichage Besoins & Staffing"
                items={[
                  { value: "list", label: "Liste" },
                  { value: "kanban", label: "Kanban" },
                  { value: "planning", label: "Planning" },
                ]}
                value={state.view}
                onChange={(value) => setView(value as "list" | "kanban" | "planning")}
              />
            </div>
            {createAction}
          </div>

          {isNeedsScope ? (
            state.view === "list" ? (
              <NeedsMobileCards rows={filteredNeedsRows} />
            ) : state.view === "kanban" ? (
              <OpportunitiesKanbanView
                opportunities={filteredNeedsPlanning}
                onMoveOpportunity={handleMoveOpportunity}
                displayMode="opportunities"
              />
            ) : (
              <OpportunitiesPlanningView opportunities={filteredNeedsPlanning} scale="month" />
            )
          ) : (
            state.view === "list" ? (
              <StaffingMobileCards rows={filteredStaffingRows} />
            ) : state.view === "kanban" ? (
              <StaffingKanbanView rows={filteredStaffingRows} displayMode="candidat" />
            ) : (
              <StaffingPlanningView planningData={filteredStaffingPlanning} scale="month" />
            )
          )}

          <AppDrawer
            open={mobileFiltersOpen}
            onOpenChange={setMobileFiltersOpen}
            side="bottom"
            title="Filtres"
          >
            <div className="flex flex-col gap-3">
              {desktopFilters}
              <Button variant="secondary" size="md" onClick={resetFilters}>
                Réinitialiser
              </Button>
            </div>
          </AppDrawer>
        </>
      ) : (
        <>
          <PageFilterBar
            activeCount={state.view === "list" ? activeFilterCount : 0}
            onReset={state.view === "list" ? resetFilters : undefined}
            viewSelector={(
              <PageViewSelector
                ariaLabel="Mode d'affichage Besoins & Staffing"
                items={[
                  { value: "list", label: "Liste" },
                  { value: "kanban", label: "Kanban" },
                  { value: "planning", label: "Planning" },
                ]}
                value={state.view}
                onChange={(value) => setView(value as "list" | "kanban" | "planning")}
              />
            )}
          >
            {state.view === "list" && desktopFilters}
            {state.view === "kanban" && kanbanFlipButton}
            {state.view === "planning" && planningLayerButtons}
          </PageFilterBar>

          {state.view === "list" ? (
            isNeedsScope ? (
              <NeedsListView
                rows={filteredNeedsRows}
                coverageByOpportunityId={sharedData.coverageByOpportunityId}
                acvDirection={state.sort === "acv" ? state.direction : null}
                onToggleAcvSort={handleToggleAcvSort}
              />
            ) : (
              <StaffingListWorkspaceView rows={filteredStaffingRows} />
            )
          ) : state.view === "kanban" ? (
            isNeedsScope ? (
              <OpportunitiesKanbanView
                opportunities={filteredNeedsPlanning}
                onMoveOpportunity={handleMoveOpportunity}
                displayMode={kanbanDisplayMode === "candidat" ? "consultants" : "opportunities"}
              />
            ) : (
              <StaffingKanbanView rows={filteredStaffingRows} displayMode={kanbanDisplayMode === "candidat" ? "candidat" : "opportunite"} />
            )
          ) : (
            // Planning : afficher selon la couche active
            <div className="flex flex-col gap-4">
              {(planningLayer === "besoin" || planningLayer === "both") && (
                <div>
                  {planningLayer === "both" && <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Besoins</p>}
                  <OpportunitiesPlanningView opportunities={filteredNeedsPlanning} scale={planningScale} />
                </div>
              )}
              {(planningLayer === "staffing" || planningLayer === "both") && (
                <div>
                  {planningLayer === "both" && <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Staffing</p>}
                  <StaffingPlanningView planningData={filteredStaffingPlanning} scale={planningScale} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

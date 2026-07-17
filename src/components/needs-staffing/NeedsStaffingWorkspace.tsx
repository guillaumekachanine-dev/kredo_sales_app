"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { OpportunityPlanningData } from "@/app/(app)/missions/_data/get-opportunities-planning"
import type { NeedsStaffingSharedData } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import type { StaffingListRow, MobileStaffingRow } from "@/app/(app)/staffing/_data/get-staffings-list"
import type { StaffingPlanningData } from "@/app/(app)/staffing/_data/get-staffings-planning"
import { updateOpportunity } from "@/app/(app)/missions/_actions/update-opportunity"
import { NewOpportunityButton } from "@/components/missions/NewOpportunityButton"
import { OpportunitiesKanbanView } from "@/components/missions/kanban/OpportunitiesKanbanView"
import { OpportunitiesPlanningView } from "@/components/missions/planning/OpportunitiesPlanningView"
import {
  FinancialModelingDesktopDialog,
  FinancialModelingMobileFlow,
  getFinancialModelForStaffingAction,
  type FinancialModelingLaunchPreset,
} from "@/features/financial-modeling"
import { isActivePositioningStatus } from "@/lib/needs-staffing/coverage"
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
import { UnifiedPlanningView } from "@/components/needs-staffing/UnifiedPlanningView"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { formatEuro } from "@/lib/formatters"

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

const EMPTY_NEEDS_ROWS: MissionsListRow[] = []
const EMPTY_NEEDS_PLANNING: OpportunityPlanningData[] = []
const EMPTY_STAFFING_ROWS: StaffingListRow[] = []
const EMPTY_STAFFING_PLANNING: StaffingPlanningData[] = []

const SearchIcon = () => (
  <svg
    className="size-4"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 14L16.5 16.5" />
    <circle cx="9" cy="9" r="6.5" />
  </svg>
)

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
  mobileStaffingRows?: MobileStaffingRow[]
}

const STATUS_LABELS: Record<string, string> = {
  identifie: "Identifié",
  propose_interne: "Proposé en interne",
  preselectionne: "Présélectionné",
  envoye_client: "CV envoyé",
  entretien_planifie: "Entretien client",
  entretien_realise: "Entretien client",
  retenu: "Retenu",
  gagne: "Gagné",
  refuse_client: "Refus client",
  refuse_candidat: "Refus candidat",
  abandonne: "Abandonné",
}

function MiniKpi({
  label,
  value,
  compact,
}: {
  label: string
  value: React.ReactNode
  compact: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface",
        compact ? "min-w-0 px-2 py-1.5" : "min-w-[7rem] px-4 py-1.5",
      )}
    >
      <p className={cn(
        "font-medium uppercase tracking-wider text-muted leading-none",
        compact ? "text-[8px]" : "text-[10px]",
      )}>
        {label}
      </p>
      <p className={cn(
        "font-heading font-bold leading-none tracking-tight text-heading",
        compact ? "mt-0.5 text-[15px]" : "mt-1 text-lg",
      )}>
        {value}
      </p>
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
    <div className={cn(compact ? "grid grid-cols-3 gap-2" : "flex gap-2")}>
      <MiniKpi label="Besoins ouverts" value={sharedData.kpis.openNeedsCount} compact={compact} />
      <MiniKpi label="Positionnements" value={sharedData.kpis.activePositioningsCount} compact={compact} />
      <MiniKpi label="Couverture" value={`${sharedData.kpis.coverageRate}%`} compact={compact} />
    </div>
  )
}

function NeedsMobileCards({
  rows,
  staffingRows,
  onLaunchFinancialSimulation,
}: {
  rows: MissionsListRow[]
  staffingRows: Array<StaffingListRow | MobileStaffingRow>
  onLaunchFinancialSimulation: (staffing: any) => void
}) {
  const { openOpportunityDrawer, openStaffingDrawer } = useStaffingDrawerStore()
  const [expandedNeedIds, setExpandedNeedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (needId: string) => {
    setExpandedNeedIds((prev) => {
      const next = new Set(prev)
      if (next.has(needId)) {
        next.delete(needId)
      } else {
        next.add(needId)
      }
      return next
    })
  }

  const needStaffings = useMemo(() => {
    const map = new Map<string, Array<StaffingListRow | MobileStaffingRow>>()
    for (const s of staffingRows) {
      if (!s.opportunityId) continue
      if (!isActivePositioningStatus(s.status)) continue
      const list = map.get(s.opportunityId) ?? []
      list.push(s)
      map.set(s.opportunityId, list)
    }
    return map
  }, [staffingRows])

  if (rows.length === 0) {
    return <div className="py-12 text-center text-sm text-muted">Aucun besoin ne correspond aux filtres.</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const activeStaffings = needStaffings.get(row.entityId) || []
        const hasStaffings = activeStaffings.length > 0
        const isExpanded = expandedNeedIds.has(row.entityId)

        return (
          <article
            key={row.entityId}
            className="relative overflow-hidden rounded-[var(--radius-medium)] border bg-surface flex flex-col transition-all duration-150"
            style={{
              borderColor: "color-mix(in srgb, var(--color-brand-ember) 55%, var(--color-border))",
              background: "color-mix(in srgb, var(--color-brand-ember) 2%, var(--color-surface))",
            }}
          >
            <div className="flex w-full items-stretch">
              {hasStaffings ? (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`mobile-staffing-rows-${row.entityId}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpand(row.entityId)
                  }}
                  className="flex w-12 shrink-0 items-center justify-center border-r border-border/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  style={{ minHeight: "44px" }}
                >
                  <svg
                    className={cn(
                      "h-4 w-4 text-muted transition-transform duration-200",
                      isExpanded ? "rotate-90" : "rotate-0"
                    )}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ) : (
                <div className="w-12 shrink-0 border-r border-border/50" />
              )}

              <div
                onClick={() => openOpportunityDrawer(row.entityId, "besoin")}
                className="flex-1 min-w-0 p-3 flex flex-col gap-1 cursor-pointer hover:bg-surface-hover/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-bold text-heading">{row.client}</span>
                  <CompanyLogo
                    name={row.client || "Client"}
                    logoPath={row.clientLogoPath}
                    website={row.clientWebsite}
                    size="sm"
                  />
                </div>
                <p className="line-clamp-2 text-[13px] font-semibold leading-[1.2] text-body mt-0.5">
                  {row.title}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-medium text-muted mt-1.5">
                  <span className="truncate text-heading">
                    {row.seniority ?? row.subtitle ?? row.practice ?? "Profil non renseigné"}
                  </span>
                  <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--color-brand-ember)]" aria-hidden="true" />
                  <span className="shrink-0 text-heading">
                    {row.targetDailyRate !== null && row.targetDailyRate !== undefined
                      ? `${formatEuro(row.targetDailyRate)} / j`
                      : "TJM non renseigné"}
                  </span>
                  <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--color-brand-ember)]" aria-hidden="true" />
                  <span className="shrink-0 text-heading">
                    {row.priority === "haute" ? "Haute" : row.priority === "basse" ? "Basse" : "Normale"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-3 pb-2.5 pt-1 border-t border-border/40 gap-2">
              <Link
                href={`/missions/opps/${row.entityId}`}
                className="inline-flex h-9 items-center justify-center rounded-[var(--radius-small)] border border-primary bg-primary px-3 text-[11px] font-semibold text-primary-fg shadow-[0_5px_12px_-9px_rgba(19,75,200,0.9)] transition-all duration-200 hover:-translate-y-px hover:border-primary-deep hover:bg-primary-deep"
                aria-label={`Fiche détails : ${row.title}`}
              >
                Fiche détails
              </Link>
            </div>

            {isExpanded && activeStaffings.length > 0 && (
              <div
                id={`mobile-staffing-rows-${row.entityId}`}
                className="flex flex-col gap-2 p-2 border-t border-border/50 bg-neutral-50/50 dark:bg-neutral-900/50"
              >
                {activeStaffings.map((staffing) => (
                  <div
                    key={staffing.id}
                    onClick={() => openStaffingDrawer(staffing.id)}
                    className="rounded-lg border p-3 flex flex-col gap-2 transition-colors hover:bg-surface-hover/20 cursor-pointer"
                    style={{
                      borderColor: "color-mix(in srgb, var(--color-case-candidate) 22%, var(--color-border))",
                      backgroundColor: "color-mix(in srgb, var(--color-case-candidate) 4%, var(--color-surface))",
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-heading">{staffing.fullName}</span>
                      <span className="text-[11px] text-muted">{staffing.profileTitle ?? "—"}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-border/30 pt-2 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-wider text-muted font-bold">Practice</span>
                        <span className="font-medium text-body">{staffing.profilePractice ?? "—"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-wider text-muted font-bold">Étape</span>
                        <span className="font-semibold text-body">{STATUS_LABELS[staffing.status] ?? staffing.status}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-wider text-muted font-bold">Disponible le</span>
                        <span className="font-medium text-body">{staffing.availableFrom ?? "—"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-wider text-muted font-bold">Salaire</span>
                        <span className="font-semibold text-heading">{formatEuro(staffing.salary)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2 pt-2 border-t border-border/20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openStaffingDrawer(staffing.id)
                        }}
                        className="flex-1 inline-flex h-11 items-center justify-center rounded-[var(--radius-small)] border border-border bg-surface px-3 text-xs font-semibold text-heading shadow-sm hover:bg-surface-hover active:scale-[0.98] transition-all"
                      >
                        Ouvrir le staffing
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onLaunchFinancialSimulation(staffing)
                        }}
                        className="flex-1 inline-flex h-11 items-center justify-center rounded-[var(--radius-small)] border border-primary bg-primary text-primary-fg px-3 text-xs font-semibold shadow-sm hover:bg-primary-deep active:scale-[0.98] transition-all"
                      >
                        Simulation financière
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function matchesNeedSearch(row: MissionsListRow, query: string) {
  if (!query) return true

  return [
    row.client,
    row.title,
    row.subtitle,
    row.practice,
    row.seniority,
    row.priority,
    row.stage,
    row.targetDailyRate,
  ].some((value) => normalizeSearchValue(value).includes(query))
}

export function NeedsStaffingWorkspace({
  device,
  sharedData,
  needsData,
  staffingData,
  mobileStaffingRows,
}: NeedsStaffingWorkspaceProps) {
  const isMobile = device === "mobile"
  const router = useRouter()
  const { state, setScope, setView, setStage, setPriority, setPractice, setSort, resetFilters } =
    useNeedsStaffingUrlState()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileSearch, setMobileSearch] = useState("")
  const mobileSearchId = useId()
  // Kanban flip: "besoin" = face avant, "candidat" = face arrière
  const [kanbanDisplayMode, setKanbanDisplayMode] = useState<"besoin" | "candidat">("besoin")
  // Planning layer cycle: besoin → staffing → both
  const [planningLayer, setPlanningLayer] = useState<"besoin" | "staffing" | "both">("both")
  // Planning scale cycle: month → quarter → year → week
  const [planningScale, setPlanningScale] = useState<"month" | "quarter" | "year" | "week">("month")

  const [simulation, setSimulation] = useState<{
    modelId: string | null
    preset: FinancialModelingLaunchPreset
  } | null>(null)

  const needsRows = needsData?.rows ?? EMPTY_NEEDS_ROWS
  const needsPlanning = needsData?.planningData ?? EMPTY_NEEDS_PLANNING
  const staffingRows = staffingData?.rows ?? EMPTY_STAFFING_ROWS
  const staffingPlanning = staffingData?.planningData ?? EMPTY_STAFFING_PLANNING

  const handleLaunchFinancialSimulation = async (staffing: any) => {
    const candidateId = staffing.candidateId
    const candidateName = staffing.fullName
    const salary = staffing.salary
    const opportunityId = staffing.opportunityId

    const opportunity = needsRows.find((o) => o.entityId === opportunityId)
    const companyId = opportunity?.companyId ?? staffing.companyId ?? null
    const salesDailyRate = opportunity?.targetDailyRate ?? staffing.opportunityTargetDailyRate ?? null

    const result = await getFinancialModelForStaffingAction(opportunityId, candidateId)
    if (!result.success) {
      alert(result.error || "Impossible de charger la simulation financière.")
      return
    }

    setSimulation({
      modelId: result.id ?? null,
      preset: {
        mode: "flash",
        title: `Simulation financière — ${candidateName}`,
        candidateId,
        candidateName,
        annualGrossSalary: salary,
        companyId,
        opportunityId,
        salesDailyRate,
      },
    })
  }

  const practiceOptions = useMemo(() => {
    const uniquePractices = [...new Set(needsRows.map((row) => row.practice).filter(Boolean))]

    return [
      { value: "all", label: "Practice" },
      ...uniquePractices.map((practice) => ({ value: practice!, label: practice! })),
    ]
  }, [needsRows])

  const stageOptions = [
    { value: "all", label: "Étape" },
    ...OPPORTUNITY_STAGES.map((stage) => ({
      value: stage.value,
      label: stage.label,
    })),
  ]

  const filteredNeedsRows = useMemo(() => (
    filterNeedsRows(needsRows, state)
  ), [needsRows, state])

  const mobileSearchQuery = normalizeSearchValue(mobileSearch.trim())
  const mobileNeedsRows = useMemo(() => (
    filteredNeedsRows.filter((row) => matchesNeedSearch(row, mobileSearchQuery))
  ), [filteredNeedsRows, mobileSearchQuery])

  const filteredNeedsPlanning = useMemo(() => (
    filterNeedsRows(needsPlanning, {
      stage: state.stage,
      priority: state.priority,
      practice: state.practice,
      sort: null,
      direction: null,
    })
  ), [needsPlanning, state.practice, state.priority, state.stage])

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
    + (state.sort === "acv" && state.direction ? 1 : 0)

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

  const createAction = (
    <NewOpportunityButton
      fullWidth={false}
      iconOnly={isMobile}
      className={isMobile ? "h-9 w-9 rounded-[var(--radius-medium)] px-0 text-base" : undefined}
    />
  )

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
          </>
        )}
      </header>

      {isMobile ? (
        <>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <label htmlFor={mobileSearchId} className="sr-only">
                Rechercher un besoin
              </label>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                id={mobileSearchId}
                type="search"
                value={mobileSearch}
                onChange={(event) => setMobileSearch(event.target.value)}
                placeholder="Rechercher"
                className="h-9 w-full rounded-[var(--radius-medium)] border border-border bg-surface pl-9 pr-3 text-sm text-body placeholder:text-muted outline-none transition-colors focus:border-primary/50 focus:ring-[var(--focus-ring-width)] focus:ring-[var(--focus-ring-color)]"
              />
            </div>
            <MobileFilterTrigger
              activeCount={activeFilterCount}
              onClick={() => setMobileFiltersOpen(true)}
              iconOnly
            />
            <div className="shrink-0">
              {createAction}
            </div>
          </div>

          <NeedsMobileCards
            rows={mobileNeedsRows}
            staffingRows={mobileStaffingRows || []}
            onLaunchFinancialSimulation={handleLaunchFinancialSimulation}
          />

          <AppDrawer
            open={mobileFiltersOpen}
            onOpenChange={setMobileFiltersOpen}
            side="bottom"
            title="Filtres"
          >
            <div className="flex flex-col gap-3">
              {listFilters}
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
            <NeedsListView
              rows={filteredNeedsRows}
              staffingRows={staffingRows}
              coverageByOpportunityId={sharedData.coverageByOpportunityId}
              acvDirection={state.sort === "acv" ? state.direction : null}
              onToggleAcvSort={handleToggleAcvSort}
              onLaunchFinancialSimulation={handleLaunchFinancialSimulation}
            />
          ) : state.view === "kanban" ? (
            <OpportunitiesKanbanView
              opportunities={filteredNeedsPlanning}
              onMoveOpportunity={handleMoveOpportunity}
              displayMode={kanbanDisplayMode === "candidat" ? "consultants" : "opportunities"}
            />
          ) : (
            // Planning : afficher selon la couche active
            <div className="flex flex-col gap-4">
              {planningLayer === "both" ? (
                <UnifiedPlanningView
                  opportunities={filteredNeedsPlanning}
                  staffingData={filteredStaffingPlanning}
                  scale={planningScale}
                />
              ) : planningLayer === "besoin" ? (
                <OpportunitiesPlanningView opportunities={filteredNeedsPlanning} scale={planningScale} />
              ) : (
                <StaffingPlanningView planningData={filteredStaffingPlanning} scale={planningScale} />
              )}
            </div>
          )}
        </>
      )}

      {simulation && (
        isMobile ? (
          <FinancialModelingMobileFlow
            open={simulation !== null}
            onOpenChange={(open) => !open && setSimulation(null)}
            initialId={simulation.modelId ?? undefined}
            initialPreset={simulation.preset}
          />
        ) : (
          <FinancialModelingDesktopDialog
            open={simulation !== null}
            onOpenChange={(open) => !open && setSimulation(null)}
            initialId={simulation.modelId ?? undefined}
            initialPreset={simulation.preset}
          />
        )
      )}
    </div>
  )
}

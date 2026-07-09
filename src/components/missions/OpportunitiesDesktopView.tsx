"use client"

import { useState, useMemo, useEffect, useTransition } from "react"
import { cn } from "@/lib/utils"
import { type StructuredListColumn } from "@/components/ui/StructuredList"
import { Badge } from "@/components/ui/Badge"
import { EntityListView } from "@/components/common/EntityListView"
import { EntityWorkspaceTemplate } from "@/components/common/EntityWorkspaceTemplate"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { PRIORITY_LABELS } from "@/components/missions/opportunity-detail/opportunity-detail-options"
import type { MissionsListRow } from "@/components/missions/MissionsListView"
import { MissionsMobileListView } from "@/components/missions/MissionsMobileListView"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { OpportunitiesPlanningView } from "@/components/missions/planning/OpportunitiesPlanningView"
import type { OpportunityPlanningData } from "@/app/(app)/missions/_data/get-opportunities-planning"
import { OpportunitiesKanbanView } from "@/components/missions/kanban/OpportunitiesKanbanView"
import { updateOpportunity } from "@/app/(app)/missions/_actions/update-opportunity"
import { Button } from "@/components/ui/Button"
import { AppDialog } from "@/components/ui/AppDialog"
import { Select } from "@/components/ui/Select"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { NewOpportunityButton } from "@/components/missions/NewOpportunityButton"
import { addOpportunityEvent } from "@/app/(app)/missions/_actions/opportunity-events"
import {
  getAllCollaboratorsForStaffing,
  searchOpportunityStaffingProfiles,
  createOpportunityStaffing,
  type StaffingSearchResult,
} from "@/app/(app)/missions/_actions/opportunity-staffing"
import { formatEuroCompact } from "@/lib/formatters"
import {
  getOpportunityStageColor,
  getOpportunityStageLabel,
  isTerminalOpportunityStage,
  OPPORTUNITY_STAGES,
  type SalesStage,
} from "@/lib/opportunities/stages"

function StagePill({ stage, label }: { stage: string; label: string }) {
  const color = getOpportunityStageColor(stage)
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[length:var(--font-size-label-sm)] font-medium leading-[var(--line-height-label-sm)]"
      style={{ color }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </span>
  )
}

// ─── Mapping Priorité → Badge ─────────────────────────────────────────────────

type BadgeVariant = "neutral" | "brand" | "info" | "success" | "warning" | "danger"
const PRIORITY_BADGE: Record<string, BadgeVariant> = {
  haute:   "warning",
  normale: "neutral",
  basse:   "neutral",
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface OpportunitiesDesktopViewProps {
  opportunities: MissionsListRow[]
  planningData: OpportunityPlanningData[]
  weightedPipe: number
  openOpportunitiesCount: number
  coverageRate: number
  isMobile: boolean
}

function StatChip({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex min-w-[8.75rem] shrink-0 flex-col justify-center rounded-[var(--radius-large)] border border-border bg-surface px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <span className="mt-1 whitespace-nowrap font-heading text-[18px] font-bold leading-none tracking-tight text-heading tabular-nums">
        {value}
      </span>
    </div>
  )
}

export function OpportunitiesDesktopView({
  opportunities: initialOpps,
  planningData: initialPlanning,
  weightedPipe,
  openOpportunitiesCount,
  coverageRate,
  isMobile,
}: OpportunitiesDesktopViewProps) {
  const { openTab } = useMissionsTabStore()

  const [opps, setOpps] = useState(initialOpps)
  const [planningData, setPlanningData] = useState(initialPlanning)

  // Sync state with props when they change
  useEffect(() => {
    // Local optimistic state must re-sync when the server payload changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpps(initialOpps)
  }, [initialOpps])

  useEffect(() => {
    // Local optimistic state must re-sync when the server payload changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlanningData(initialPlanning)
  }, [initialPlanning])

  const [viewMode, setViewMode] = useState<"list" | "kanban" | "planning">("list")
  const [planningScale, setPlanningScale] = useState<"year" | "quarter" | "month" | "week">("month")
  const [stageFilter, setStageFilter]       = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [convictionFilter, setConvictionFilter] = useState("all")
  const [valueSort, setValueSort] = useState("none")

  // States for event creation modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)

  const [isPending, startTransition] = useTransition()
  const [eventError, setEventError] = useState<string | null>(null)

  const [selectedOpportunityId, setSelectedOpportunityId] = useState("")
  const [eventType, setEventType] = useState("appel")
  const [eventDate, setEventDate] = useState("")
  const [eventBody, setEventBody] = useState("")

  const openOpportunities = useMemo(() => {
    return opps.filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage))
  }, [opps])

  const handleOpenEventModal = () => {
    setSelectedOpportunityId("")
    setEventType("appel")
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    setEventDate(localNow)
    setEventBody("")
    setEventError(null)
    setIsEventModalOpen(true)
  }

  const handleCreateEvent = () => {
    setEventError(null)
    if (!selectedOpportunityId) {
      setEventError("Veuillez sélectionner une opportunité.")
      return
    }
    if (!eventType) {
      setEventError("Veuillez sélectionner un type d'événement.")
      return
    }

    startTransition(async () => {
      const result = await addOpportunityEvent({
        opportunity_id: selectedOpportunityId,
        event_type: eventType,
        body: eventBody,
        occurred_at: eventDate || null,
      })

      if (result.error) {
        setEventError(result.error)
      } else {
        setIsEventModalOpen(false)
      }
    })
  }

  // Kanban display mode ("opportunities" or "consultants")
  const [kanbanDisplayMode, setKanbanDisplayMode] = useState<"opportunities" | "consultants">("opportunities")

  // Staffing Modal States
  const [isStaffingModalOpen, setIsStaffingModalOpen] = useState(false)
  const [staffingError, setStaffingError] = useState<string | null>(null)
  const [isSearchingStaffing, setIsSearchingStaffing] = useState(false)
  const [selectedStaffingOppId, setSelectedStaffingOppId] = useState("")
  const [staffingSourceType, setStaffingSourceType] = useState<"collaborator" | "candidate">("collaborator")
  const [staffingQuery, setStaffingQuery] = useState("")
  const [selectedProfile, setSelectedProfile] = useState<StaffingSearchResult | null>(null)
  const [staffingSearchResults, setStaffingSearchResults] = useState<StaffingSearchResult[]>([])
  const [allCollaborators, setAllCollaborators] = useState<StaffingSearchResult[]>([])

  const handleOpenStaffingModal = async () => {
    setSelectedStaffingOppId("")
    setStaffingSourceType("collaborator")
    setStaffingQuery("")
    setSelectedProfile(null)
    setStaffingError(null)
    setStaffingSearchResults([])
    setIsStaffingModalOpen(true)

    if (allCollaborators.length === 0) {
      setIsSearchingStaffing(true)
      try {
        const data = await getAllCollaboratorsForStaffing()
        setAllCollaborators(data)
        setStaffingSearchResults(data)
      } catch (err) {
        console.error("Failed to load collaborators:", err)
      } finally {
        setIsSearchingStaffing(false)
      }
    } else {
      setStaffingSearchResults(allCollaborators)
    }
  }

  const handleStaffingQueryChange = async (value: string, type: "collaborator" | "candidate") => {
    setStaffingQuery(value)
    setSelectedProfile(null)

    if (value.trim().length === 0) {
      if (type === "collaborator") {
        setStaffingSearchResults(allCollaborators)
      } else {
        setStaffingSearchResults([])
      }
      return
    }

    if (type === "collaborator") {
      const q = value.trim().toLowerCase()
      setStaffingSearchResults(
        allCollaborators.filter(
          (c) =>
            c.full_name.toLowerCase().includes(q) ||
            (c.subtitle || "").toLowerCase().includes(q)
        )
      )
    } else {
      setIsSearchingStaffing(true)
      try {
        const results = await searchOpportunityStaffingProfiles(value.trim(), type)
        setStaffingSearchResults(results)
      } catch (err) {
        console.error("Failed to search candidates:", err)
      } finally {
        setIsSearchingStaffing(false)
      }
    }
  }

  const handleCreateStaffing = () => {
    setStaffingError(null)
    if (!selectedStaffingOppId) {
      setStaffingError("Veuillez sélectionner une opportunité.")
      return
    }
    if (!selectedProfile) {
      setStaffingError("Veuillez rechercher et sélectionner un profil.")
      return
    }

    startTransition(async () => {
      const result = await createOpportunityStaffing({
        opportunity_id: selectedStaffingOppId,
        source_type: selectedProfile.source_type,
        source_id: selectedProfile.id,
      })

      if (result.error) {
        setStaffingError(result.error)
      } else {
        setIsStaffingModalOpen(false)
      }
    })
  }

  const handleMoveOpportunity = async (opportunityId: string, newStage: string) => {
    const previousOpps = opps
    const previousPlanning = planningData

    // Optimistic UI updates
    setOpps((prev) =>
      prev.map((o) => (o.entityId === opportunityId ? { ...o, stage: newStage } : o))
    )
    setPlanningData((prev) =>
      prev.map((o) => (o.id === opportunityId ? { ...o, stage: newStage } : o))
    )

    const res = await updateOpportunity({
      id: opportunityId,
      stage: newStage as SalesStage,
    })

    if (res.error) {
      console.error("Failed to update opportunity stage:", res.error)
      setOpps(previousOpps)
      setPlanningData(previousPlanning)
    }
  }

  const filteredPlanningData = useMemo(() => {
    return planningData.filter((opp) => {
      if (stageFilter !== "all" && opp.stage !== stageFilter) return false
      if (priorityFilter !== "all" && opp.priority !== priorityFilter) return false
      if (convictionFilter !== "all") {
        if (convictionFilter === "under_70" && opp.conviction >= 70) return false
        if (convictionFilter === "above_70" && opp.conviction < 70) return false
      }
      return true
    })
  }, [planningData, stageFilter, priorityFilter, convictionFilter])

  const filtered = useMemo(
    () => {
      let result = opps.filter(
        (row) =>
          (stageFilter === "all" || row.stage === stageFilter) &&
          (priorityFilter === "all" || row.priority === priorityFilter) &&
          (convictionFilter === "all" ||
            (convictionFilter === "under_70" && (row.conviction ?? 0) < 70) ||
            (convictionFilter === "above_70" && (row.conviction ?? 0) >= 70)),
      )

      if (valueSort === "desc") {
        result = [...result].sort((a, b) => {
          const valA = a.acv ?? a.estimatedGain ?? 0
          const valB = b.acv ?? b.estimatedGain ?? 0
          return valB - valA
        })
      } else if (valueSort === "asc") {
        result = [...result].sort((a, b) => {
          const valA = a.acv ?? a.estimatedGain ?? 0
          const valB = b.acv ?? b.estimatedGain ?? 0
          return valA - valB
        })
      }

      return result
    },
    [opps, stageFilter, priorityFilter, convictionFilter, valueSort],
  )

  const activeFilterCount =
    (stageFilter !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (convictionFilter !== "all" ? 1 : 0) +
    (valueSort !== "none" ? 1 : 0)

  const handleReset = () => {
    setStageFilter("all")
    setPriorityFilter("all")
    setConvictionFilter("all")
    setValueSort("none")
  }

  // ── Colonnes ────────────────────────────────────────────────────────────────
  const columns: StructuredListColumn<MissionsListRow>[] = [
    {
      id: "client",
      header: "Compte",
      width: "14rem",
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <CompanyLogo
            name={row.client || "Client"}
            logoPath={row.clientLogoPath}
            website={row.clientWebsite}
            size="sm"
          />
          <span className="font-bold text-heading truncate">{row.client ?? "—"}</span>
        </div>
      ),
    },
    {
      id: "title",
      header: "Opportunité",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-body group-hover:text-primary transition-colors duration-150">
            {row.title}
          </span>
          {row.subtitle && (
            <span className="text-[10px] text-muted">{row.subtitle}</span>
          )}
        </div>
      ),
    },
    {
      id: "stage",
      header: "Étape",
      width: "11.5rem",
      render: (row) => {
        const stage = row.stage ?? ""
        const label = getOpportunityStageLabel(stage)
        return <StagePill stage={stage} label={label} />
      },
    },
    {
      id: "conviction",
      header: "Conviction",
      align: "center",
      width: "9rem",
      render: (row) => {
        const pct = row.conviction ?? 0
        return (
          <div className="flex items-center justify-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary/70 transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-right font-medium tabular-nums text-heading">
              {pct}%
            </span>
          </div>
        )
      },
    },
    {
      id: "acv",
      header: "Valeur (ACV)",
      align: "center",
      render: (row) => (
        <span className="font-medium tabular-nums text-heading">{row.amount ?? "—"}</span>
      ),
    },
    {
      id: "tjm",
      header: "TJM cible",
      align: "center",
      width: "6rem",
      render: (row) =>
        row.targetDailyRate ? (
          <span className="tabular-nums text-body">{row.targetDailyRate} €</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      id: "date",
      header: "Clôture",
      align: "center",
      width: "7.5rem",
      render: (row) => {
        const dateVal = row.targetCloseDate
        if (!dateVal) return <span className="text-muted">—</span>
        const parts = dateVal.split("-")
        if (parts.length < 3) return <span className="text-muted">—</span>
        const day = parts[2].slice(0, 2)
        const month = parts[1]
        return <span className="text-body font-medium">{`${day}/${month}`}</span>
      },
    },
    {
      id: "priority",
      header: "Priorité",
      align: "center",
      width: "6.5rem",
      render: (row) => {
        const priority = row.priority ?? ""
        const label = PRIORITY_LABELS[priority]
        if (!label) return <span className="text-muted">—</span>
        const variant = PRIORITY_BADGE[priority] ?? "neutral"
        return (
          <Badge variant={variant} size="sm">
            {label}
          </Badge>
        )
      },
    },
  ]

  return (
    <>
      <EntityWorkspaceTemplate
        title="Opportunités"
        isMobile={isMobile}
        kpis={
          <>
            <StatChip
              label="Pipe pondéré"
              value={weightedPipe > 0 ? formatEuroCompact(weightedPipe) : "—"}
            />
            <StatChip label="Opportunités ouvertes" value={String(openOpportunitiesCount)} />
            <StatChip label="Taux de couverture" value={`${coverageRate}%`} />
          </>
        }
        actions={<NewOpportunityButton />}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        controlsClassName={viewMode === "list" ? undefined : "[&>*]:h-8 [&>*]:shrink-0"}
        activeFilterCount={activeFilterCount}
        onResetFilters={handleReset}
        filters={
          viewMode === "list" ? (
            <>
              <PageFilterSelect
                id="opp-stage-filter"
                label="Étape"
                value={stageFilter}
                onChange={setStageFilter}
                className="sm:min-w-[8.25rem]"
                options={[
                  { value: "all", label: "Étape" },
                  ...OPPORTUNITY_STAGES.map((stage) => ({
                    value: stage.value,
                    label: stage.label,
                  })),
                ]}
              />
              <PageFilterSelect
                id="opp-priority-filter"
                label="Priorité"
                value={priorityFilter}
                onChange={setPriorityFilter}
                className="sm:min-w-[8.25rem]"
                options={[
                  { value: "all", label: "Priorité" },
                  { value: "haute", label: "Haute" },
                  { value: "normale", label: "Normale" },
                  { value: "basse", label: "Basse" },
                ]}
              />
              <PageFilterSelect
                id="opp-conviction-filter"
                label="Conviction"
                value={convictionFilter}
                onChange={setConvictionFilter}
                className="sm:min-w-[8.25rem]"
                options={[
                  { value: "all", label: "Conviction" },
                  { value: "under_70", label: "< 70 %" },
                  { value: "above_70", label: "> 70 %" },
                ]}
              />
              <PageFilterSelect
                id="opp-value-sort"
                label="Valeur"
                value={valueSort}
                onChange={setValueSort}
                className="sm:min-w-[8.25rem]"
                options={[
                  { value: "none", label: "Valeur (ACV)" },
                  { value: "desc", label: "Tri décroissant" },
                  { value: "asc", label: "Tri croissant" },
                ]}
              />
            </>
          ) : viewMode === "planning" ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenEventModal}
                leftIcon={
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                }
              >
                Créer un événement
              </Button>
              <div className="flex items-center gap-1.5 select-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brass opacity-85">
                  Échelle
                </span>
                <Select
                  id="opp-planning-scale-select"
                  value={planningScale}
                  onChange={(event) => setPlanningScale(event.target.value as any)}
                  size="sm"
                  className="text-brand-brass border-brand-brass bg-brand-brass/[0.08] hover:bg-brand-brass/[0.12] w-auto font-sans"
                >
                  <option value="week">Semaine</option>
                  <option value="month">Mois</option>
                  <option value="quarter">Trimestre</option>
                  <option value="year">Année</option>
                </Select>
              </div>
            </>
          ) : viewMode === "kanban" ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenStaffingModal}
                leftIcon={
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                }
              >
                Créer staffing
              </Button>
              <button
                type="button"
                onClick={() => setKanbanDisplayMode((mode) => (mode === "opportunities" ? "consultants" : "opportunities"))}
                className="inline-flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-medium)] border border-brand-brass bg-brand-brass/[0.08] px-3 text-brand-brass transition-colors hover:bg-brand-brass/[0.15] active:scale-95"
                title={`Basculer vers ${kanbanDisplayMode === "opportunities" ? "Consultants" : "Opportunités"}`}
              >
                <svg
                  className={cn("size-3.5 transition-transform duration-500", kanbanDisplayMode === "consultants" && "rotate-180")}
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
                  {kanbanDisplayMode === "opportunities" ? "Opportunités" : "Consultants"}
                </span>
              </button>
            </>
          ) : null
        }
        secondaryActions={null}
        listView={
          <EntityListView
            items={filtered}
            columns={columns}
            getItemId={(row) => row.entityId}
            onItemClick={(row) =>
              openTab({
                entityType: row.entityType,
                entityId: row.entityId,
                title: row.client ?? row.title,
                subtitle: row.title,
              })
            }
            ariaLabel="Liste des opportunités"
            emptyState="Aucune opportunité ne correspond aux filtres."
          />
        }
        kanbanView={
          <OpportunitiesKanbanView
            opportunities={filteredPlanningData}
            onMoveOpportunity={handleMoveOpportunity}
            displayMode={kanbanDisplayMode}
          />
        }
        planningView={<OpportunitiesPlanningView opportunities={filteredPlanningData} scale={planningScale} />}
        mobileView={
          <MissionsMobileListView
            rows={initialOpps}
            emptyMessage="Aucune opportunité pour l'instant. Créez votre première opportunité pour initialiser le pipeline."
          />
        }
      />

      {/* Event creation modal */}
      <AppDialog
        open={isEventModalOpen}
        onOpenChange={setIsEventModalOpen}
        title="Créer un événement"
        description="Ajouter une interaction ou un jalon lié à une opportunité ouverte."
        footer={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsEventModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isPending}
              onClick={handleCreateEvent}
            >
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {eventError && (
            <div className="rounded-[var(--radius-medium)] border border-danger/25 bg-danger/[0.08] p-3 text-xs text-danger font-medium">
              {eventError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-opp-id" className="text-xs font-semibold text-heading">
              Opportunité <span className="text-danger">*</span>
            </label>
            <Select
              id="modal-opp-id"
              value={selectedOpportunityId}
              onChange={(e) => setSelectedOpportunityId(e.target.value)}
              fullWidth
            >
              <option value="" disabled>
                Sélectionner une opportunité...
              </option>
              {openOpportunities.map((o) => (
                <option key={o.entityId} value={o.entityId}>
                  {o.client ? `${o.client} — ${o.title}` : o.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-event-type" className="text-xs font-semibold text-heading">
              Type d&apos;événement <span className="text-danger">*</span>
            </label>
            <Select
              id="modal-event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              fullWidth
            >
              <option value="appel">📞 Appel</option>
              <option value="email">✉️ Email</option>
              <option value="rdv_client">🤝 RDV client</option>
              <option value="relance">🔄 Relance</option>
              <option value="envoi_cv">📤 Envoi CV</option>
              <option value="entretien_client">👥 Entretien client</option>
              <option value="proposition">📄 Proposition</option>
              <option value="signature">✒️ Signature</option>
              <option value="note">📝 Note / Autre</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-event-date" className="text-xs font-semibold text-heading">
              Date et heure <span className="text-danger">*</span>
            </label>
            <Input
              id="modal-event-date"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              fullWidth
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-event-body" className="text-xs font-semibold text-heading">
              Description / Notes
            </label>
            <Textarea
              id="modal-event-body"
              placeholder="Rédiger un compte-rendu ou des remarques sur cette interaction..."
              value={eventBody}
              onChange={(e) => setEventBody(e.target.value)}
              rows={3}
              fullWidth
            />
          </div>
        </div>
      </AppDialog>

      {/* Staffing creation modal */}
      <AppDialog
        open={isStaffingModalOpen}
        onOpenChange={setIsStaffingModalOpen}
        title="Créer un staffing"
        description="Associer un collaborateur ou un candidat externe à une opportunité ouverte."
        footer={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsStaffingModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isPending}
              onClick={handleCreateStaffing}
            >
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {staffingError && (
            <div className="rounded-[var(--radius-medium)] border border-danger/25 bg-danger/[0.08] p-3 text-xs text-danger font-medium">
              {staffingError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="staffing-opp-id" className="text-xs font-semibold text-heading">
              Opportunité <span className="text-danger">*</span>
            </label>
            <Select
              id="staffing-opp-id"
              value={selectedStaffingOppId}
              onChange={(e) => setSelectedStaffingOppId(e.target.value)}
              fullWidth
            >
              <option value="" disabled>
                Sélectionner une opportunité...
              </option>
              {openOpportunities.map((o) => (
                <option key={o.entityId} value={o.entityId}>
                  {o.client ? `${o.client} — ${o.title}` : o.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="staffing-source-type" className="text-xs font-semibold text-heading">
              Type de profil <span className="text-danger">*</span>
            </label>
            <Select
              id="staffing-source-type"
              value={staffingSourceType}
              onChange={(e) => {
                const val = e.target.value as "collaborator" | "candidate"
                setStaffingSourceType(val)
                setStaffingQuery("")
                setSelectedProfile(null)
                if (val === "collaborator") {
                  setStaffingSearchResults(allCollaborators)
                } else {
                  setStaffingSearchResults([])
                }
              }}
              fullWidth
            >
              <option value="collaborator">Collaborateur interne</option>
              <option value="candidate">Candidat externe</option>
            </Select>
          </div>

          <div className="relative flex flex-col gap-1.5">
            <label htmlFor="staffing-search-query" className="text-xs font-semibold text-heading">
              Rechercher un profil <span className="text-danger">*</span>
            </label>
            <Input
              id="staffing-search-query"
              type="text"
              value={staffingQuery}
              onChange={(e) => handleStaffingQueryChange(e.target.value, staffingSourceType)}
              placeholder={staffingSourceType === "collaborator" ? "Filtrer par nom..." : "Commencer à taper un nom..."}
              fullWidth
            />

            {(staffingQuery.trim().length > 0 || staffingSourceType === "collaborator") && (
              <div className="mt-1.5 rounded-md border border-border bg-surface shadow-sm max-h-48 overflow-y-auto z-10">
                {isSearchingStaffing ? (
                  <div className="px-3 py-2 text-[11px] text-muted italic">Recherche en cours...</div>
                ) : staffingSearchResults.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-muted italic">Aucun résultat.</div>
                ) : (
                  staffingSearchResults.map((result) => (
                    <button
                      key={`${result.source_type}-${result.id}`}
                      type="button"
                      onClick={() => {
                        setStaffingQuery(result.full_name)
                        setSelectedProfile(result)
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 border-b last:border-b-0 border-border/40 hover:bg-canvas/50 transition-colors flex flex-col gap-0.5",
                        selectedProfile?.id === result.id &&
                          selectedProfile?.source_type === result.source_type &&
                          "bg-primary/5"
                      )}
                    >
                      <div className="text-xs font-semibold text-heading">{result.full_name}</div>
                      {result.subtitle && (
                        <div className="text-[10px] text-muted truncate">{result.subtitle}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedProfile && (
              <p className="mt-1 text-[11px] text-muted">
                Sélectionné : <span className="font-semibold text-heading">{selectedProfile.full_name}</span>
              </p>
            )}
          </div>
        </div>
      </AppDialog>

    </>
  )
}

"use client"

import { useState, useMemo, useEffect, useTransition } from "react"
import { cn } from "@/lib/utils"
import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { STAGE_LABELS, PRIORITY_LABELS } from "@/components/missions/opportunity-detail/opportunity-detail-options"
import type { MissionsListRow } from "@/components/missions/MissionsListView"
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
import { addOpportunityEvent } from "@/app/(app)/missions/_actions/opportunity-events"
import {
  getAllCollaboratorsForStaffing,
  searchOpportunityStaffingProfiles,
  createOpportunityStaffing,
  type StaffingSearchResult,
} from "@/app/(app)/missions/_actions/opportunity-staffing"
import { ConsultantDrawer } from "@/components/consultants/ConsultantDrawer"
import { CandidateDrawer } from "@/components/recruitment/CandidateDrawer"

// ─── Mapping Étape → StatusPill ───────────────────────────────────────────────

const STAGE_PILL: Record<string, StatusPillVariant> = {
  detection:        "inProgress",
  qualification:    "inProgress",
  besoin_confirme:  "inProgress",
  recherche_profil: "info",
  cv_envoyes:       "info",
  entretien_client: "warning",
  negociation:      "warning",
  gagne:            "success",
  perdu:            "danger",
  abandonne:        "danger",
  non_traitee:      "neutral",
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
}

export function OpportunitiesDesktopView({ opportunities: initialOpps, planningData: initialPlanning }: OpportunitiesDesktopViewProps) {
  const { openTab } = useMissionsTabStore()

  const [opps, setOpps] = useState(initialOpps)
  const [planningData, setPlanningData] = useState(initialPlanning)

  // Sync state with props when they change
  useEffect(() => {
    setOpps(initialOpps)
  }, [initialOpps])

  useEffect(() => {
    setPlanningData(initialPlanning)
  }, [initialPlanning])

  const [viewMode, setViewMode] = useState<"list" | "kanban" | "planning">("list")
  const [planningScale, setPlanningScale] = useState<"year" | "quarter" | "month" | "week">("year")
  const [stageFilter, setStageFilter]       = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [convictionFilter, setConvictionFilter] = useState("all")
  const [valueSort, setValueSort] = useState("none")

  // States for event creation modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)

  // Drawers states
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [eventError, setEventError] = useState<string | null>(null)

  const [selectedOpportunityId, setSelectedOpportunityId] = useState("")
  const [eventType, setEventType] = useState("appel")
  const [eventDate, setEventDate] = useState("")
  const [eventBody, setEventBody] = useState("")

  const openOpportunities = useMemo(() => {
    return opps.filter(
      (o) =>
        o.stage !== "gagne" &&
        o.stage !== "perdu" &&
        o.stage !== "abandonne" &&
        o.stage !== "non_traitee"
    )
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
      stage: newStage as any,
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
        const label = STAGE_LABELS[stage] ?? stage
        const variant = STAGE_PILL[stage] ?? "neutral"
        return <StatusPill label={label} variant={variant} />
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
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <PageFilterBar
        activeCount={activeFilterCount}
        onReset={handleReset}
        viewSelector={
          <PageViewSelector
            items={[
              { value: "list", label: "Liste" },
              { value: "kanban", label: "Kanban" },
              { value: "planning", label: "Planning" },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as "list" | "kanban" | "planning")}
            ariaLabel="Mode d'affichage des opportunités"
          />
        }
      >
        {viewMode === "list" && (
          <>
            <PageFilterSelect
              id="opp-stage-filter"
              label="Étape"
              value={stageFilter}
              onChange={setStageFilter}
              options={[
                { value: "all", label: "Toutes les étapes" },
                { value: "qualification", label: "Qualification" },
                { value: "recherche_profil", label: "Recherche profils" },
                { value: "cv_envoyes", label: "CV sent" },
                { value: "entretien_client", label: "Présentation client (RT)" },
                { value: "abandonne", label: "Abandonné" },
                { value: "gagne", label: "Gagné" },
                { value: "perdu", label: "Perdu" },
              ]}
            />
            <PageFilterSelect
              id="opp-priority-filter"
              label="Priorité"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: "all",     label: "Toutes priorités" },
                { value: "haute",   label: "Haute" },
                { value: "normale", label: "Normale" },
                { value: "basse",   label: "Basse" },
              ]}
            />
            <PageFilterSelect
              id="opp-conviction-filter"
              label="Conviction"
              value={convictionFilter}
              onChange={setConvictionFilter}
              options={[
                { value: "all", label: "Toutes convictions" },
                { value: "under_70", label: "< 70 %" },
                { value: "above_70", label: "> 70 %" },
              ]}
            />
            <PageFilterSelect
              id="opp-value-sort"
              label="Valeur"
              value={valueSort}
              onChange={setValueSort}
              options={[
                { value: "none", label: "Valeur (ACV)" },
                { value: "desc", label: "Tri décroissant" },
                { value: "asc", label: "Tri croissant" },
              ]}
            />
          </>
        )}

        {viewMode === "planning" && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenEventModal}
              leftIcon={
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              }
            >
              Créer un événement
            </Button>

            {/* Filtre Échelle distinctif */}
            <div className="relative inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-medium)] border border-brand-brass bg-brand-brass/[0.08] text-brand-brass transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brass opacity-85">
                Échelle
              </span>
              <select
                id="opp-planning-scale-select"
                value={planningScale}
                onChange={(e) => setPlanningScale(e.target.value as any)}
                className="bg-transparent font-semibold text-xs border-0 outline-none pr-4 cursor-pointer focus:ring-0 focus:outline-none appearance-none text-brand-brass font-sans"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23C89A2B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right center",
                  backgroundSize: "10px",
                }}
              >
                <option value="year" className="bg-surface text-body font-normal">Année</option>
                <option value="quarter" className="bg-surface text-body font-normal">Trimestre</option>
                <option value="month" className="bg-surface text-body font-normal">Mois</option>
                <option value="week" className="bg-surface text-body font-normal">Semaine</option>
              </select>
            </div>
          </>
        )}

        {viewMode === "kanban" && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenStaffingModal}
              leftIcon={
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              }
            >
              Créer staffing
            </Button>

            {/* Sélecteur Affichage distinctif */}
            <div className="relative inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-medium)] border border-brand-brass bg-brand-brass/[0.08] text-brand-brass transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brass opacity-85">
                Affichage
              </span>
              <select
                id="opp-kanban-display-select"
                value={kanbanDisplayMode}
                onChange={(e) => setKanbanDisplayMode(e.target.value as "opportunities" | "consultants")}
                className="bg-transparent font-semibold text-xs border-0 outline-none pr-4 cursor-pointer focus:ring-0 focus:outline-none appearance-none text-brand-brass font-sans"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23C89A2B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right center",
                  backgroundSize: "10px",
                }}
              >
                <option value="opportunities" className="bg-surface text-body font-normal">Opportunités</option>
                <option value="consultants" className="bg-surface text-body font-normal">Consultants</option>
              </select>
            </div>
          </>
        )}
      </PageFilterBar>

      {/* Views */}
      {viewMode === "list" && (
        <SurfaceCard className="overflow-hidden border-0 rounded-[var(--radius-medium)]">
          <StructuredList
            density="compact"
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
        </SurfaceCard>
      )}

      {viewMode === "kanban" && (
        <OpportunitiesKanbanView
          opportunities={filteredPlanningData}
          onMoveOpportunity={handleMoveOpportunity}
          displayMode={kanbanDisplayMode}
          onOpenCollaborator={setSelectedCollaboratorId}
          onOpenCandidate={setSelectedCandidateId}
        />
      )}

      {viewMode === "planning" && (
        <OpportunitiesPlanningView opportunities={filteredPlanningData} scale={planningScale} />
      )}

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
              Type d'événement <span className="text-danger">*</span>
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

      {/* Drawers */}
      <ConsultantDrawer
        collaboratorId={selectedCollaboratorId}
        open={!!selectedCollaboratorId}
        onOpenChange={(open) => !open && setSelectedCollaboratorId(null)}
      />
      <CandidateDrawer
        candidateId={selectedCandidateId}
        open={!!selectedCandidateId}
        onOpenChange={(open) => !open && setSelectedCandidateId(null)}
      />
    </div>
  )
}

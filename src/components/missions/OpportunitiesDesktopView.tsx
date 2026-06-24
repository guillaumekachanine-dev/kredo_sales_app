"use client"

import { useState, useMemo } from "react"
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
}

export function OpportunitiesDesktopView({ opportunities }: OpportunitiesDesktopViewProps) {
  const { openTab } = useMissionsTabStore()

  const [viewMode, setViewMode] = useState<"list" | "kanban" | "planning">("list")
  const [stageFilter, setStageFilter]       = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [convictionFilter, setConvictionFilter] = useState("all")
  const [valueSort, setValueSort] = useState("none")

  const filtered = useMemo(
    () => {
      let result = opportunities.filter(
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
    [opportunities, stageFilter, priorityFilter, convictionFilter, valueSort],
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
        summary={
          filtered.length !== opportunities.length
            ? `${filtered.length} / ${opportunities.length} opportunité${opportunities.length > 1 ? "s" : ""}`
            : `${opportunities.length} opportunité${opportunities.length > 1 ? "s" : ""}`
        }
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
        <div className="flex items-center justify-center py-20 border border-dashed border-border rounded-[var(--radius-medium)] bg-surface text-muted">
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 opacity-40 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <span className="font-semibold text-body">Vue Kanban</span>
            <span className="text-sm">Permet de visualiser et de gérer l’avancement des opportunités.</span>
          </div>
        </div>
      )}

      {viewMode === "planning" && (
        <div className="flex items-center justify-center py-20 border border-dashed border-border rounded-[var(--radius-medium)] bg-surface text-muted">
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 opacity-40 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="font-semibold text-body">Vue Planning</span>
            <span className="text-sm">Permet de visualiser les échéances et le timing de l’opportunité.</span>
          </div>
        </div>
      )}
    </div>
  )
}

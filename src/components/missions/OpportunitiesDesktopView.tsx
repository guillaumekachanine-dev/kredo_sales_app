"use client"

import { useState, useMemo } from "react"
import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { NewOpportunityButton } from "@/components/missions/NewOpportunityButton"
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
        secondaryActions={<NewOpportunityButton />}
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

      {/* List */}
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
    </div>
  )
}

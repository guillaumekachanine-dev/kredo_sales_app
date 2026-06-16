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

// ─── Filtre par groupe d'étape ────────────────────────────────────────────────

type StageGroup = "all" | "ouvertes" | "gagnees" | "perdues"

const CLOSED_STAGES = new Set(["gagne", "perdu", "abandonne", "non_traitee"])

function matchesStageGroup(row: MissionsListRow, group: StageGroup): boolean {
  const stage = row.stage ?? ""
  if (group === "all")     return true
  if (group === "ouvertes") return !CLOSED_STAGES.has(stage)
  if (group === "gagnees")  return stage === "gagne"
  if (group === "perdues")  return stage === "perdu" || stage === "abandonne"
  return true
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface OpportunitiesDesktopViewProps {
  opportunities: MissionsListRow[]
}

export function OpportunitiesDesktopView({ opportunities }: OpportunitiesDesktopViewProps) {
  const { openTab } = useMissionsTabStore()

  const [stageGroup, setStageGroup]       = useState<StageGroup>("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  const filtered = useMemo(
    () =>
      opportunities.filter(
        (row) =>
          matchesStageGroup(row, stageGroup) &&
          (priorityFilter === "all" || row.priority === priorityFilter),
      ),
    [opportunities, stageGroup, priorityFilter],
  )

  const activeFilterCount =
    (stageGroup !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0)

  const handleReset = () => {
    setStageGroup("all")
    setPriorityFilter("all")
  }

  // ── Colonnes ────────────────────────────────────────────────────────────────
  const columns: StructuredListColumn<MissionsListRow>[] = [
    {
      id: "client",
      header: "Compte",
      render: (row) => (
        <span className="font-bold text-heading">{row.client ?? "—"}</span>
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
      align: "right",
      width: "9rem",
      render: (row) => {
        const pct = row.conviction ?? 0
        return (
          <div className="flex items-center justify-end gap-2">
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
      align: "right",
      render: (row) => (
        <span className="font-medium tabular-nums text-heading">{row.amount ?? "—"}</span>
      ),
    },
    {
      id: "tjm",
      header: "TJM cible",
      align: "right",
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
      render: (row) => <span className="text-body">{row.date ?? "—"}</span>,
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
          value={stageGroup}
          onChange={(v) => setStageGroup(v as StageGroup)}
          options={[
            { value: "all",      label: "Toutes les étapes" },
            { value: "ouvertes", label: "En cours" },
            { value: "gagnees",  label: "Gagnées" },
            { value: "perdues",  label: "Perdues / Abandonnées" },
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

"use client"

import { useMemo } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { Badge } from "@/components/ui/Badge"
import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { formatDateShort } from "@/lib/formatters"
import type { NeedsStaffingDirection } from "@/lib/needs-staffing/url-state"
import {
  getOpportunityStageColor,
  getOpportunityStageLabel,
} from "@/lib/opportunities/stages"
import { cn } from "@/lib/utils"
import type { MissionsListRow } from "@/components/missions/MissionsListView"

interface NeedsCoverageSnapshot {
  requiredHeadcount: number
  coveringCount: number
  cappedCoveringCount: number
}

interface NeedsListViewProps {
  rows: MissionsListRow[]
  coverageByOpportunityId: Record<string, NeedsCoverageSnapshot>
  acvDirection: NeedsStaffingDirection
  onToggleAcvSort: () => void
}

function StagePill({ stage }: { stage: string | null | undefined }) {
  const safeStage = stage ?? ""
  const color = getOpportunityStageColor(safeStage)

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium"
      style={{ color }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span>{getOpportunityStageLabel(safeStage)}</span>
    </span>
  )
}

function getPriorityVariant(priority: string | null | undefined) {
  if (priority === "haute") return "warning"
  return "neutral"
}

function CoverageCell({
  snapshot,
}: {
  snapshot: NeedsCoverageSnapshot | undefined
}) {
  if (!snapshot) {
    return <span className="text-muted">—</span>
  }

  const isCovered = snapshot.requiredHeadcount > 0 && snapshot.cappedCoveringCount >= snapshot.requiredHeadcount

  return (
    <span className={cn(
      "font-semibold tabular-nums",
      isCovered ? "text-success" : "text-heading",
    )}>
      {snapshot.cappedCoveringCount} / {snapshot.requiredHeadcount}
    </span>
  )
}

function AcvHeader({ direction }: { direction: NeedsStaffingDirection }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>Valeur (ACV)</span>
      <svg
        className={cn(
          "size-3 transition-transform",
          direction === "asc" && "rotate-180",
          direction === null && "opacity-45",
        )}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 8l4 4 4-4" />
      </svg>
    </span>
  )
}

function renderNextAction(row: MissionsListRow) {
  if (row.nextActionLabel && row.nextActionAt) {
    return `${row.nextActionLabel} · ${formatDateShort(row.nextActionAt)}`
  }

  if (row.nextActionLabel) {
    return row.nextActionLabel
  }

  if (row.nextActionAt) {
    return formatDateShort(row.nextActionAt)
  }

  return "—"
}

export function NeedsListView({
  rows,
  coverageByOpportunityId,
  acvDirection,
  onToggleAcvSort,
}: NeedsListViewProps) {
  const { openOpportunityDrawer } = useStaffingDrawerStore()

  const columns: StructuredListColumn<MissionsListRow>[] = useMemo(() => [
    {
      id: "client",
      header: "Compte",
      width: "12rem",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo
            name={row.client || "Client"}
            logoPath={row.clientLogoPath}
            website={row.clientWebsite}
            size="sm"
          />
          <span className="truncate font-bold text-heading">{row.client ?? "—"}</span>
        </div>
      ),
    },
    {
      id: "title",
      header: "Intitulé du besoin",
      width: "15rem",
      render: (row) => (
        <span className="font-semibold text-body transition-colors duration-150 group-hover:text-primary">
          {row.title}
        </span>
      ),
    },
    {
      id: "practice",
      header: "Practice",
      width: "8rem",
      render: (row) => <span className="text-body">{row.practice ?? "—"}</span>,
    },
    {
      id: "priority",
      header: "Priorité",
      align: "center",
      width: "7rem",
      render: (row) => (
        <Badge variant={getPriorityVariant(row.priority)} size="sm">
          {row.priority === "haute" ? "Haute" : row.priority === "basse" ? "Basse" : "Normale"}
        </Badge>
      ),
    },
    {
      id: "stage",
      header: "Étape",
      width: "11rem",
      render: (row) => <StagePill stage={row.stage} />,
    },
    {
      id: "headcount",
      header: "Effectif requis",
      align: "center",
      width: "7rem",
      render: (row) => (
        <span className="font-semibold tabular-nums text-heading">
          {row.requiredHeadcount ?? "—"}
        </span>
      ),
    },
    {
      id: "coverage",
      header: "Couverture",
      align: "center",
      width: "7rem",
      render: (row) => (
        <CoverageCell snapshot={coverageByOpportunityId[row.entityId]} />
      ),
    },
    {
      id: "acv",
      header: <AcvHeader direction={acvDirection} />,
      headerAriaLabel: "Trier par valeur ACV",
      ariaSort:
        acvDirection === "asc"
          ? "ascending"
          : acvDirection === "desc"
            ? "descending"
            : "none",
      onHeaderClick: onToggleAcvSort,
      align: "right",
      width: "8rem",
      render: (row) => (
        <span className="font-semibold tabular-nums text-heading">{row.amount ?? "—"}</span>
      ),
    },
    {
      id: "nextAction",
      header: "Prochaine action",
      width: "12rem",
      render: (row) => (
        <span className="line-clamp-2 text-body">{renderNextAction(row)}</span>
      ),
    },
  ], [coverageByOpportunityId, acvDirection, onToggleAcvSort])

  return (
    <div className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface shadow-sm">
      <StructuredList
        density="compact"
        items={rows}
        columns={columns}
        getItemId={(row) => row.entityId}
        onItemClick={(row) => openOpportunityDrawer(row.entityId, "besoin")}
        ariaLabel="Liste des besoins ouverts nécessitant du staffing"
        emptyState="Aucun besoin ne correspond aux filtres."
      />
    </div>
  )
}

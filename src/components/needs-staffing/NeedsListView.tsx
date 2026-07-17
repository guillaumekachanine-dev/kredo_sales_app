"use client"

import { useMemo } from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
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

function StageLabel({ stage }: { stage: string | null | undefined }) {
  const safeStage = stage ?? ""
  const color = getOpportunityStageColor(safeStage)

  return (
    <span className="text-[11px] font-medium" style={{ color }}>
      {getOpportunityStageLabel(safeStage)}
    </span>
  )
}

function getPriorityLabel(priority: string | null | undefined) {
  if (priority === "haute") return "Haute"
  if (priority === "basse") return "Basse"
  return "Normale"
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
      width: "10rem",
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
      width: "22rem",
      render: (row) => (
        <span title={row.title} className="block truncate whitespace-nowrap font-semibold text-body transition-colors duration-150 group-hover:text-primary">
          {row.title}
        </span>
      ),
    },
    {
      id: "practice",
      header: "Practice",
      width: "8rem",
      render: (row) => <span className="block truncate whitespace-nowrap text-body">{row.practice ?? "—"}</span>,
    },
    {
      id: "priority",
      header: "Priorité",
      align: "center",
      width: "5.5rem",
      render: (row) => (
        <span className={cn("text-[11px] font-semibold", row.priority === "haute" ? "text-warning" : "text-body")}>
          {getPriorityLabel(row.priority)}
        </span>
      ),
    },
    {
      id: "stage",
      header: "Étape",
      width: "10rem",
      render: (row) => <StageLabel stage={row.stage} />,
    },
    {
      id: "coverage",
      header: "Couverture",
      align: "center",
      width: "6.5rem",
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
      width: "7.5rem",
      render: (row) => (
        <span className="font-semibold tabular-nums text-heading">{row.amount ?? "—"}</span>
      ),
    },
    {
      id: "details",
      header: "Accéder à",
      align: "right",
      width: "7.5rem",
      render: (row) => (
        <Link
          href={`/missions/opps/${row.entityId}`}
          aria-label={`Fiche détails : ${row.title}`}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-8 items-center justify-center rounded-[2px] border border-border bg-surface px-3 text-[11px] font-semibold text-heading transition-colors hover:border-primary/35 hover:bg-primary/[0.04] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          Fiche détails
        </Link>
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
        tableFixed
        ariaLabel="Liste des besoins ouverts nécessitant du staffing"
        emptyState="Aucun besoin ne correspond aux filtres."
      />
    </div>
  )
}

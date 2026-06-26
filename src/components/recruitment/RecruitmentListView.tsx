"use client"

import React from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { EntityListView } from "@/components/common/EntityListView"
import type { RecruitmentWorkspaceRow } from "@/app/(app)/recruitment/_data/get-recruitment-workspace"
import { formatDate, formatEuro } from "@/lib/formatters"
import {
  getRecruitmentSourceLabel,
  getRecruitmentStatusLabel,
  getRecruitmentStageColor,
  mapRecruitmentStatusToStage,
} from "@/lib/recruitment/recruitment-stages"
import { cn } from "@/lib/utils"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import type { StructuredListColumn } from "@/components/ui/StructuredList"

interface RecruitmentListViewProps {
  rows: RecruitmentWorkspaceRow[]
}

export function RecruitmentListView({ rows }: RecruitmentListViewProps) {
  const openStaffingDrawer = useStaffingDrawerStore((state) => state.openStaffingDrawer)

  const columns: StructuredListColumn<RecruitmentWorkspaceRow>[] = [
    {
      id: "candidate",
      header: "Candidat",
      width: "14rem",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
              row.isCollaborator
                ? "border-primary/15 bg-primary/10 text-primary"
                : "border-brand-brass/15 bg-brand-brass/10 text-brand-brass",
            )}
          >
            {row.candidateName
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-bold text-heading transition-colors duration-150 group-hover:text-primary">
              {row.candidateName}
            </span>
            <span className="truncate text-[10px] text-muted">
              {row.isCollaborator ? "Interne" : "Externe"}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "profile",
      header: "Profil",
      width: "11rem",
      render: (row) => (
        <div className="flex flex-col">
          <span className="truncate font-medium text-body">{row.currentTitle || "—"}</span>
          <span className="truncate text-[10px] text-muted">
            {[row.practice, row.seniority].filter(Boolean).join(" • ") || "—"}
          </span>
        </div>
      ),
    },
    {
      id: "need",
      header: "Besoin",
      width: "14rem",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo
            name={row.clientName || "Client"}
            logoPath={row.clientLogoPath}
            website={row.clientWebsite}
            size="sm"
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-heading">{row.opportunityTitle}</span>
            <span className="truncate text-[10px] text-muted">{row.clientName}</span>
          </div>
        </div>
      ),
    },
    {
      id: "source",
      header: "Source",
      width: "9rem",
      render: (row) => (
        <div className="flex flex-col">
          <span className="truncate font-medium text-body">
            {getRecruitmentSourceLabel(row.source)}
          </span>
          <span className="truncate text-[10px] text-muted">{row.availability || "—"}</span>
        </div>
      ),
    },
    {
      id: "stage",
      header: "Étape",
      width: "10rem",
      render: (row) => {
        const stage = mapRecruitmentStatusToStage(row.positioningStatus)
        const color = getRecruitmentStageColor(stage)
        return (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
            style={{ color }}
          >
            <span className="size-1.5 shrink-0 rounded-full bg-current" />
            <span>{getRecruitmentStatusLabel(row.positioningStatus)}</span>
          </span>
        )
      },
    },
    {
      id: "compensation",
      header: "Comp.",
      align: "right",
      width: "8rem",
      render: (row) => (
        <span className="font-medium tabular-nums text-heading">
          {row.expectedDailyRate
            ? `${formatEuro(row.expectedDailyRate)}/j`
            : row.expectedSalary
              ? `${formatEuro(row.expectedSalary)}/an`
              : "—"}
        </span>
      ),
    },
    {
      id: "action",
      header: "Prochaine action",
      width: "10rem",
      render: (row) => (
        <div className="flex flex-col">
          <span className="line-clamp-2 text-[11px] font-medium text-body">
            {row.nextAction || "Aucune action"}
          </span>
          <span className="text-[10px] text-muted">MAJ {formatDate(row.updatedAt)}</span>
        </div>
      ),
    },
  ]

  return (
    <EntityListView
      items={rows}
      columns={columns}
      getItemId={(row) => row.id}
      onItemClick={(row) => openStaffingDrawer(row.id)}
      ariaLabel="Liste des recrutements"
      emptyState="Aucun recrutement ne correspond aux filtres."
    />
  )
}

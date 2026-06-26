"use client"

import React from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { EntityKanbanCard } from "@/components/common/EntityKanbanCard"
import {
  EntityKanbanView,
  type EntityKanbanColumn,
} from "@/components/common/EntityKanbanView"
import type { RecruitmentWorkspaceRow } from "@/app/(app)/recruitment/_data/get-recruitment-workspace"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { formatEuro, formatDateShort } from "@/lib/formatters"
import {
  RECRUITMENT_STAGES,
  getRecruitmentSourceLabel,
  getRecruitmentStatusLabel,
  type RecruitmentStageKey,
} from "@/lib/recruitment/recruitment-stages"
import { cn } from "@/lib/utils"

interface RecruitmentKanbanViewProps {
  rows: RecruitmentWorkspaceRow[]
  onMoveRow: (itemId: string, stage: RecruitmentStageKey) => Promise<void>
}

const COLUMNS: readonly EntityKanbanColumn<RecruitmentStageKey>[] = RECRUITMENT_STAGES.map(
  (stage) => ({
    key: stage.key,
    label: stage.label,
  }),
)

export function RecruitmentKanbanView({
  rows,
  onMoveRow,
}: RecruitmentKanbanViewProps) {
  const openStaffingDrawer = useStaffingDrawerStore((state) => state.openStaffingDrawer)

  return (
    <EntityKanbanView
      columns={COLUMNS}
      items={rows}
      getItemId={(row) => row.id}
      getColumnKey={(row) => row.stageKey}
      getColumnAccentColor={(stage) =>
        RECRUITMENT_STAGES.find((item) => item.key === stage)?.color ?? "var(--color-muted)"
      }
      onItemMove={onMoveRow}
      onCardClick={(row) => openStaffingDrawer(row.id)}
      renderCard={(row) => (
        <EntityKanbanCard
          front={
            <div className="flex h-full w-full flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition-all duration-150 hover:border-primary/50 hover:shadow-md">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="block max-w-full truncate text-[9px] font-bold uppercase tracking-wider text-muted">
                    {getRecruitmentSourceLabel(row.source)}
                  </span>
                  <h4 className="mt-0.5 truncate text-[11px] font-bold leading-tight text-heading">
                    {row.candidateName}
                  </h4>
                  <p className="mt-1 truncate text-[10px] text-body">
                    {row.currentTitle || "Profil non renseigné"}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded border px-1 py-0.2 text-[7px] font-extrabold uppercase tracking-wider",
                    row.isCollaborator
                      ? "border-primary/10 bg-primary/5 text-primary"
                      : "border-brand-brass/10 bg-brand-brass/5 text-brand-brass",
                  )}
                >
                  {row.isCollaborator ? "Interne" : "Externe"}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/40 bg-canvas/30 p-2">
                <CompanyLogo
                  name={row.clientName || "Client"}
                  logoPath={row.clientLogoPath}
                  website={row.clientWebsite}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[9px] font-bold text-heading">
                    {row.opportunityTitle}
                  </span>
                  <span className="block truncate text-[8px] text-muted">
                    {row.clientName}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-border/50 pt-2 text-[9px]">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">
                    Séniorité
                  </span>
                  <span className="mt-0.5 font-semibold text-heading">
                    {row.seniority || "—"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">
                    Comp.
                  </span>
                  <span className="mt-0.5 font-semibold text-heading">
                    {row.expectedDailyRate
                      ? `${formatEuro(row.expectedDailyRate)}/j`
                      : row.expectedSalary
                        ? `${formatEuro(row.expectedSalary)}/an`
                        : "—"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">
                    Practice
                  </span>
                  <span className="mt-0.5 truncate font-semibold text-heading">
                    {row.practice || "—"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">
                    Dernière étape
                  </span>
                  <span className="mt-0.5 truncate font-semibold text-heading">
                    {row.sentToClientAt
                      ? formatDateShort(row.sentToClientAt)
                      : getRecruitmentStatusLabel(row.positioningStatus)}
                  </span>
                </div>
              </div>

              <div className="mt-auto border-t border-border/50 pt-2">
                <p className="line-clamp-2 text-[9px] text-muted">
                  {row.nextAction || row.summary || "Aucune prochaine action renseignée."}
                </p>
              </div>
            </div>
          }
        />
      )}
    />
  )
}

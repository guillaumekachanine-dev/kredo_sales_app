"use client"

import React from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { EntityKanbanCard } from "@/components/common/EntityKanbanCard"
import {
  EntityKanbanView,
  type EntityKanbanColumn,
} from "@/components/common/EntityKanbanView"
import type { OpportunityPlanningData } from "@/app/(app)/missions/_data/get-opportunities-planning"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { formatEuroCompact, formatDate } from "@/lib/formatters"
import {
  getOpportunityStageColor,
  OPPORTUNITY_KANBAN_STAGES,
} from "@/lib/opportunities/stages"
import { cn } from "@/lib/utils"

interface OpportunitiesKanbanViewProps {
  opportunities: OpportunityPlanningData[]
  onMoveOpportunity: (id: string, newStage: string) => Promise<void>
  displayMode: "opportunities" | "consultants"
}

const COLUMNS: EntityKanbanColumn<string>[] = OPPORTUNITY_KANBAN_STAGES.map((stage) => ({
  key: stage.value,
  label: stage.label,
}))

export function OpportunitiesKanbanView({
  opportunities,
  onMoveOpportunity,
  displayMode,
}: OpportunitiesKanbanViewProps) {
  const { openOpportunityDrawer, openStaffingDrawer } = useStaffingDrawerStore()

  return (
    <EntityKanbanView
      columns={COLUMNS}
      items={opportunities}
      getItemId={(opportunity) => opportunity.id}
      getColumnKey={(opportunity) => opportunity.stage}
      getColumnAccentColor={getOpportunityStageColor}
      onItemMove={onMoveOpportunity}
      onCardClick={(opportunity) => openOpportunityDrawer(opportunity.id, "besoin")}
      renderCard={(opportunity) => (
        <EntityKanbanCard
          isFlipped={displayMode === "consultants"}
          front={
            <div className="flex h-full w-full flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition-all duration-150 hover:border-primary/50 hover:shadow-md">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <CompanyLogo
                    name={opportunity.client || "Client"}
                    logoPath={opportunity.clientLogoPath}
                    website={opportunity.clientWebsite}
                    size="sm"
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="block max-w-full truncate text-[9px] font-bold uppercase tracking-wider text-muted">
                      {opportunity.client}
                    </span>
                    <h4
                      className="mt-0.5 block max-w-full truncate text-[11px] font-bold leading-tight text-heading transition-colors hover:text-primary"
                      title={opportunity.title}
                    >
                      {opportunity.title}
                    </h4>
                  </div>
                </div>
                <div className="mt-1 flex shrink-0 items-center gap-1.5">
                  {opportunity.priority === "haute" ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" title="Priorité haute" />
                  ) : null}
                  {opportunity.priority === "normale" ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-muted" title="Priorité normale" />
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-1.5 gap-y-1 border-t border-border/50 pt-2.5 text-[10px]">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">Valeur (ACV)</span>
                  <span className="mt-0.5 font-semibold text-heading">
                    {formatEuroCompact(opportunity.acv || opportunity.estimatedGain)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">Date cible</span>
                  <span className="mt-0.5 font-semibold text-heading">
                    {formatDate(opportunity.targetCloseDate || opportunity.startDate)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">Staffing</span>
                  <span className="mt-0.5 font-semibold text-primary">
                    {opportunity.candidates.length} profil{opportunity.candidates.length > 1 ? "s" : ""} poussé{opportunity.candidates.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">Conviction</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-1 w-10 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${opportunity.conviction}%` }}
                      />
                    </div>
                    <span className="font-bold text-heading">{opportunity.conviction}%</span>
                  </div>
                </div>
              </div>
            </div>
          }
          back={
            <div className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-xl border border-border bg-surface p-3 shadow-sm transition-all duration-150 hover:border-primary/50 hover:shadow-md">
              <div className="flex min-w-0 items-start justify-between gap-2 border-b border-border/50 pb-2">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <CompanyLogo
                    name={opportunity.client || "Client"}
                    logoPath={opportunity.clientLogoPath}
                    website={opportunity.clientWebsite}
                    size="sm"
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="block max-w-full truncate text-[9px] font-bold uppercase tracking-wider text-muted">
                      {opportunity.client}
                    </span>
                    <span className="mt-0.5 block max-w-full truncate text-[10px] font-bold leading-tight text-heading" title={opportunity.title}>
                      {opportunity.title}
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex shrink-0 items-center gap-1.5">
                  {opportunity.priority === "haute" ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" title="Priorité haute" />
                  ) : null}
                  {opportunity.priority === "normale" ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-muted" title="Priorité normale" />
                  ) : null}
                </div>
              </div>

              <div className="custom-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto pr-0.5">
                {opportunity.candidates.length > 0 ? (
                  opportunity.candidates.map((candidate) => (
                    <div key={candidate.id} className="flex flex-col gap-0.5 border-b border-border/20 py-1 last:border-b-0">
                      <div className="flex min-w-0 items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openStaffingDrawer(candidate.id)
                          }}
                          className="flex-1 cursor-pointer truncate text-left text-[10px] font-bold text-heading hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                          title={candidate.fullName}
                        >
                          {candidate.fullName}
                        </button>
                        <span
                          className={cn(
                            "shrink-0 rounded border px-1 py-0.2 text-[7px] font-extrabold uppercase tracking-wider",
                            candidate.source === "collaborateur"
                              ? "border-primary/10 bg-primary/5 text-primary"
                              : "border-brand-brass/10 bg-brand-brass/5 text-brand-brass",
                          )}
                        >
                          {candidate.source === "collaborateur" ? "Interne" : "Recrutement"}
                        </span>
                      </div>
                      <div className="truncate text-left text-[9px] text-muted">
                        {candidate.profileTitle || (
                          candidate.source === "collaborateur"
                            ? "Collaborateur"
                            : candidate.expectedSalary
                              ? `Salaire : ${candidate.expectedSalary.toLocaleString("fr-FR")} €`
                              : "Salaire : —"
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full flex-col items-center justify-center py-2 text-muted">
                    <span className="text-[9px] italic">Aucun staffing</span>
                  </div>
                )}
              </div>
            </div>
          }
        />
      )}
    />
  )
}

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
import { formatEuro } from "@/lib/formatters"
import {
  HIRING_KANBAN_STAGES,
  type HiringKanbanStageKey,
} from "@/lib/recruitment/recruitment-stages"

interface RecruitmentKanbanViewProps {
  rows: RecruitmentWorkspaceRow[]
  onMoveRow: (itemId: string, step: HiringKanbanStageKey) => Promise<void>
  displayMode: "candidates" | "opportunities"
}

const COLUMNS: readonly EntityKanbanColumn<HiringKanbanStageKey>[] = HIRING_KANBAN_STAGES.map(
  (stage) => ({
    key: stage.key,
    label: stage.label,
  }),
)

const HIRING_STEP_LABELS: Record<string, string> = {
  prequalification: "Préqualification",
  entretien_manager: "Entretien manager",
  tests_techniques: "Tests techniques",
  proposition: "Proposition",
  signature: "Signature",
  integration: "Intégration",
}

function getHiringColumnKey(row: RecruitmentWorkspaceRow): HiringKanbanStageKey {
  const step = row.hiringCurrentStep
  if (step && step in HIRING_STEP_LABELS) return step as HiringKanbanStageKey
  return "prequalification"
}

export function RecruitmentKanbanView({
  rows,
  onMoveRow,
  displayMode,
}: RecruitmentKanbanViewProps) {
  const openStaffingDrawer = useStaffingDrawerStore((state) => state.openStaffingDrawer)

  return (
    <EntityKanbanView
      columns={COLUMNS}
      items={rows}
      getItemId={(row) => row.id}
      getColumnKey={getHiringColumnKey}
      getColumnAccentColor={(stage) =>
        HIRING_KANBAN_STAGES.find((item) => item.key === stage)?.color ?? "var(--color-muted)"
      }
      onItemMove={onMoveRow}
      onCardClick={(row) => openStaffingDrawer(row.id)}
      renderCard={(row) => (
        <EntityKanbanCard
          isFlipped={displayMode === "opportunities"}
          front={
            // ── Face candidat ──────────────────────────────────────────────
            <div className="flex h-full w-full flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition-all duration-150 hover:border-primary/50 hover:shadow-md">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="block max-w-full truncate text-[9px] font-bold uppercase tracking-wider text-muted">
                    {HIRING_STEP_LABELS[row.hiringCurrentStep ?? ""] ?? "Sans processus"}
                  </span>
                  <h4 className="mt-0.5 truncate text-[11px] font-bold leading-tight text-heading">
                    {row.candidateName}
                  </h4>
                  <p className="mt-1 truncate text-[10px] text-body">
                    {row.currentTitle || "Profil non renseigné"}
                  </p>
                </div>
                {row.practice && (
                  <span className="shrink-0 rounded border border-border/60 bg-canvas/50 px-1.5 py-0.5 text-[8px] font-semibold text-muted">
                    {row.practice}
                  </span>
                )}
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
                    Prétentions
                  </span>
                  <span className="mt-0.5 font-semibold text-heading">
                    {row.expectedDailyRate
                      ? `${formatEuro(row.expectedDailyRate)}/j`
                      : row.expectedSalary
                        ? `${Math.round(row.expectedSalary / 1000)}k`
                        : "—"}
                  </span>
                </div>
              </div>

              {(row.nextAction || row.comment) && (
                <div className="mt-auto border-t border-border/50 pt-2">
                  <p className="line-clamp-2 text-[9px] text-muted">
                    {row.nextAction || row.comment}
                  </p>
                </div>
              )}
            </div>
          }
          back={
            // ── Face opportunité ───────────────────────────────────────────
            <div className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-xl border border-border bg-surface p-3 shadow-sm transition-all duration-150 hover:border-primary/50 hover:shadow-md">
              {/* Header : logo + client + opportunité */}
              <div className="flex min-w-0 items-start gap-2 border-b border-border/50 pb-2">
                <CompanyLogo
                  name={row.clientName || "Client"}
                  logoPath={row.clientLogoPath}
                  website={row.clientWebsite}
                  size="sm"
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[9px] font-bold uppercase tracking-wider text-muted">
                    {row.clientName}
                  </span>
                  <h4 className="mt-0.5 truncate text-[11px] font-bold leading-tight text-heading">
                    {row.opportunityTitle || "Opportunité"}
                  </h4>
                </div>
              </div>

              {/* Candidat positionné */}
              <div className="flex items-center gap-1.5 rounded-lg bg-canvas/40 px-2 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">
                  Profil
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-primary">
                  {row.candidateName}
                </span>
              </div>

              {/* Métriques de l'opportunité */}
              <div className="grid flex-1 grid-cols-2 gap-x-2 gap-y-2 pt-1">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">TJM cible</span>
                  <span className="mt-0.5 text-[10px] font-bold text-heading">
                    {row.targetDailyRate ? `${formatEuro(row.targetDailyRate)}/j` : "—"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">Disponibilité</span>
                  <span className="mt-0.5 text-[10px] font-semibold text-heading">
                    {row.availability || "—"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">Étape</span>
                  <span className="mt-0.5 text-[10px] font-semibold text-primary">
                    {HIRING_STEP_LABELS[row.hiringCurrentStep ?? ""] ?? "—"}
                  </span>
                </div>
                {row.practice && (
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-muted/80">Practice</span>
                    <span className="mt-0.5 text-[10px] font-semibold text-heading">{row.practice}</span>
                  </div>
                )}
              </div>

              {row.comment && (
                <div className="border-t border-border/50 pt-1.5">
                  <p className="line-clamp-2 text-[9px] italic text-muted">{row.comment}</p>
                </div>
              )}
            </div>
          }
        />
      )}
    />
  )
}

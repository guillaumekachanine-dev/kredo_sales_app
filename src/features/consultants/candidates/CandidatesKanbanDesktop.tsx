"use client"

import { useMemo, useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  HIRING_KANBAN_STAGES,
  type HiringKanbanStageKey,
} from "@/lib/recruitment/recruitment-stages"
import { updateHiringStep } from "@/app/(app)/recruitment/_actions/update-hiring-step"
import {
  EntityKanbanView,
  type EntityKanbanColumn,
} from "@/components/common/EntityKanbanView"
import {
  candidateAvatarTone,
  candidateInitials,
  formatSalaryK,
} from "@/features/consultants/candidates/candidates-view"
import type { ConsultantsCandidateRow } from "@/features/consultants/candidates/data/consultants-candidates.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — chapitre Candidats : Kanban recrutement Desktop (Lot 9)
//
//  Vue Kanban candidate-centric (C-28) : regroupe les candidats ayant un process
//  de recrutement actif selon leur étape courante (`current_step`).
//  Drag-and-drop appelle `updateHiringStep` avec mise à jour optimiste React 19.
//  Le clic sur une carte ouvre le `CandidateDrawer`.
// ─────────────────────────────────────────────────────────────────────────────

interface CandidatesKanbanDesktopProps {
  rows: ConsultantsCandidateRow[]
  onOpenDrawer: (candidateId: string) => void
}

const COLUMNS: readonly EntityKanbanColumn<HiringKanbanStageKey>[] = HIRING_KANBAN_STAGES.map(
  (stage) => ({
    key: stage.key,
    label: stage.label,
  }),
)

export function CandidatesKanbanDesktop({
  rows: initialRows,
  onOpenDrawer,
}: CandidatesKanbanDesktopProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [optimisticRows, setOptimisticRows] = useOptimistic(
    initialRows,
    (current, update: { candidateId: string; nextStep: HiringKanbanStageKey }) =>
      current.map((r) => {
        if (r.candidateId !== update.candidateId || !r.latestHiringProcess) return r
        return {
          ...r,
          latestHiringProcess: {
            ...r.latestHiringProcess,
            currentStep: update.nextStep,
          },
        }
      }),
  )

  const activeProcessRows = useMemo(() => {
    return optimisticRows.filter(
      (row) => row.latestHiringProcess && row.latestHiringProcess.status === "active",
    )
  }, [optimisticRows])

  const handleMoveHiringStep = async (candidateId: string, nextStep: HiringKanbanStageKey) => {
    const row = optimisticRows.find((r) => r.candidateId === candidateId)
    const processId = row?.latestHiringProcess?.processId
    if (!processId || !row) return

    startTransition(async () => {
      setOptimisticRows({ candidateId, nextStep })
      const result = await updateHiringStep(processId, nextStep)
      if (result.error) {
        console.error("[CandidatesKanbanDesktop] Échec changement étape:", result.error)
      } else {
        router.refresh()
      }
    })
  }

  const getHiringColumnKey = (row: ConsultantsCandidateRow): HiringKanbanStageKey => {
    const step = row.latestHiringProcess?.currentStep
    if (step && HIRING_KANBAN_STAGES.some((stage) => stage.key === step)) {
      return step as HiringKanbanStageKey
    }
    return "prequalification"
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-xs text-muted">
          <span className="font-semibold text-heading">{activeProcessRows.length}</span>{" "}
          candidat{activeProcessRows.length > 1 ? "s" : ""} en cours de recrutement · Glissez-déposez
          une carte pour changer d&apos;étape.
        </p>
      </div>

      <EntityKanbanView<ConsultantsCandidateRow, HiringKanbanStageKey>
        columns={COLUMNS}
        items={activeProcessRows}
        getItemId={(row) => row.candidateId}
        getColumnKey={getHiringColumnKey}
        getColumnAccentColor={(stage) =>
          HIRING_KANBAN_STAGES.find((s) => s.key === stage)?.color ?? "var(--color-muted)"
        }
        onCardClick={(row) => onOpenDrawer(row.candidateId)}
        onItemMove={handleMoveHiringStep}
        renderCard={(row) => (
          <div className="flex h-full w-full flex-col justify-between rounded-xl border border-border bg-surface p-3 shadow-xs transition-all duration-150 hover:border-primary/50 hover:shadow-md">
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      candidateAvatarTone(row.fullName),
                    )}
                  >
                    {candidateInitials(row.fullName)}
                  </span>
                  <div className="min-w-0">
                    <h4 className="truncate text-xs font-bold text-heading group-hover:text-primary">
                      {row.fullName}
                    </h4>
                    <p className="truncate text-[10px] text-body">
                      {row.currentTitle ?? "Profil non renseigné"}
                    </p>
                  </div>
                </div>
                {row.practiceLabel && (
                  <span className="shrink-0 rounded border border-border/60 bg-canvas/50 px-1.5 py-0.5 text-[8px] font-semibold text-muted">
                    {row.practiceLabel}
                  </span>
                )}
              </div>

              {row.nextAction && (
                <p className="mt-2 line-clamp-2 text-[10px] text-muted">
                  <span className="font-semibold text-body">Action :</span> {row.nextAction}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[9px] text-muted">
              <span>{row.seniority ?? "—"}</span>
              <span className="font-semibold text-heading">
                {row.expectedSalary ? formatSalaryK(row.expectedSalary) : row.expectedDailyRate ? `TJM ${row.expectedDailyRate} €` : "—"}
              </span>
            </div>
          </div>
        )}
      />
    </div>
  )
}

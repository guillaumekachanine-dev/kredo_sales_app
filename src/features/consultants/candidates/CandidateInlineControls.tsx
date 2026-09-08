"use client"

import React, { useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Select } from "@/components/ui/Select"
import { updateCandidateStatus } from "@/app/(app)/recruitment/_actions/update-candidate-status"
import { updateHiringStep } from "@/app/(app)/recruitment/_actions/update-hiring-step"
import { HIRING_KANBAN_STAGES } from "@/lib/recruitment/recruitment-stages"
import {
  LIFECYCLE_EDIT_OPTIONS,
  LIFECYCLE_LABEL,
} from "@/features/consultants/candidates/candidates-view"
import type { ConsultantsCandidateRow } from "@/features/consultants/candidates/data/consultants-candidates.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Édition inline « Étape / statut » (§ 14.4, C-07) — un contrôle par dimension,
//  chacun écrivant dans le bon modèle via les Server Actions recrutement
//  existantes (C-12, jamais dupliquées) :
//   • lifecycle candidat  → `candidates.status`                (toujours visible)
//   • étape du process    → `candidate_hiring_processes.current_step`
//                                                (visible si process actif)
//  Le positionnement commercial (`opportunity_candidates.status`) reste édité
//  dans le drawer / audité au Lot 9 : la ligne candidate-centric n'en porte pas
//  l'identifiant.
// ─────────────────────────────────────────────────────────────────────────────

function stop(event: React.SyntheticEvent) {
  event.stopPropagation()
}

function LifecycleSelect({
  candidateId,
  status,
}: {
  candidateId: string
  status: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const current = status ?? ""
  const [optimistic, setOptimistic] = useOptimistic(current)

  const options = LIFECYCLE_EDIT_OPTIONS.includes(
    optimistic as (typeof LIFECYCLE_EDIT_OPTIONS)[number],
  )
    ? LIFECYCLE_EDIT_OPTIONS
    : ([optimistic, ...LIFECYCLE_EDIT_OPTIONS] as readonly string[])

  return (
    <div onClick={stop} className="w-full max-w-[10rem]">
      <Select
        value={optimistic}
        size="sm"
        disabled={isPending}
        aria-label="Statut du candidat"
        className="text-xs font-semibold"
        onChange={(event) => {
          const next = event.target.value
          if (next === current) return
          startTransition(async () => {
            setOptimistic(next)
            await updateCandidateStatus(candidateId, next)
            router.refresh()
          })
        }}
      >
        {options.map((value) => (
          <option key={value} value={value}>
            {LIFECYCLE_LABEL[value] ?? value}
          </option>
        ))}
      </Select>
    </div>
  )
}

function HiringStepSelect({
  processId,
  step,
}: {
  processId: string
  step: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const current = step ?? HIRING_KANBAN_STAGES[0].key
  const [optimistic, setOptimistic] = useOptimistic(current)

  return (
    <div onClick={stop} className="w-full max-w-[10rem]">
      <Select
        value={optimistic}
        size="sm"
        disabled={isPending}
        aria-label="Étape du process de recrutement"
        className="text-[11px] font-medium"
        onChange={(event) => {
          const next = event.target.value
          if (next === current) return
          startTransition(async () => {
            setOptimistic(next)
            await updateHiringStep(processId, next)
            router.refresh()
          })
        }}
      >
        {HIRING_KANBAN_STAGES.map((stage) => (
          <option key={stage.key} value={stage.key}>
            {stage.label}
          </option>
        ))}
      </Select>
    </div>
  )
}

export function CandidateInlineControls({ row }: { row: ConsultantsCandidateRow }) {
  const activeProcess =
    row.latestHiringProcess?.status === "active" ? row.latestHiringProcess : null

  return (
    <div className="flex flex-col gap-1.5">
      <LifecycleSelect candidateId={row.candidateId} status={row.lifecycleStatusRaw} />
      {activeProcess && (
        <HiringStepSelect
          processId={activeProcess.processId}
          step={activeProcess.currentStep}
        />
      )}
    </div>
  )
}

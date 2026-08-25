export type ProposalApplyOperation = {
  proposal_id: string | null
  status: string | null
}

export type AccountScanApplyOutcome = {
  appliedIds: Set<string>
  remainingSelectedIds: Set<string>
  completedApplyCount: number | null
  kind: "complete" | "partial" | "failure"
}

export function resolveAccountScanApplyOutcome(
  selectedIds: Iterable<string>,
  results: ProposalApplyOperation[],
): AccountScanApplyOutcome {
  const selected = new Set(selectedIds)
  const appliedIds = new Set(
    results.flatMap((result) =>
      result.status === "applied" && result.proposal_id && selected.has(result.proposal_id)
        ? [result.proposal_id]
        : [],
    ),
  )
  const remainingSelectedIds = new Set(
    Array.from(selected).filter((id) => !appliedIds.has(id)),
  )
  const isComplete = selected.size > 0 && appliedIds.size === selected.size

  return {
    appliedIds,
    remainingSelectedIds,
    completedApplyCount: isComplete ? appliedIds.size : null,
    kind: isComplete ? "complete" : appliedIds.size > 0 ? "partial" : "failure",
  }
}

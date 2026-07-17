import type {
  NeedsStaffingDirection,
  NeedsStaffingSortField,
  NeedsStaffingUrlState,
} from "./url-state"

type NeedsRowLike = {
  stage?: string | null
  priority?: string | null
  practice?: string | null
  acv?: number | null
  estimatedGain?: number | null
}

type StaffingRowLike = {
  status: string
  opportunityPriority: string
  practice: string | null
}

export function matchesSharedFilters(
  value: string | null | undefined,
  filter: string | null,
) {
  if (!filter) return true
  return (value ?? "") === filter
}

export function filterNeedsRows<T extends NeedsRowLike>(
  rows: T[],
  state: Pick<NeedsStaffingUrlState, "stage" | "priority" | "practice" | "sort" | "direction">,
) {
  const filtered = rows.filter((row) => (
    matchesSharedFilters(row.stage, state.stage)
    && matchesSharedFilters(row.priority, state.priority)
    && matchesSharedFilters(row.practice, state.practice)
  ))

  return sortNeedsRows(filtered, state.sort, state.direction)
}

export function sortNeedsRows<T extends NeedsRowLike>(
  rows: T[],
  sort: NeedsStaffingSortField,
  direction: NeedsStaffingDirection,
) {
  if (sort !== "acv" || !direction) return rows

  return [...rows].sort((left, right) => {
    const leftValue = left.acv ?? left.estimatedGain ?? 0
    const rightValue = right.acv ?? right.estimatedGain ?? 0

    return direction === "asc"
      ? leftValue - rightValue
      : rightValue - leftValue
  })
}

export function filterStaffingRows<T extends StaffingRowLike>(
  rows: T[],
  state: Pick<NeedsStaffingUrlState, "stage" | "priority" | "practice">,
) {
  return rows.filter((row) => (
    matchesSharedFilters(row.status, state.stage)
    && matchesSharedFilters(row.opportunityPriority, state.priority)
    && matchesSharedFilters(row.practice, state.practice)
  ))
}

export function cycleAcvSort(
  sort: NeedsStaffingSortField,
  direction: NeedsStaffingDirection,
) {
  if (sort !== "acv" || direction === null) {
    return { sort: "acv" as const, direction: "desc" as const }
  }

  if (direction === "desc") {
    return { sort: "acv" as const, direction: "asc" as const }
  }

  return { sort: null, direction: null }
}

export function groupActiveStaffingsByOpportunityId<T extends { opportunityId: string | null; status: string }>(
  staffingRows: T[],
  isActivePositioningStatus: (status: string) => boolean,
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const s of staffingRows) {
    if (!s.opportunityId) continue
    if (!isActivePositioningStatus(s.status)) continue
    const list = map.get(s.opportunityId) ?? []
    list.push(s)
    map.set(s.opportunityId, list)
  }
  return map
}

export function resolveProfilePractice(
  isCollaborator: boolean,
  collaboratorPractice: string | null | undefined,
  candidatePractice: string | null | undefined,
  opportunityPractice: string | null | undefined,
): string | null {
  let practice: string | null = null
  if (isCollaborator) {
    practice = collaboratorPractice || null
  } else {
    practice = candidatePractice || null
  }
  return practice || opportunityPractice || null
}

export function buildFinancialPreset(
  candidateId: string,
  candidateName: string,
  salary: number | null,
  companyId: string | null,
  opportunityId: string,
  salesDailyRate: number | null,
) {
  return {
    mode: "flash" as const,
    title: `Simulation financière — ${candidateName}`,
    candidateId,
    candidateName,
    annualGrossSalary: salary,
    companyId,
    opportunityId,
    salesDailyRate,
  }
}


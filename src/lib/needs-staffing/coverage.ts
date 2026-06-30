export const NEGATIVE_TERMINAL_POSITIONING_STATUSES = new Set([
  "refuse_client",
  "refuse_candidat",
  "abandonne",
])

// A positioning contributes to coverage only once it has moved beyond sourcing
// and is concretely engaged in the client process.
export const COVERING_POSITIONING_STATUSES = new Set([
  "envoye_client",
  "entretien_planifie",
  "entretien_realise",
  "retenu",
  "gagne",
])

export interface StaffingNeedLike {
  id: string
  requiredHeadcount: number | null | undefined
  requiresStaffing: boolean | null | undefined
}

export interface OpportunityPositioningLike {
  opportunityId: string
  status: string | null | undefined
}

export interface CoverageMetrics {
  openNeedsCount: number
  activePositioningsCount: number
  coveredPlacements: number
  requiredHeadcountTotal: number
  coverageRate: number
}

export function isStaffingNeedOpportunity({
  requiredHeadcount,
  requiresStaffing,
}: Pick<StaffingNeedLike, "requiredHeadcount" | "requiresStaffing">) {
  if (requiresStaffing === true) return true
  if (requiresStaffing === false) return false
  return (requiredHeadcount ?? 0) > 0
}

export function getNormalizedRequiredHeadcount(value: number | null | undefined) {
  return Math.max(0, Math.trunc(value ?? 0))
}

export function isActivePositioningStatus(status: string | null | undefined) {
  return !NEGATIVE_TERMINAL_POSITIONING_STATUSES.has(status ?? "")
}

export function isCoveringPositioningStatus(status: string | null | undefined) {
  return COVERING_POSITIONING_STATUSES.has(status ?? "")
}

export function calculateCoverageMetrics(
  needs: StaffingNeedLike[],
  positionings: OpportunityPositioningLike[],
): CoverageMetrics {
  const linksByOpportunity = new Map<string, OpportunityPositioningLike[]>()

  for (const positioning of positionings) {
    const existing = linksByOpportunity.get(positioning.opportunityId) ?? []
    existing.push(positioning)
    linksByOpportunity.set(positioning.opportunityId, existing)
  }

  let activePositioningsCount = 0
  let coveredPlacements = 0
  let requiredHeadcountTotal = 0

  for (const positioning of positionings) {
    if (isActivePositioningStatus(positioning.status)) {
      activePositioningsCount += 1
    }
  }

  for (const need of needs) {
    const requiredHeadcount = getNormalizedRequiredHeadcount(need.requiredHeadcount)
    requiredHeadcountTotal += requiredHeadcount

    const coveredForNeed = (linksByOpportunity.get(need.id) ?? []).filter((positioning) =>
      isCoveringPositioningStatus(positioning.status),
    ).length

    coveredPlacements += Math.min(coveredForNeed, requiredHeadcount)
  }

  const coverageRate =
    requiredHeadcountTotal > 0
      ? Math.round((coveredPlacements / requiredHeadcountTotal) * 100)
      : 0

  return {
    openNeedsCount: needs.length,
    activePositioningsCount,
    coveredPlacements,
    requiredHeadcountTotal,
    coverageRate,
  }
}

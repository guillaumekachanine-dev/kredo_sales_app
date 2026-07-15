import { createClient } from "@/lib/supabase/server"
import {
  calculateCoverageMetrics,
  getNormalizedRequiredHeadcount,
  isCoveringPositioningStatus,
  isStaffingNeedOpportunity,
  STAFFING_NEED_OR_FILTER,
} from "@/lib/needs-staffing/coverage"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import { resolveCompanyName } from "@/lib/companies/resolve-company-embed"

interface OpportunityRow {
  id: string
  title: string
  stage: string
  required_headcount: number
  requires_staffing: boolean
  companies: { name: string } | { name: string }[] | null
}

interface PositioningRow {
  opportunity_id: string
  status: string
}

export interface SharedNeedsStaffingKpis {
  openNeedsCount: number
  activePositioningsCount: number
  coverageRate: number
}

export interface NeedsCoverageSnapshot {
  requiredHeadcount: number
  coveringCount: number
  cappedCoveringCount: number
}

export interface OpenNeedOption {
  id: string
  title: string
  clientName: string
}

export interface NeedsStaffingSharedData {
  kpis: SharedNeedsStaffingKpis
  openNeeds: OpenNeedOption[]
  coverageByOpportunityId: Record<string, NeedsCoverageSnapshot>
}

export async function getNeedsStaffingSharedData(): Promise<NeedsStaffingSharedData> {
  const supabase = await createClient()

  // Filtre besoins de staffing poussé en base (le prédicat JS reste appliqué en garde-fou).
  const { data: opportunities, error: opportunitiesError } = await supabase
    .from("opportunities")
    .select(`
      id,
      title,
      stage,
      required_headcount,
      requires_staffing,
      companies (
        name
      )
    `)
    .or(STAFFING_NEED_OR_FILTER)

  if (opportunitiesError) {
    console.error("Error fetching needs staffing opportunities:", opportunitiesError)
    return {
      kpis: {
        openNeedsCount: 0,
        activePositioningsCount: 0,
        coverageRate: 0,
      },
      openNeeds: [],
      coverageByOpportunityId: {},
    }
  }

  const openNeeds = ((opportunities ?? []) as OpportunityRow[])
    .filter((opportunity) => isStaffingNeedOpportunity({
      requiredHeadcount: opportunity.required_headcount,
      requiresStaffing: opportunity.requires_staffing,
    }))
    .filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage))

  const opportunityIds = openNeeds.map((opportunity) => opportunity.id)

  const { data: positionings, error: positioningsError } = await supabase
    .from("opportunity_candidates")
    .select("opportunity_id, status")
    .in("opportunity_id", opportunityIds.length > 0 ? opportunityIds : ["__none__"])

  if (positioningsError) {
    console.error("Error fetching needs staffing positionings:", positioningsError)
  }

  const coverageMetrics = calculateCoverageMetrics(
    openNeeds.map((need) => ({
      id: need.id,
      requiredHeadcount: need.required_headcount,
      requiresStaffing: need.requires_staffing,
    })),
    ((positionings ?? []) as PositioningRow[]).map((positioning) => ({
      opportunityId: positioning.opportunity_id,
      status: positioning.status,
    })),
  )

  const coverageByOpportunityId: Record<string, NeedsCoverageSnapshot> = {}
  for (const need of openNeeds) {
    const requiredHeadcount = getNormalizedRequiredHeadcount(need.required_headcount)
    const coveringCount = ((positionings ?? []) as PositioningRow[]).filter((positioning) => (
      positioning.opportunity_id === need.id
      && isCoveringPositioningStatus(positioning.status)
    )).length

    coverageByOpportunityId[need.id] = {
      requiredHeadcount,
      coveringCount,
      cappedCoveringCount: Math.min(coveringCount, requiredHeadcount),
    }
  }

  return {
    kpis: {
      openNeedsCount: coverageMetrics.openNeedsCount,
      activePositioningsCount: coverageMetrics.activePositioningsCount,
      coverageRate: coverageMetrics.coverageRate,
    },
    openNeeds: openNeeds.map((need) => ({
      id: need.id,
      title: need.title,
      clientName: resolveCompanyName(need.companies),
    })),
    coverageByOpportunityId,
  }
}

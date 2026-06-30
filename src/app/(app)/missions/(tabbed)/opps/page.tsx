import { redirect } from "next/navigation"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { buildNeedsStaffingUrl, parseNeedsStaffingUrlState } from "@/lib/needs-staffing/url-state"
import { getNeedsStaffingSharedData } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { getOpportunitiesPlanning } from "@/app/(app)/missions/_data/get-opportunities-planning"
import { getStaffingsList } from "@/app/(app)/staffing/_data/get-staffings-list"
import { getStaffingsPlanning } from "@/app/(app)/staffing/_data/get-staffings-planning"
import { NeedsStaffingWorkspace } from "@/components/needs-staffing/NeedsStaffingWorkspace"

export const dynamic = "force-dynamic"

interface OppsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OpportunitesPage({ searchParams }: OppsPageProps) {
  const resolvedSearchParams = await searchParams

  if (!resolvedSearchParams.scope) {
    redirect(buildNeedsStaffingUrl("/missions/opps", parseNeedsStaffingUrlState(resolvedSearchParams)))
  }

  const state = parseNeedsStaffingUrlState(resolvedSearchParams)
  const device = await getDashboardDevice()

  // Charger toutes les données en parallèle pour alimenter le planning unifié et les switchs de vues
  const [sharedData, needsRows, needsPlanning, staffingsRows, staffingsPlanning] = await Promise.all([
    getNeedsStaffingSharedData(),
    getOpportunitiesList({ onlyStaffingNeeds: true }),
    getOpportunitiesPlanning({ onlyStaffingNeeds: true }),
    getStaffingsList(),
    getStaffingsPlanning(),
  ])

  return (
    <NeedsStaffingWorkspace
      device={device}
      sharedData={sharedData}
      needsData={{ rows: needsRows, planningData: needsPlanning }}
      staffingData={{ rows: staffingsRows, planningData: staffingsPlanning }}
    />
  )
}

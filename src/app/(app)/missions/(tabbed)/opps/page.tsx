import { redirect } from "next/navigation"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { buildNeedsStaffingUrl, parseNeedsStaffingUrlState } from "@/lib/needs-staffing/url-state"
import { getNeedsStaffingSharedData } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { getOpportunitiesPlanning } from "@/app/(app)/missions/_data/get-opportunities-planning"
import { getStaffingsList, getMobileStaffingsList } from "@/app/(app)/staffing/_data/get-staffings-list"
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

  const device = await getDashboardDevice()

  // La vue mobile ne rend que la liste des besoins (+ KPIs partagés).
  // On y charge également un dataset mobile très léger pour les enfants (staffings).
  if (device === "mobile") {
    const [sharedData, needsRows, mobileStaffingsRows] = await Promise.all([
      getNeedsStaffingSharedData(),
      getOpportunitiesList({ onlyStaffingNeeds: true }),
      getMobileStaffingsList(),
    ])

    return (
      <NeedsStaffingWorkspace
        device={device}
        sharedData={sharedData}
        needsData={{ rows: needsRows, planningData: [] }}
        mobileStaffingRows={mobileStaffingsRows}
      />
    )
  }

  // Desktop : charger l'ensemble en parallèle pour alimenter le planning unifié
  // et les switchs de vues (liste / kanban / planning, besoins / staffing).
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

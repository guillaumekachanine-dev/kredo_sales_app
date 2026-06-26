import { OpportunitiesDesktopView } from "@/components/missions/OpportunitiesDesktopView"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { getOpportunitiesPlanning } from "@/app/(app)/missions/_data/get-opportunities-planning"
import { createClient } from "@/lib/supabase/server"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export const dynamic = "force-dynamic"

export default async function OpportunitesPage() {
  const device = await getDashboardDevice()

  const [opportunites, planningData] = await Promise.all([
    getOpportunitiesList(),
    getOpportunitiesPlanning(),
  ])

  const openOpps = opportunites.filter((opportunity) => (
    opportunity.status === "active" || opportunity.status === "pending"
  ))
  const openOppIds = openOpps.map((opportunity) => opportunity.entityId)

  const weightedPipe = openOpps.reduce((sum, opportunity) => {
    const value = opportunity.acv ?? opportunity.estimatedGain ?? 0
    return sum + value * ((opportunity.conviction ?? 0) / 100)
  }, 0)

  const supabase = await createClient()
  const { data: candidates, error } = await supabase
    .from("opportunity_candidates")
    .select("opportunity_id")
    .in("opportunity_id", openOppIds.length > 0 ? openOppIds : ["__none__"])

  const coveredOppIds = new Set(candidates?.map((candidate) => candidate.opportunity_id) ?? [])
  const coverageRate =
    openOppIds.length > 0
      ? Math.round((coveredOppIds.size / openOppIds.length) * 100)
      : 0

  if (error) {
    console.error("Error fetching opportunity candidates metrics:", error)
  }

  return (
    <OpportunitiesDesktopView
      opportunities={opportunites}
      planningData={planningData}
      weightedPipe={weightedPipe}
      openOpportunitiesCount={openOpps.length}
      coverageRate={coverageRate}
      isMobile={device === "mobile"}
    />
  )
}

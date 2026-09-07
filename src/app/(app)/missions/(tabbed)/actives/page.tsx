import { redirect } from "next/navigation"
import { MissionsActivesContent } from "@/components/missions/MissionsActivesContent"
import { getMissionsList } from "@/app/(app)/missions/_data/get-missions-list"
import { getActiveMissionsPlanning } from "@/app/(app)/missions/_data/get-active-missions-planning"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export default async function MissionsActivesPage() {
  const device = await getDashboardDevice()

  // Sur Mobile, Engagements est unifié sur le shell /missions (ADR-0006) :
  // cette route (tabbed) est neutralisée au profit de la vue `?vue=missions-at`.
  if (device === "mobile") {
    redirect("/missions?vue=missions-at")
  }

  const [allMissions, planningRows] = await Promise.all([
    getMissionsList(),
    getActiveMissionsPlanning(),
  ])

  const activeMissions = allMissions.filter((m) => m.status === "active")

  return (
    <MissionsActivesContent
      missions={activeMissions}
      planningRows={planningRows}
      isMobile={false}
    />
  )
}

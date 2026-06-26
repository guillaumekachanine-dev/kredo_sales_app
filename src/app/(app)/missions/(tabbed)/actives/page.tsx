import { MissionsActivesContent } from "@/components/missions/MissionsActivesContent"
import { getMissionsList } from "@/app/(app)/missions/_data/get-missions-list"
import { getActiveMissionsPlanning } from "@/app/(app)/missions/_data/get-active-missions-planning"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export const dynamic = "force-dynamic"

export default async function MissionsActivesPage() {
  const [device, allMissions, planningRows] = await Promise.all([
    getDashboardDevice(),
    getMissionsList(),
    getActiveMissionsPlanning(),
  ])

  const activeMissions = allMissions.filter((m) => m.status === "active")

  return (
    <MissionsActivesContent
      missions={activeMissions}
      planningRows={planningRows}
      isMobile={device === "mobile"}
    />
  )
}

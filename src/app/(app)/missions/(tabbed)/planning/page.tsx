import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { MissionPlanningView } from "@/components/missions/planning/MissionPlanningView"
import { getActiveMissionsPlanning } from "@/app/(app)/missions/_data/get-active-missions-planning"

export const dynamic = "force-dynamic"

export default async function PlanningPage() {
  const [device, rows] = await Promise.all([
    getDashboardDevice(),
    getActiveMissionsPlanning(),
  ])

  return <MissionPlanningView rows={rows} isMobile={device === "mobile"} />
}

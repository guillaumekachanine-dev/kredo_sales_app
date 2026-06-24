import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getMissionsList } from "@/app/(app)/missions/_data/get-missions-list"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { getTrajectory2026 } from "@/app/(app)/missions/_data/get-trajectory-2026"
import { MissionsDesktopDashboard } from "./MissionsDesktopDashboard"
import { MissionsMobileDashboard } from "./MissionsMobileDashboard"
import { createClient } from "@/lib/supabase/server"
import { formatEuroCompact } from "@/lib/formatters"

export async function MissionsDashboardSection() {
  const supabase = await createClient()

  const [device, allMissions, opportunitiesData, trajectory, { data: compensations }, { data: collaborators }] = await Promise.all([
    getDashboardDevice(),
    getMissionsList(),
    getOpportunitiesList(),
    getTrajectory2026(),
    supabase.from("collaborator_compensation").select("taci"),
    supabase.from("collaborators").select("status"),
  ])

  const activeMissions = allMissions.filter((m) => m.status === "active")

  const opportunities = opportunitiesData.map((o) => ({
    entityId: o.entityId,
    title: o.title,
    client: o.client || "Compte non renseigné",
    amount: o.amount || "—",
    stage: o.stage || "qualification",
    conviction: o.conviction || 50,
    acv: o.acv,
    priority: o.priority || "normale",
    targetDailyRate: o.targetDailyRate || null,
    status: o.status,
  }))

  const activeMissionsWithTjm = activeMissions.filter((m) => m.tjm !== undefined && m.tjm > 0)
  const avgTjm = activeMissionsWithTjm.length > 0
    ? Math.round(activeMissionsWithTjm.reduce((sum, m) => sum + (m.tjm || 0), 0) / activeMissionsWithTjm.length)
    : 0

  const totalAcv = opportunitiesData.reduce((sum, o) => sum + (o.acv || o.estimatedGain || 0), 0)
  const totalPipe = formatEuroCompact(totalAcv)

  const taciValues = compensations?.map((c) => Number(c.taci)).filter((t) => !isNaN(t)) || []
  const avgTaci = taciValues.length > 0
    ? Math.round((taciValues.reduce((sum, val) => sum + val, 0) / taciValues.length) * 100)
    : 93

  const totalCollaborators = collaborators?.length || 0
  const benchCount = collaborators?.filter((c) => c.status === "intercontrat" || c.status === "available").length || 0
  const benchRate = totalCollaborators > 0
    ? Math.round((benchCount / totalCollaborators) * 1000) / 10
    : 8.2

  if (device === "mobile") {
    return (
      <MissionsMobileDashboard
        activeMissions={activeMissions}
        opportunities={opportunities}
        totalPipe={totalPipe}
        avgTaci={avgTaci}
        benchRate={benchRate}
        trajectory={trajectory}
      />
    )
  }

  return (
    <MissionsDesktopDashboard
      activeMissions={activeMissions}
      opportunities={opportunities}
      avgTjm={avgTjm}
      totalPipe={totalPipe}
      avgTaci={avgTaci}
      benchRate={benchRate}
      trajectory={trajectory}
    />
  )
}

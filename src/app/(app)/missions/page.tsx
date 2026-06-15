import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getMissionsList } from "@/app/(app)/missions/_data/get-missions-list"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { getTrajectory2026 } from "@/app/(app)/missions/_data/get-trajectory-2026"
import { MissionsDesktopDashboard } from "@/components/missions/dashboard/MissionsDesktopDashboard"
import { MissionsMobileDashboard } from "@/components/missions/dashboard/MissionsMobileDashboard"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function MissionsPage() {
  const device = await getDashboardDevice()
  
  // Load actual data from Supabase
  const allMissions = await getMissionsList()
  const activeMissions = allMissions.filter((m) => m.status === "active")
  
  const opportunitiesData = await getOpportunitiesList()
  const trajectory = await getTrajectory2026()
  
  // Map opportunities for display
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

  // Calculate Avg TJM
  const activeMissionsWithTjm = activeMissions.filter((m) => m.tjm !== undefined && m.tjm > 0)
  const avgTjm = activeMissionsWithTjm.length > 0
    ? Math.round(activeMissionsWithTjm.reduce((sum, m) => sum + (m.tjm || 0), 0) / activeMissionsWithTjm.length)
    : 0

  // Calculate Total pipeline value from active opportunities (ACV)
  const totalAcv = opportunitiesData.reduce((sum, o) => sum + (o.acv || o.estimatedGain || 0), 0)
  
  const formatEuro = (amount: number): string => {
    if (amount === 0) return "0 €"
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`
    }
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const totalPipe = formatEuro(totalAcv)

  // Fetch dynamic average TACI and Bench Rate from Supabase
  const supabase = await createClient()
  
  // 1. Average TACI
  const { data: compensations } = await supabase
    .from("collaborator_compensation")
    .select("taci")
  
  const taciValues = compensations?.map((c) => Number(c.taci)).filter((t) => !isNaN(t)) || []
  const avgTaci = taciValues.length > 0
    ? Math.round((taciValues.reduce((sum, val) => sum + val, 0) / taciValues.length) * 100)
    : 93 // Fallback default (93%)

  // 2. Bench Rate
  const { data: collaborators } = await supabase
    .from("collaborators")
    .select("status")
  
  const totalCollaborators = collaborators?.length || 0
  const benchCount = collaborators?.filter((c) => c.status === "intercontrat" || c.status === "available").length || 0
  const benchRate = totalCollaborators > 0
    ? Math.round((benchCount / totalCollaborators) * 1000) / 10
    : 8.2 // Fallback default (8.2%)

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

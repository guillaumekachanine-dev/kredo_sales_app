import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getMissionsList } from "@/app/(app)/missions/_data/get-missions-list"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { MissionsDesktopDashboard } from "@/components/missions/dashboard/MissionsDesktopDashboard"
import { MissionsMobileDashboard } from "@/components/missions/dashboard/MissionsMobileDashboard"

export const dynamic = "force-dynamic"

export default async function MissionsPage() {
  const device = await getDashboardDevice()
  
  // Load actual data from Supabase
  const allMissions = await getMissionsList()
  const activeMissions = allMissions.filter((m) => m.status === "active")
  
  const opportunitiesData = await getOpportunitiesList()
  
  // Map opportunities for display
  const opportunities = opportunitiesData.map((o) => ({
    entityId: o.entityId,
    title: o.title,
    client: o.client || "Compte non renseigné",
    amount: o.amount || "—",
    stage: (o as any).stage || "qualification",
    conviction: (o as any).conviction || 50,
    acv: (o as any).acv,
    priority: o.priority || "normale",
    targetDailyRate: (o as any).targetDailyRate || null,
  }))

  // Calculate Avg TJM
  const activeMissionsWithTjm = activeMissions.filter((m) => m.tjm !== undefined && m.tjm > 0)
  const avgTjm = activeMissionsWithTjm.length > 0
    ? Math.round(activeMissionsWithTjm.reduce((sum, m) => sum + (m.tjm || 0), 0) / activeMissionsWithTjm.length)
    : 0

  // Calculate Total pipeline value from active opportunities (ACV)
  const totalAcv = opportunitiesData.reduce((sum, o) => sum + ((o as any).acv || (o as any).estimatedGain || 0), 0)
  
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

  if (device === "mobile") {
    return (
      <MissionsMobileDashboard
        activeMissions={activeMissions}
        opportunities={opportunities}
        totalPipe={totalPipe}
      />
    )
  }

  return (
    <MissionsDesktopDashboard
      activeMissions={activeMissions}
      opportunities={opportunities}
      avgTjm={avgTjm}
      totalPipe={totalPipe}
    />
  )
}


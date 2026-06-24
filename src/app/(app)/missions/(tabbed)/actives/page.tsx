import { MissionsActivesContent } from "@/components/missions/MissionsActivesContent"
import { NewMissionButton } from "@/components/missions/NewMissionButton"
import { getMissionsList } from "@/app/(app)/missions/_data/get-missions-list"
import { getActiveMissionsPlanning } from "@/app/(app)/missions/_data/get-active-missions-planning"
import { HeaderKpiCard } from "@/components/missions/HeaderKpiCard"
import { formatEuro, formatPct } from "@/lib/formatters"

export const dynamic = "force-dynamic"

export default async function MissionsActivesPage() {
  const [allMissions, planningRows] = await Promise.all([
    getMissionsList(),
    getActiveMissionsPlanning(),
  ])

  const activeMissions = allMissions.filter((m) => m.status === "active")

  const activeMissionsWithTjm = activeMissions.filter((m) => m.tjm !== undefined && m.tjm > 0)
  const avgTjm = activeMissionsWithTjm.length > 0
    ? Math.round(activeMissionsWithTjm.reduce((sum, m) => sum + (m.tjm || 0), 0) / activeMissionsWithTjm.length)
    : 0

  const activeMissionsWithMargin = activeMissions.filter((m) => m.grossMarginPct !== null && m.grossMarginPct !== undefined)
  const avgMargin = activeMissionsWithMargin.length > 0
    ? activeMissionsWithMargin.reduce((sum, m) => sum + (m.grossMarginPct || 0), 0) / activeMissionsWithMargin.length
    : 0

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-border w-full">
        <h1 className="text-2xl font-bold font-heading tracking-tight text-heading shrink-0">
          Missions
        </h1>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center justify-around divide-x divide-border/60 w-full max-w-2xl">
            <HeaderKpiCard label="Missions en cours" value={activeMissions.length} className="flex-1" />
            <HeaderKpiCard label="TJ moyen" value={formatEuro(avgTjm)} className="flex-1" />
            <HeaderKpiCard label="Tx marge moyen" value={formatPct(avgMargin)} className="flex-1" />
          </div>
        </div>
        <div className="shrink-0 flex items-center justify-end">
          <NewMissionButton />
        </div>
      </div>

      <MissionsActivesContent
        missions={activeMissions}
        planningRows={planningRows}
      />
    </div>
  )
}

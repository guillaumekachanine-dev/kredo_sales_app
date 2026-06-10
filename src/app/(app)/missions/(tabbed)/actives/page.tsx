import { MissionsListView } from "@/components/missions/MissionsListView"
import { NewMissionButton } from "@/components/missions/NewMissionButton"
import { getMissionsList } from "@/app/(app)/missions/_data/get-missions-list"

export const dynamic = "force-dynamic"

export default async function MissionsActivesPage() {
  const allMissions = await getMissionsList()

  // Filter for active missions (i.e. status === "active")
  const activeMissions = allMissions.filter((m) => m.status === "active")

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight text-heading">
            Missions actives
          </h1>
          <p className="text-sm text-muted mt-1">
            {activeMissions.length} mission{activeMissions.length > 1 ? "s" : ""} en cours · cliquez une ligne pour ouvrir la fiche
          </p>
        </div>
        <NewMissionButton />
      </div>

      <MissionsListView rows={activeMissions} emptyMessage="Aucune mission active." />
    </div>
  )
}

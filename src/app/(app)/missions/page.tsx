import { Suspense } from "react"
import { MissionsDashboardSection } from "@/components/missions/dashboard/MissionsDashboardSection"
import { EngagementsOverviewSkeleton } from "@/components/missions/dashboard/EngagementsOverviewSkeleton"

export default function MissionsPage() {
  return (
    <Suspense fallback={<EngagementsOverviewSkeleton />}>
      <MissionsDashboardSection />
    </Suspense>
  )
}

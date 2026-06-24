import { Suspense } from "react"
import { MissionsDashboardSection } from "@/components/missions/dashboard/MissionsDashboardSection"
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton"

export const dynamic = "force-dynamic"

export default function MissionsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MissionsDashboardSection />
    </Suspense>
  )
}

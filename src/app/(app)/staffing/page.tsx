import { Suspense } from "react"
import { SyntheseStaffingSection } from "@/components/staffing"
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton"

export const dynamic = "force-dynamic"

export default function StaffingPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SyntheseStaffingSection />
    </Suspense>
  )
}

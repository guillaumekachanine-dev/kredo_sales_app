import { Suspense } from "react"
import { AutomationsSection } from "@/components/automations"
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton"

export default function AutomationsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AutomationsSection />
    </Suspense>
  )
}

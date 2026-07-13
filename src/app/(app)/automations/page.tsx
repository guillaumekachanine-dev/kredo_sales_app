import { Suspense } from "react"
import { AutomationsSection } from "@/components/automations"
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton"

export const dynamic = "force-dynamic"

export default function AutomationsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AutomationsSection />
    </Suspense>
  )
}

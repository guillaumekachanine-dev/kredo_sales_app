import { Suspense } from "react"
import { SyntheseCockpitSection } from "@/components/cockpit"
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton"

export const dynamic = "force-dynamic"

export default function CockpitPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SyntheseCockpitSection />
    </Suspense>
  )
}

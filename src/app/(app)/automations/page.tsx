import { Suspense } from "react"
import { AutomationsSection } from "@/components/automations"
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton"

export default async function AutomationsPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const { run } = await searchParams
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AutomationsSection initialRunId={run} />
    </Suspense>
  )
}

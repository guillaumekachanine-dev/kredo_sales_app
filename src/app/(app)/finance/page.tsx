import { Suspense } from "react"
import { SyntheseFinanceSection } from "@/components/finance"
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton"

export const dynamic = "force-dynamic"

export default function FinancePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SyntheseFinanceSection />
    </Suspense>
  )
}

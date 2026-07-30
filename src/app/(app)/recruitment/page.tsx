import { Suspense } from "react"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { RecruitmentWorkspace } from "@/components/recruitment/RecruitmentWorkspace"
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton"
import { getRecruitmentWorkspace } from "./_data/get-recruitment-workspace"

async function RecruitmentPageContent() {
  const [device, rows] = await Promise.all([
    getDashboardDevice(),
    getRecruitmentWorkspace(),
  ])

  return <RecruitmentWorkspace rows={rows} isMobile={device === "mobile"} />
}

export default function RecruitmentPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RecruitmentPageContent />
    </Suspense>
  )
}

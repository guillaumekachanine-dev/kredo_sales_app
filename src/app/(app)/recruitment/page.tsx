import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { RecruitmentDashboardWrapper } from "@/components/recruitment/RecruitmentDashboardWrapper"

export const dynamic = "force-dynamic"

export default async function RecruitmentPage() {
  const device = await getDashboardDevice()

  return <RecruitmentDashboardWrapper device={device} />
}

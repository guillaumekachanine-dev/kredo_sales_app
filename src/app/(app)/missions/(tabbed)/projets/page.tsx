import { redirect } from "next/navigation"
import { getProjectsList } from "@/app/(app)/missions/_data/get-projects-list"
import { ProjectsContent } from "@/components/missions/ProjectsContent"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export default async function ProjetsPage() {
  const device = await getDashboardDevice()

  // Sur Mobile, Engagements est unifié sur le shell /missions (ADR-0006) :
  // cette route (tabbed) est neutralisée au profit de la vue `?vue=projets`.
  if (device === "mobile") {
    redirect("/missions?vue=projets")
  }

  const projects = await getProjectsList()
  return <ProjectsContent projects={projects} />
}

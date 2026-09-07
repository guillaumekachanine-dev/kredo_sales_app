import { getProjectsList } from "@/app/(app)/missions/_data/get-projects-list"
import { ProjectsContent } from "@/components/missions/ProjectsContent"

export default async function ProjetsPage() {
  const projects = await getProjectsList()
  return <ProjectsContent projects={projects} />
}


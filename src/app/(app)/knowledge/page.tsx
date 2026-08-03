import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { KnowledgeHubDesktop } from "@/features/knowledge-hub/KnowledgeHubDesktop"
import { KnowledgeHubMobile } from "@/features/knowledge-hub/KnowledgeHubMobile"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { getKredoExpertiseSnapshot } from "@/features/knowledge-hub/expertise/get-kredo-expertise-snapshot"
import { getTalentKnowledgeSnapshot } from "@/features/knowledge-hub/talents/get-talent-knowledge-snapshot"

export const metadata = {
  title: "Knowledge Hub — KREDO",
  description: "Portail de capitalisation des connaissances et d'intelligence collective.",
}

export default async function KnowledgePage() {
  const workspaceId = await resolveCurrentWorkspaceId()
  if (!workspaceId) {
    throw new Error("Workspace introuvable")
  }

  const [device, expertiseSnapshot, talentSnapshot] = await Promise.all([
    getDashboardDevice(),
    getKredoExpertiseSnapshot(workspaceId),
    getTalentKnowledgeSnapshot(workspaceId),
  ])

  if (device === "mobile") {
    return <KnowledgeHubMobile snapshot={expertiseSnapshot} talentSnapshot={talentSnapshot} />
  }

  return <KnowledgeHubDesktop snapshot={expertiseSnapshot} talentSnapshot={talentSnapshot} />
}

import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { KnowledgeHubDesktop } from "@/features/knowledge-hub/KnowledgeHubDesktop"
import { KnowledgeHubMobile } from "@/features/knowledge-hub/KnowledgeHubMobile"

export const metadata = {
  title: "Knowledge Hub — KREDO",
  description: "Portail de capitalisation des connaissances et d'intelligence collective.",
}

export default async function KnowledgePage() {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    return <KnowledgeHubMobile />
  }

  return <KnowledgeHubDesktop />
}

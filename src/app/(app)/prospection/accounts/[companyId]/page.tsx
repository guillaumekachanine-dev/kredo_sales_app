import { notFound } from "next/navigation"
import { ClientIntelligenceView } from "@/components/accounts-contacts/intelligence/ClientIntelligenceView"
import { RegisterBreadcrumbLabel } from "@/components/layout/RegisterBreadcrumbLabel"
import { getClientIntelligence } from "@/lib/intelligence/intelligence-data"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export const dynamic = "force-dynamic"

// Client Intelligence Hub — page BI par compte (ADR-0008).
// Lecture seule sur le moteur 0007 + fallback metadata FOLIO. Deep-linkable.
export default async function ClientIntelligencePage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params

  const [device, result] = await Promise.all([
    getDashboardDevice(),
    getClientIntelligence(companyId),
  ])

  if (!result.data) {
    if (result.error && result.error !== "Compte introuvable") {
      throw new Error(result.error)
    }
    notFound()
  }

  return (
    <>
      <RegisterBreadcrumbLabel segment={companyId} label={result.data.company.name} />
      <ClientIntelligenceView data={result.data} device={device} />
    </>
  )
}

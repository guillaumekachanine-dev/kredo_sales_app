import { notFound } from "next/navigation"
import { ClientIntelligenceView } from "@/components/accounts-contacts/intelligence/ClientIntelligenceView"
import { RegisterBreadcrumbLabel } from "@/components/layout/RegisterBreadcrumbLabel"
import { RegisterIntelligenceContext } from "@/components/intelligence/RegisterIntelligenceContext"
import { getClientIntelligence } from "@/lib/intelligence/intelligence-data"
import { getAccountIntelligencePanelData } from "@/lib/intelligence/account-panel-data"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getActiveFinancialReferenceByCompanyId } from "@/features/financial-modeling/data/get-financial-reference"

export default async function ClientIntelligencePage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params

  const [device, result, panelResult, financialReference] = await Promise.all([
    getDashboardDevice(),
    getClientIntelligence(companyId),
    getAccountIntelligencePanelData(companyId),
    getActiveFinancialReferenceByCompanyId(companyId),
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
      {panelResult.data && (
        <RegisterIntelligenceContext
          entityType="company"
          entityId={companyId}
          label={result.data.company.name}
          panelData={panelResult.data}
        />
      )}
      <ClientIntelligenceView data={result.data} device={device} financialReference={financialReference} />
    </>
  )
}

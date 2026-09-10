import { notFound } from "next/navigation"
import { ClientIntelligenceView } from "@/components/accounts-contacts/intelligence/ClientIntelligenceView"
import { RegisterBreadcrumbLabel } from "@/components/layout/RegisterBreadcrumbLabel"
import { RegisterIntelligenceContext } from "@/components/intelligence/RegisterIntelligenceContext"
import { getClientIntelligence } from "@/lib/intelligence/intelligence-data"
import { getAccountIntelligencePanelData } from "@/lib/intelligence/account-panel-data"
import { getAccountIntelligenceHomeFinancials } from "@/lib/intelligence/account-intelligence-home-financials"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getActiveFinancialReferenceByCompanyId } from "@/features/financial-modeling/data/get-financial-reference"

export default async function ClientIntelligencePage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params

  // `getDashboardDevice()` est une lecture d'en-tête mémoïsée : zéro réseau.
  // L'attendre en premier permet de faire partir les agrégats portefeuille dans
  // la MÊME vague que le reste, au lieu d'une vague supplémentaire après coup
  // (constat F-1a : c'était la 5e et dernière vague de la page).
  const device = await getDashboardDevice()

  const [result, panelResult, financialReference, homeFinancials] = await Promise.all([
    getClientIntelligence(companyId),
    getAccountIntelligencePanelData(companyId),
    getActiveFinancialReferenceByCompanyId(companyId),
    // Les agrégats portefeuille servent uniquement au template desktop : ne pas
    // charger ce read-model supplémentaire sur mobile.
    device === "mobile" ? Promise.resolve(null) : getAccountIntelligenceHomeFinancials(companyId),
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
      <ClientIntelligenceView
        data={result.data}
        device={device}
        financialReference={financialReference}
        homeFinancials={homeFinancials}
        playbookSlug={panelResult.data?.sector.structuredSectorSlug ?? null}
      />
    </>
  )
}

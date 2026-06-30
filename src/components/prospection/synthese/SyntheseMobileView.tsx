import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { MobileHeroInsight } from "@/components/ui/mobile/MobileHeroInsight"
import { MobileErrorWithRetry } from "./MobileErrorWithRetry"
import type { SyntheseDesignVariant } from "./design-variants"
import { buildMobilePriorityViewModel, parseLens } from "./mobile-priority-view-model"
import { MobilePriorityInteractiveList } from "./MobilePriorityInteractiveList"
import type { ProspectionSummaryData } from "@/lib/prospection/prospection-summary-data"
import type { ProspectionSummaryFilters } from "./synthese-view-model"

export function SyntheseMobileView({
  data,
  lens: rawLens,
  design = null,
}: {
  data: ProspectionSummaryData
  lens?: string
  design?: SyntheseDesignVariant | null
}) {
  if (data.state === "error") {
    return (
      <MobileActionPage
        header={
          <MobilePageHeader eyebrow="CRM · Synthèse" title="Priorités commerciales" />
        }
      >
        <MobileErrorWithRetry title={data.title} message={data.message} />
      </MobileActionPage>
    )
  }

  if (data.accounts.length === 0) {
    return (
      <MobileActionPage
        header={
          <MobilePageHeader eyebrow="CRM · Synthèse" title="Priorités commerciales" />
        }
        hero={
          <MobileHeroInsight
            tone="neutral"
            title="Aucun compte dans le portefeuille"
            summary="La synthèse apparaîtra dès que des comptes et des activités seront disponibles."
          />
        }
      >
        <div />
      </MobileActionPage>
    )
  }

  const activeLens = parseLens(rawLens ?? null)

  const filters: ProspectionSummaryFilters = {
    period: "90d",
    sector: "all",
    lifecycle: "all",
    priority: "all",
    focus: "all",
  }

  const viewModel = buildMobilePriorityViewModel({
    accounts: data.accounts,
    filters,
    lens: activeLens,
    trust: data.trust,
  })

  return <MobilePriorityInteractiveList viewModel={viewModel} design={design} />
}

import { OpportunitiesTriPanel } from "@/features/opportunities/desktop/OpportunitiesTriPanel"
import type { PlanningChapterData } from "./data/opportunities-planning.types"
import { PlanningDetailsPanel } from "./PlanningDetailsPanel"
import { PlanningListPanel } from "./PlanningListPanel"
import { PlanningTimeline } from "./PlanningTimeline"

interface PlanningDesktopProps {
  data: PlanningChapterData
  searchParamsString: string
}

export function PlanningDesktop({ data, searchParamsString }: PlanningDesktopProps) {
  const selectedItem =
    data.items.find((item) => item.id === data.selectedOpportunityId) ?? null

  return (
    <OpportunitiesTriPanel
      ariaLabel="Planning des opportunités"
      list={
        <PlanningListPanel
          items={data.items}
          selectedOpportunityId={data.selectedOpportunityId}
          searchParamsString={searchParamsString}
        />
      }
      main={
        <PlanningTimeline
          items={data.items}
          selectedOpportunityId={data.selectedOpportunityId}
          referenceDateIso={data.referenceDateIso}
          searchParamsString={searchParamsString}
        />
      }
      details={
        data.selectedOpportunityId ? (
          <PlanningDetailsPanel
            item={selectedItem}
            detail={data.selectedOpportunityDetail}
            detailError={data.selectedOpportunityDetailError}
          />
        ) : undefined
      }
    />
  )
}

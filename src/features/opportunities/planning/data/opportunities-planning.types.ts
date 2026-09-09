import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"
import type { OpportunityDeadline } from "./opportunity-deadline.types"

export interface PlanningOpportunityItem {
  id: string
  title: string
  clientName: string
  clientLogoPath: string | null
  clientWebsite: string | null
  stage: string
  priority: string
  deadline: OpportunityDeadline | null
}

export interface PlanningChapterData {
  items: PlanningOpportunityItem[]
  selectedOpportunityId: string | null
  selectedOpportunityDetail: OpportunityDetailData | null
  selectedOpportunityDetailError: string | null
  referenceDateIso: string
  dataNotes: string[]
}

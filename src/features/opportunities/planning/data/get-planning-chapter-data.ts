import "server-only"

import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { getOpportunityDetail } from "@/app/(app)/missions/_data/get-opportunity-detail"
import { buildPlanningChapter } from "./build-planning-chapter"
import { getOpportunityDeadlines } from "./get-opportunity-deadlines"
import type { PlanningChapterData } from "./opportunities-planning.types"

export async function getPlanningChapterData(
  requestedOpportunityId: string | null,
  referenceDate: Date = new Date(),
): Promise<PlanningChapterData> {
  const [rows, deadlines] = await Promise.all([
    getOpportunitiesList(),
    getOpportunityDeadlines(referenceDate),
  ])
  const projection = buildPlanningChapter({ rows, deadlines, requestedOpportunityId })

  let selectedOpportunityDetail: PlanningChapterData["selectedOpportunityDetail"] = null
  let selectedOpportunityDetailError: string | null = null
  if (projection.selectedOpportunityId) {
    const result = await getOpportunityDetail(projection.selectedOpportunityId)
    if (result.data) selectedOpportunityDetail = result.data
    else selectedOpportunityDetailError = result.error
  }

  return {
    ...projection,
    selectedOpportunityDetail,
    selectedOpportunityDetailError,
    referenceDateIso: referenceDate.toISOString(),
  }
}

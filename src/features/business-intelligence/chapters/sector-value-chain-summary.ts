import type { SegmentValueChainReadModel } from "../data/business-intelligence-workspace-types"

export type SectorValueChainSummaryStep = {
  id: string
  order: number
  stageLabel: string
  activityLabel: string
  description: string | null
}

export type SectorValueChainSummary = {
  level: "segment" | "macro"
  updatedAt: string | null
  steps: SectorValueChainSummaryStep[]
}

export function buildSectorValueChainSummary(
  valueChain: SegmentValueChainReadModel | null | undefined,
): SectorValueChainSummary | null {
  if (!valueChain || !valueChain.catalog || valueChain.catalog.state !== "ready") {
    return null
  }

  const map =
    valueChain.catalog.maps.find((m) => m.sector.id === valueChain.sourceSectorId) ??
    valueChain.catalog.maps[0]

  if (!map || !map.activities || map.activities.length === 0) {
    return null
  }

  const sortedActivities = [...map.activities].sort((a, b) => {
    const stageA = map.stages?.find((s) => s.id === a.stageId)
    const stageB = map.stages?.find((s) => s.id === b.stageId)
    const stageOrderA = stageA?.order ?? 999
    const stageOrderB = stageB?.order ?? 999
    if (stageOrderA !== stageOrderB) return stageOrderA - stageOrderB
    return a.order - b.order
  })

  const steps: SectorValueChainSummaryStep[] = sortedActivities.map((act, index) => {
    const stage = map.stages?.find((s) => s.id === act.stageId)
    const ev = map.evidence?.find((e) => e.id === `node:${act.id}` || e.id.endsWith(act.id))
    const description = ev?.excerpt && ev.excerpt.trim().length > 0 ? ev.excerpt.trim() : null

    return {
      id: act.id,
      order: index + 1,
      stageLabel: stage?.label ?? `Étape ${index + 1}`,
      activityLabel: act.label,
      description,
    }
  })

  if (steps.length === 0) return null

  return {
    level: valueChain.level,
    updatedAt: valueChain.updatedAt,
    steps,
  }
}

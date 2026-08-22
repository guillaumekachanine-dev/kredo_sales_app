import type {
  SectorKnowledgeEventItem,
  SectorKnowledgeRegulatoryItem,
} from "@/features/master-study/data/get-sector-knowledge-read-model"

export type SectorTimelineKind = "regulatory" | "rupture"

export type SectorTimelineItem = {
  id: string
  kind: SectorTimelineKind
  title: string
  description: string | null
  date: string | null
  urgency: string | null
  authority: string | null
  practiceKredo: string | null
  commercialAngle: string | null
  resolvedLevel: "segment" | "macro"
  sourceUrl: string | null
  relatedIds?: string[]
}

export type SectorTimelineGroup = {
  datedItems: SectorTimelineItem[]
  permanentItems: SectorTimelineItem[]
}

export function extractRegulatoryKey(text: string | null | undefined): string | null {
  if (!text) return null
  const upper = text.toUpperCase()
  if (upper.includes("2023/1545") || upper.includes("1545/2023")) {
    return "UE 2023/1545"
  }
  if (upper.includes("IFRA 52") || upper.includes("IFRA 52E")) {
    return "IFRA 52"
  }
  if (upper.includes("IFRA 51") || upper.includes("IFRA 51E")) {
    return "IFRA 51"
  }
  if (upper.includes("REACH")) {
    return "REACH"
  }
  if (upper.includes("CSRD")) {
    return "CSRD"
  }
  return null
}

function parseDateValue(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const time = new Date(dateStr).getTime()
  return Number.isNaN(time) ? null : time
}

function mergeTimelineItems(items: SectorTimelineItem[]): SectorTimelineItem {
  if (items.length === 1) return items[0]

  const hasRegulatory = items.some((i) => i.kind === "regulatory")
  const hasSegment = items.some((i) => i.resolvedLevel === "segment")

  // Segment items take priority for title and description
  const segmentItem = items.find((i) => i.resolvedLevel === "segment")
  const regItem = items.find((i) => i.kind === "regulatory")
  const primaryItem = segmentItem ?? regItem ?? items[0]

  // Urgency priority: critical > high > medium > normal
  const urgencyPriority: Record<string, number> = {
    critical: 4,
    critique: 4,
    high: 3,
    haute: 3,
    medium: 2,
    moyenne: 2,
    normal: 1,
  }

  let bestUrgency: string | null = null
  let maxPriority = 0
  for (const item of items) {
    if (item.urgency) {
      const prio = urgencyPriority[item.urgency.toLowerCase()] ?? 1
      if (prio > maxPriority) {
        maxPriority = prio
        bestUrgency = item.urgency
      }
    }
  }

  const descriptions = Array.from(
    new Set(
      items
        .map((i) => i.description?.trim())
        .filter((d): d is string => Boolean(d && d.length > 0))
    )
  )

  const commercialAngles = Array.from(
    new Set(
      items
        .map((i) => i.commercialAngle?.trim())
        .filter((a): a is string => Boolean(a && a.length > 0))
    )
  )

  const date = items.find((i) => i.date !== null)?.date ?? null
  const authority = items.find((i) => i.authority !== null)?.authority ?? null
  const practiceKredo = items.find((i) => i.practiceKredo !== null)?.practiceKredo ?? null
  const sourceUrl = items.find((i) => i.sourceUrl !== null)?.sourceUrl ?? null

  return {
    id: primaryItem.id,
    kind: hasRegulatory ? "regulatory" : "rupture",
    title: primaryItem.title,
    description: descriptions.length > 0 ? descriptions.join(" — ") : null,
    date,
    urgency: bestUrgency,
    authority,
    practiceKredo,
    commercialAngle: commercialAngles.length > 0 ? commercialAngles[0] : null,
    resolvedLevel: hasSegment ? "segment" : "macro",
    sourceUrl,
    relatedIds: items.map((i) => i.id),
  }
}

export function buildSectorTimeline({
  regulatory = [],
  events = [],
}: {
  regulatory?: SectorKnowledgeRegulatoryItem[]
  events?: SectorKnowledgeEventItem[]
}): SectorTimelineGroup {
  const candidates: Array<{ item: SectorTimelineItem; key: string | null }> = []

  for (const reg of regulatory) {
    const key = extractRegulatoryKey(reg.name) ?? extractRegulatoryKey(reg.description)
    candidates.push({
      key,
      item: {
        id: reg.id,
        kind: "regulatory",
        title: reg.name,
        description: reg.description,
        date: reg.deadlineDate,
        urgency: reg.urgency,
        authority: reg.authority,
        practiceKredo: reg.kredoPractice,
        commercialAngle: reg.commercialAngle,
        resolvedLevel: reg.resolvedLevel,
        sourceUrl: reg.sourceUrl,
      },
    })
  }

  for (const evt of events) {
    const key = extractRegulatoryKey(evt.title) ?? extractRegulatoryKey(evt.description)
    candidates.push({
      key,
      item: {
        id: evt.id,
        kind: "rupture",
        title: evt.title,
        description: evt.description,
        date: evt.eventDate,
        urgency: null,
        authority: null,
        practiceKredo: null,
        commercialAngle: evt.commercialOpportunity,
        resolvedLevel: evt.resolvedLevel,
        sourceUrl: evt.sourceUrl,
      },
    })
  }

  const unkeyedItems: SectorTimelineItem[] = []
  const keyedGroups = new Map<string, SectorTimelineItem[]>()

  for (const { key, item } of candidates) {
    if (!key) {
      unkeyedItems.push(item)
    } else {
      const existing = keyedGroups.get(key) ?? []
      existing.push(item)
      keyedGroups.set(key, existing)
    }
  }

  const processedKeyedItems: SectorTimelineItem[] = []

  for (const [, groupItems] of keyedGroups.entries()) {
    const datedGroupItems = groupItems.filter((i) => i.date !== null)
    const undatedGroupItems = groupItems.filter((i) => i.date === null)

    if (datedGroupItems.length === 0) {
      // All items for this key are undated -> merge into a single permanent item
      processedKeyedItems.push(mergeTimelineItems(undatedGroupItems))
    } else {
      // Group dated items by date string or date milestone
      const dateBuckets = new Map<string, SectorTimelineItem[]>()
      for (const item of datedGroupItems) {
        const dKey = item.date ?? "undated"
        const bucket = dateBuckets.get(dKey) ?? []
        bucket.push(item)
        dateBuckets.set(dKey, bucket)
      }

      const mergedMilestones: SectorTimelineItem[] = []
      for (const [, bucketItems] of dateBuckets.entries()) {
        mergedMilestones.push(mergeTimelineItems(bucketItems))
      }

      // If there are also undated items for this key, merge their metadata into the primary regulatory milestone
      if (undatedGroupItems.length > 0) {
        const primaryMilestoneIndex = mergedMilestones.findIndex((m) => m.kind === "regulatory")
        const targetIndex = primaryMilestoneIndex >= 0 ? primaryMilestoneIndex : 0
        mergedMilestones[targetIndex] = mergeTimelineItems([mergedMilestones[targetIndex], ...undatedGroupItems])
      }

      processedKeyedItems.push(...mergedMilestones)
    }
  }

  const allProcessed = [...unkeyedItems, ...processedKeyedItems]

  const datedItems = allProcessed
    .filter((item) => parseDateValue(item.date) !== null)
    .sort((a, b) => (parseDateValue(a.date) ?? 0) - (parseDateValue(b.date) ?? 0))

  const permanentItems = allProcessed.filter((item) => parseDateValue(item.date) === null)

  return {
    datedItems,
    permanentItems,
  }
}

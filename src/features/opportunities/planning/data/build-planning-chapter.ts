import type { MissionsListRow } from "@/components/missions/MissionsListView"
import { isOpenOpportunityStage } from "@/lib/opportunities/stages"
import type { OpportunityDeadline } from "./opportunity-deadline.types"
import type { PlanningOpportunityItem } from "./opportunities-planning.types"

export interface BuildPlanningChapterInput {
  rows: MissionsListRow[]
  deadlines: OpportunityDeadline[]
  requestedOpportunityId: string | null
}

export interface PlanningChapterProjection {
  items: PlanningOpportunityItem[]
  selectedOpportunityId: string | null
  dataNotes: string[]
}

function deadlineMs(item: PlanningOpportunityItem): number {
  if (!item.deadline) return Number.POSITIVE_INFINITY
  const parsed = Date.parse(item.deadline.dueAt)
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

export function buildPlanningChapter(
  input: BuildPlanningChapterInput,
): PlanningChapterProjection {
  const deadlineByOpportunityId = new Map(
    input.deadlines.map((deadline) => [deadline.opportunityId, deadline]),
  )

  const items: PlanningOpportunityItem[] = input.rows
    .filter((row) => isOpenOpportunityStage(row.stage))
    .map((row) => ({
      id: row.entityId,
      title: row.title,
      clientName: row.client?.trim() || "Client non renseigné",
      clientLogoPath: row.clientLogoPath ?? null,
      clientWebsite: row.clientWebsite ?? null,
      stage: row.stage ?? "",
      priority: row.priority ?? "normale",
      deadline: deadlineByOpportunityId.get(row.entityId) ?? null,
    }))
    .sort(
      (a, b) =>
        deadlineMs(a) - deadlineMs(b) ||
        a.clientName.localeCompare(b.clientName, "fr") ||
        a.title.localeCompare(b.title, "fr"),
    )

  const requestedExists = items.some((item) => item.id === input.requestedOpportunityId)
  const selectedOpportunityId = requestedExists
    ? input.requestedOpportunityId
    : items[0]?.id ?? null

  const dataNotes: string[] = []
  if (input.requestedOpportunityId && !requestedExists) {
    dataNotes.push(
      "L’opportunité ciblée par l’URL n’existe plus ou n’est plus ouverte : sélection repliée sur la première échéance.",
    )
  }
  const withoutDeadlineCount = items.filter((item) => item.deadline === null).length
  if (withoutDeadlineCount > 0) {
    dataNotes.push(
      `${withoutDeadlineCount} opportunité${withoutDeadlineCount > 1 ? "s" : ""} ouverte${withoutDeadlineCount > 1 ? "s" : ""} sans échéance canonique.`,
    )
  }

  return { items, selectedOpportunityId, dataNotes }
}

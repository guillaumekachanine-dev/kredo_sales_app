import { OPPORTUNITIES_CANONICAL_PATH } from "@/features/opportunities/navigation/opportunities-sections"

const SIBLING_CHAPTER_KEYS = [
  "scope",
  "view",
  "stage",
  "priority",
  "practice",
  "sort",
  "direction",
] as const

export function buildPlanningHref(
  searchParamsString: string,
  opportunityId: string | null,
): string {
  const params = new URLSearchParams(searchParamsString)
  params.set("section", "planning")
  for (const key of SIBLING_CHAPTER_KEYS) params.delete(key)

  if (opportunityId) params.set("opp", opportunityId)
  else params.delete("opp")

  return `${OPPORTUNITIES_CANONICAL_PATH}?${params.toString()}`
}

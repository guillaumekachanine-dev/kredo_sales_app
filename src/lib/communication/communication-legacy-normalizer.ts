import type {
  CanonicalCommunicationActivityCategory,
  CommunicationScenario,
} from "@/lib/n8n/types"

export const CANONICAL_COMMUNICATION_ACTIVITY_CATEGORIES = [
  "commerce_prospection",
  "commerce_actif",
  "delivery",
  "recrutement",
  "management_consultants",
  "internal_staff",
] as const satisfies readonly CanonicalCommunicationActivityCategory[]

const CANONICAL_ACTIVITY_CATEGORY_SET = new Set<string>(
  CANONICAL_COMMUNICATION_ACTIVITY_CATEGORIES,
)

export function normalizeCommunicationActivityCategory(
  value: string,
  scope?: string,
): CanonicalCommunicationActivityCategory | undefined {
  if (CANONICAL_ACTIVITY_CATEGORY_SET.has(value)) {
    return value as CanonicalCommunicationActivityCategory
  }

  if (value !== "interne_management") return undefined
  if (scope === "collaborator") return "management_consultants"
  if (scope === "internal") return "internal_staff"

  return undefined
}

export function normalizeCommunicationScenario(
  value: string,
): CommunicationScenario | undefined {
  if (value === "profile_submission") return "profile_submission_to_client"
  if (value === "profile_submission_to_client") return value

  return undefined
}

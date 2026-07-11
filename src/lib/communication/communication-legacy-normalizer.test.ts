import { describe, expect, expectTypeOf, it } from "vitest"
import type { CommunicationComposerPreset } from "./communication-composer"
import {
  CANONICAL_COMMUNICATION_ACTIVITY_CATEGORIES,
  normalizeCommunicationActivityCategory,
  normalizeCommunicationScenario,
} from "./communication-legacy-normalizer"
import type {
  CanonicalCommunicationActivityCategory,
  CommunicationBrief,
  CommunicationScenario,
} from "@/lib/n8n/types"

const NEW_SCENARIOS = [
  "performance_feedback_follow_up",
  "intercontract_action_plan_message",
  "annual_review_follow_up",
  "consultant_retention_follow_up",
  "performance_feedback_talk_track",
  "retention_conversation_talk_track",
  "career_opportunity_talk_track",
  "career_development_briefing",
  "retention_conversation_briefing",
  "manager_status_update",
  "cross_functional_coordination_request",
  "internal_decision_summary",
  "internal_alert_escalation",
  "practice_support_pitch",
  "presales_support_pitch",
  "staffing_priority_pitch",
  "cross_functional_alignment_briefing",
  "staffing_review_briefing",
  "presales_kickoff_briefing",
] as const satisfies readonly CommunicationScenario[]

type CanonicalCategoryValue =
  (typeof CANONICAL_COMMUNICATION_ACTIVITY_CATEGORIES)[number]

describe("canonical communication contracts", () => {
  it("exposes the six canonical activity categories", () => {
    expect(CANONICAL_COMMUNICATION_ACTIVITY_CATEGORIES).toEqual([
      "commerce_prospection",
      "commerce_actif",
      "delivery",
      "recrutement",
      "management_consultants",
      "internal_staff",
    ])
    expectTypeOf<CanonicalCategoryValue>()
      .toEqualTypeOf<CanonicalCommunicationActivityCategory>()
  })

  it("types all 19 new scenarios without registering them", () => {
    expect(NEW_SCENARIOS).toHaveLength(19)
  })

  it("transports the new composer preset fields", () => {
    const preset = {
      outputKind: "structured_briefing",
      activityCategory: "internal_staff",
      recipientType: "internal",
      collaboratorId: "collaborator-1",
      internalRole: "presales",
      internalRelationship: "cross_functional",
      internalDomain: "presales",
    } satisfies CommunicationComposerPreset

    expect(preset).toMatchObject({
      outputKind: "structured_briefing",
      activityCategory: "internal_staff",
      recipientType: "internal",
      collaboratorId: "collaborator-1",
      internalRole: "presales",
      internalRelationship: "cross_functional",
      internalDomain: "presales",
    })

    const collaboratorRecipient = {
      type: "collaborator",
      persona: "other",
      relation: "unknown",
      collaboratorId: "collaborator-1",
      internalRole: "manager_n1",
      internalRelationship: "hierarchical_up",
      internalDomain: "staffing",
    } satisfies CommunicationBrief["who"]["recipient"]

    expect(collaboratorRecipient.type).toBe("collaborator")
  })
})

describe("legacy communication normalization", () => {
  it("splits interne_management using an explicit scope", () => {
    expect(normalizeCommunicationActivityCategory("interne_management", "collaborator"))
      .toBe("management_consultants")
    expect(normalizeCommunicationActivityCategory("interne_management", "internal"))
      .toBe("internal_staff")
  })

  it("does not infer a category when the legacy scope is absent or unknown", () => {
    expect(normalizeCommunicationActivityCategory("interne_management")).toBeUndefined()
    expect(normalizeCommunicationActivityCategory("interne_management", "account"))
      .toBeUndefined()
    expect(normalizeCommunicationActivityCategory("unknown", "internal")).toBeUndefined()
  })

  it("normalizes profile_submission", () => {
    expect(normalizeCommunicationScenario("profile_submission"))
      .toBe("profile_submission_to_client")
  })

  it("preserves values that are already canonical", () => {
    for (const category of CANONICAL_COMMUNICATION_ACTIVITY_CATEGORIES) {
      expect(normalizeCommunicationActivityCategory(category)).toBe(category)
    }
    expect(normalizeCommunicationScenario("profile_submission_to_client"))
      .toBe("profile_submission_to_client")
  })
})

import { describe, expect, it } from "vitest"
import {
  ACTIVITY_CATEGORY_OPTIONS,
  getScenarioDefinition,
  getScenariosByActivityCategory,
  getScenariosByOutputKind,
  getScenariosByScope,
  isScenarioCompatibleWithOutputKind,
  isScenarioCompatibleWithScope,
  SCENARIO_REGISTRY,
  scenarioRequiresOffer,
} from "./communication-scenario-registry"

const TARGET_SCENARIO_IDS = [
  "signal_outreach", "follow_up_no_reply", "offer_introduction", "appointment_confirmation", "first_contact_after_nomination", "linkedin_to_email_bridge", "event_invitation", "sector_rebound", "discovery_meeting_request", "cold_call_pitch", "signal_based_pitch", "why_us_now_pitch", "first_objection_bad_timing", "meeting_prep_discovery", "sector_persona_pitch",
  "post_meeting", "profile_submission_to_client", "cross_sell", "reactivation", "proposal_follow_up", "invoice_follow_up", "mission_renewal", "consultant_replacement_notice", "client_tension_apology", "delivery_delay_notice", "price_objection_pitch", "meeting_prep_cross_sell", "proposal_defense_pitch", "renewal_pitch", "client_crisis_talk_track", "delay_talk_track", "tense_copil_briefing",
  "project_alert_escalation", "steering_committee_minutes", "risk_communication", "milestone_validation_request", "escalation_briefing", "risk_meeting_briefing",
  "candidate_interview_invitation", "candidate_follow_up", "candidate_offer", "candidate_rejection", "candidate_availability_check", "candidate_post_interview_feedback", "candidate_cv_completion_request", "dormant_talent_pool_reactivation", "candidate_closing_pitch", "mobility_salary_pitch", "candidate_to_client_pitch", "opportunity_to_candidate_pitch", "atypical_candidate_defense", "recruiter_briefing_pre_interview",
  "manager_collaborator_internal", "cra_absence_reminder", "collaborator_recognition", "assignment_change_notice", "performance_feedback_follow_up", "intercontract_action_plan_message", "annual_review_follow_up", "consultant_retention_follow_up", "performance_feedback_talk_track", "retention_conversation_talk_track", "career_opportunity_talk_track", "one_on_one_alignment", "performance_review_prep", "disciplinary_meeting_posture", "sensitive_meeting_briefing", "difficult_announcement_talk_track", "intercontract_exit_pitch", "career_development_briefing", "retention_conversation_briefing",
  "internal_arbitrage_request", "staffing_help_request", "handover_note", "internal_validation_before_send", "manager_status_update", "cross_functional_coordination_request", "internal_decision_summary", "internal_alert_escalation", "quarterly_business_review", "resource_arbitrage_pitch", "internal_committee_pitch", "investment_arbitrage_argument", "project_status_pitch", "direction_summary_pitch", "practice_support_pitch", "presales_support_pitch", "staffing_priority_pitch", "weekly_briefing_prep", "cross_functional_alignment_briefing", "staffing_review_briefing", "presales_kickoff_briefing",
] as const

describe("communication scenario registry", () => {
  it("matches the complete documented catalogue exactly once", () => {
    const ids = SCENARIO_REGISTRY.map((scenario) => scenario.id)
    expect(ids).toHaveLength(92)
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual([...TARGET_SCENARIO_IDS].sort())
  })

  it("enforces every structural default and canonical category", () => {
    const categories = new Set(ACTIVITY_CATEGORY_OPTIONS.map((category) => category.value))
    expect(categories).toEqual(new Set([
      "commerce_prospection", "commerce_actif", "delivery", "recrutement", "management_consultants", "internal_staff",
    ]))
    expect(new Set(SCENARIO_REGISTRY.flatMap((scenario) => scenario.allowedOutputKinds)))
      .toEqual(new Set(["written_message", "spoken_pitch", "structured_briefing"]))

    const channels = new Set(["email", "linkedin_invitation", "linkedin_message", "internal_note", "spoken_pitch_30s", "meeting_briefing"])
    const lengths = new Set(["ultra_short", "concise", "standard", "detailed"])
    const tones = new Set(["direct", "formal", "warm", "assertive", "pedagogical", "diplomatic", "technical_expertise", "business_roi", "enthusiastic_confident", "disappointed_confused", "prudent"])

    for (const scenario of SCENARIO_REGISTRY) {
      expect(categories.has(scenario.activityCategory)).toBe(true)
      expect(scenario.activityCategory).not.toBe("interne_management")
      expect(scenario.allowedOutputKinds).toContain(scenario.defaultOutputKind)
      expect(scenario.allowedChannels).toContain(scenario.defaultChannel)
      expect(scenario.allowedObjectives).toContain(scenario.defaultObjective)
      expect(scenario.allowedLengths.length).toBeGreaterThan(0)
      expect(scenario.suggestedTones.length).toBeGreaterThan(0)
      expect(scenario.requiredScopes.length).toBeGreaterThan(0)
      expect(scenario.allowedChannels.every((channel) => channels.has(channel))).toBe(true)
      expect(scenario.allowedLengths.every((length) => lengths.has(length))).toBe(true)
      expect([...scenario.suggestedTones, ...scenario.excludedTones].every((tone) => tones.has(tone))).toBe(true)
    }
  })

  it("keeps management and Staff scopes strictly separated", () => {
    for (const scenario of getScenariosByActivityCategory("management_consultants")) {
      expect(scenario.requiredScopes).toEqual(["collaborator"])
      expect(scenario.eligibleRecipientTypes).toEqual(["collaborator"])
    }
    for (const scenario of getScenariosByActivityCategory("internal_staff")) {
      expect(scenario.requiredScopes).toEqual(["internal"])
      expect(scenario.eligibleRecipientTypes).toEqual(["internal"])
    }
  })

  it("narrows recrutement scenarios to their real recipient — candidate vs client (Lot 7)", () => {
    const candidateDirected = [
      "candidate_interview_invitation", "candidate_follow_up", "candidate_offer", "candidate_rejection",
      "candidate_availability_check", "candidate_post_interview_feedback", "candidate_cv_completion_request",
      "dormant_talent_pool_reactivation", "opportunity_to_candidate_pitch", "candidate_closing_pitch",
      "recruiter_briefing_pre_interview", "mobility_salary_pitch",
    ] as const
    for (const id of candidateDirected) {
      expect(getScenarioDefinition(id)?.eligibleRecipientTypes).toEqual(["candidate"])
    }

    const clientDirected = ["candidate_to_client_pitch", "atypical_candidate_defense"] as const
    for (const id of clientDirected) {
      expect(getScenarioDefinition(id)?.eligibleRecipientTypes).toEqual(["active_client", "prospect"])
    }
  })

  it("supports multi-finality scenarios without duplicate entries", () => {
    expect(getScenarioDefinition("collaborator_recognition")?.allowedOutputKinds)
      .toEqual(["written_message", "spoken_pitch"])
    expect(getScenarioDefinition("quarterly_business_review")?.allowedOutputKinds)
      .toEqual(["spoken_pitch", "structured_briefing"])
  })

  it("makes offer requirements scenario-driven", () => {
    expect(scenarioRequiresOffer("offer_introduction")).toBe(true)
    expect(scenarioRequiresOffer("cross_sell")).toBe(true)
    expect(scenarioRequiresOffer("proposal_defense_pitch")).toBe(true)
    expect(scenarioRequiresOffer("client_crisis_talk_track")).toBe(false)
    expect(scenarioRequiresOffer("performance_feedback_talk_track")).toBe(false)
  })

  it("exposes deterministic compatibility helpers", () => {
    expect(getScenariosByOutputKind("spoken_pitch").map((scenario) => scenario.id))
      .toContain("performance_feedback_talk_track")
    expect(getScenariosByScope("collaborator").map((scenario) => scenario.id))
      .toContain("career_development_briefing")
    expect(isScenarioCompatibleWithOutputKind("difficult_announcement_talk_track", "spoken_pitch"))
      .toBe(true)
    expect(isScenarioCompatibleWithScope("internal_alert_escalation", "internal")).toBe(true)
    expect(isScenarioCompatibleWithScope("internal_alert_escalation", "collaborator")).toBe(false)
  })
})

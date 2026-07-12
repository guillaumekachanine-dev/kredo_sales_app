import { describe, expect, it } from "vitest"
import {
  assertCommunicationEntryRegistryIntegrity,
  buildCommunicationEntryPreset,
  COMMUNICATION_ENTRY_INTENTS,
  type CommunicationEntryIntent,
} from "./communication-entry-intents"

const uuid = {
  company: "11111111-1111-4111-8111-111111111111",
  contact: "22222222-2222-4222-8222-222222222222",
  opportunity: "33333333-3333-4333-8333-333333333333",
  mission: "44444444-4444-4444-8444-444444444444",
  candidate: "55555555-5555-4555-8555-555555555555",
  signal: "66666666-6666-4666-8666-666666666666",
}

describe("communication entry intent registry", () => {
  it("keeps every intent aligned with an existing registry scenario", () => {
    expect(() => assertCommunicationEntryRegistryIntegrity()).not.toThrow()
    expect(Object.keys(COMMUNICATION_ENTRY_INTENTS)).toHaveLength(23)
  })

  it("returns explicit errors when required entities are absent", () => {
    const result = buildCommunicationEntryPreset("proposal_follow_up", { companyId: uuid.company })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missingEntityKinds).toEqual(["opportunity"])
      expect(result.error).toContain("opportunité requis")
    }
  })
})

describe("communication entry preset builder", () => {
  it.each([
    ["signal_outreach", "signal_outreach", "commerce_prospection", "written_message"],
    ["prospection_follow_up", "follow_up_no_reply", "commerce_prospection", "written_message"],
    ["discovery_preparation", "meeting_prep_discovery", "commerce_prospection", "structured_briefing"],
    ["proposal_follow_up", "proposal_follow_up", "commerce_actif", "written_message"],
    ["proposal_defense", "proposal_defense_pitch", "commerce_actif", "structured_briefing"],
    ["price_objection", "price_objection_pitch", "commerce_actif", "spoken_pitch"],
    ["mission_renewal", "mission_renewal", "commerce_actif", "written_message"],
    ["sector_rebound", "sector_rebound", "commerce_prospection", "written_message"],
    ["sector_persona_preparation", "sector_persona_pitch", "commerce_prospection", "structured_briefing"],
  ] satisfies Array<[CommunicationEntryIntent, string, string, string]>)(
    "builds a commercial preset for %s",
    (intent, scenario, activityCategory, outputKind) => {
      const result = buildCommunicationEntryPreset(intent, {
        companyId: uuid.company,
        companyName: "Acme",
        contactId: uuid.contact,
        opportunityId: uuid.opportunity,
        missionId: uuid.mission,
        signalId: uuid.signal,
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.brief.what.scenario).toBe(scenario)
      expect(result.brief.what.activityCategory).toBe(activityCategory)
      expect(result.brief.what.outputKind).toBe(outputKind)
      expect(result.request.initialBrief).toEqual(result.brief)
      expect(result.request.selectedOutputKind).toBe(outputKind)
    },
  )

  it.each([
    ["delivery_risk_message", "risk_communication", "written_message"],
    ["delivery_risk_briefing", "escalation_briefing", "structured_briefing"],
    ["milestone_validation", "milestone_validation_request", "written_message"],
  ] satisfies Array<[CommunicationEntryIntent, string, string]>)(
    "builds a delivery preset for %s without offer refs",
    (intent, scenario, outputKind) => {
      const result = buildCommunicationEntryPreset(intent, {
        companyId: uuid.company,
        missionId: uuid.mission,
        opportunityId: uuid.opportunity,
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.brief.what.scenario).toBe(scenario)
      expect(result.brief.what.activityCategory).toBe("delivery")
      expect(result.brief.what.outputKind).toBe(outputKind)
      expect(result.brief.context.offerRef).toBeUndefined()
    },
  )

  it("keeps COPIL category from the registry", () => {
    const result = buildCommunicationEntryPreset("steering_committee", {
      companyId: uuid.company,
      missionId: uuid.mission,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.brief.what.scenario).toBe("tense_copil_briefing")
    expect(result.brief.what.activityCategory).toBe("commerce_actif")
  })

  it.each([
    ["candidate_interview", "candidate_interview_invitation"],
    ["candidate_availability", "candidate_availability_check"],
    ["candidate_feedback", "candidate_post_interview_feedback"],
    ["candidate_closing", "candidate_closing_pitch"],
    ["candidate_mobility_salary", "mobility_salary_pitch"],
    ["opportunity_to_candidate", "opportunity_to_candidate_pitch"],
    ["recruiter_preparation", "recruiter_briefing_pre_interview"],
  ] satisfies Array<[CommunicationEntryIntent, string]>)(
    "builds candidate-recipient recruitment preset for %s",
    (intent, scenario) => {
      const result = buildCommunicationEntryPreset(intent, {
        candidateId: uuid.candidate,
        candidateName: "Jane Candidate",
        opportunityId: uuid.opportunity,
        companyId: uuid.company,
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.brief.what.scenario).toBe(scenario)
      expect(result.brief.what.activityCategory).toBe("recrutement")
      expect(result.brief.who.recipient.type).toBe("candidate")
      expect(result.brief.context.profileRef).toBe(uuid.candidate)
    },
  )

  it("keeps candidate-to-client addressed to the client", () => {
    const result = buildCommunicationEntryPreset("candidate_to_client", {
      candidateId: uuid.candidate,
      candidateName: "Jane Candidate",
      companyId: uuid.company,
      companyName: "Acme",
      opportunityId: uuid.opportunity,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.brief.what.scenario).toBe("candidate_to_client_pitch")
    expect(result.brief.who.recipient.type).toBe("active_client")
    expect(result.brief.context.profileRef).toBe(uuid.candidate)
    expect(result.brief.context.opportunityRef).toBe(uuid.opportunity)
  })

  it("keeps atypical candidate defense addressed to the client", () => {
    const result = buildCommunicationEntryPreset("atypical_candidate_defense", {
      candidateId: uuid.candidate,
      candidateName: "Jane Candidate",
      companyId: uuid.company,
      companyName: "Acme",
      opportunityId: uuid.opportunity,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.brief.what.scenario).toBe("atypical_candidate_defense")
    expect(result.brief.who.recipient.type).toBe("active_client")
  })
})

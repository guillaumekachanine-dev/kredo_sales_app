import { describe, expect, it } from "vitest"
import {
  assertCommunicationEntryRegistryIntegrity,
  buildCommunicationEntryPreset,
  COMMUNICATION_ENTRY_INTENTS,
  type CommunicationEntryIntent,
} from "./communication-entry-intents"
import type { CommunicationInternalDomain, CommunicationOutputKind } from "@/lib/n8n/types"

const uuid = {
  company: "11111111-1111-4111-8111-111111111111",
  contact: "22222222-2222-4222-8222-222222222222",
  opportunity: "33333333-3333-4333-8333-333333333333",
  mission: "44444444-4444-4444-8444-444444444444",
  candidate: "55555555-5555-4555-8555-555555555555",
  signal: "66666666-6666-4666-8666-666666666666",
  collaborator: "77777777-7777-4777-8777-777777777777",
  event: "88888888-8888-4888-8888-888888888888",
  invoice: "99999999-9999-4999-8999-999999999999",
}

describe("communication entry intent registry", () => {
  it("keeps every intent aligned with an existing registry scenario", () => {
    expect(() => assertCommunicationEntryRegistryIntegrity()).not.toThrow()
    expect(Object.keys(COMMUNICATION_ENTRY_INTENTS)).toHaveLength(54)
  })

  it("returns explicit errors when required entities are absent", () => {
    const result = buildCommunicationEntryPreset("proposal_follow_up", { companyId: uuid.company })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missingEntityKinds).toEqual(["opportunity"])
      expect(result.error).toContain("opportunité requis")
    }
  })

  it("returns explicit errors when a reliable invoice is missing", () => {
    const result = buildCommunicationEntryPreset("finance_invoice_follow_up", {
      companyId: uuid.company,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missingEntityKinds).toEqual(["invoice"])
      expect(result.error).toContain("facture requis")
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
  ] satisfies Array<[CommunicationEntryIntent, string, string, CommunicationOutputKind]>)(
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

  it.each([
    ["consultant_message", "manager_collaborator_internal", "written_message"],
    ["consultant_recognition", "collaborator_recognition", "written_message"],
    ["consultant_one_to_one", "one_on_one_alignment", "structured_briefing"],
    ["consultant_assignment_change", "assignment_change_notice", "written_message"],
    ["consultant_intercontract_message", "intercontract_action_plan_message", "written_message"],
    ["consultant_feedback_follow_up", "performance_feedback_follow_up", "written_message"],
    ["consultant_feedback_talk_track", "performance_feedback_talk_track", "spoken_pitch"],
    ["consultant_retention_briefing", "retention_conversation_briefing", "structured_briefing"],
    ["consultant_annual_review", "performance_review_prep", "structured_briefing"],
    ["consultant_sensitive_meeting", "sensitive_meeting_briefing", "structured_briefing"],
  ] satisfies Array<[CommunicationEntryIntent, string, string]>)(
    "builds management consultant preset for %s without CRM recipient data",
    (intent, scenario, outputKind) => {
      const result = buildCommunicationEntryPreset(intent, {
        collaboratorId: uuid.collaborator,
        collaboratorName: "Jean Consultant",
        missionId: uuid.mission,
        missionTitle: "Mission Alpha",
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.brief.what.scenario).toBe(scenario)
      expect(result.brief.what.scope).toBe("collaborator")
      expect(result.brief.what.activityCategory).toBe("management_consultants")
      expect(result.brief.what.outputKind).toBe(outputKind)
      expect(result.brief.who.recipient.type).toBe("collaborator")
      expect(result.brief.who.recipient.collaboratorId).toBe(uuid.collaborator)
      expect(result.brief.who.recipient.contactId).toBeUndefined()
      expect(result.brief.who.recipient.companyName).toBeUndefined()
      expect(result.brief.context.collaboratorRef).toBe(uuid.collaborator)
    },
  )

  it.each([
    ["staffing_help", "staffing_help_request", "written_message", "staffing"],
    ["staffing_priority", "staffing_priority_pitch", "spoken_pitch", "staffing"],
    ["staffing_review", "staffing_review_briefing", "structured_briefing", "staffing"],
    ["manager_status_update", "manager_status_update", "written_message", "commercial"],
    ["manager_arbitrage", "internal_arbitrage_request", "written_message", "operations"],
    ["manager_business_review", "quarterly_business_review", "structured_briefing", "commercial"],
    ["internal_committee", "internal_committee_pitch", "structured_briefing", "operations"],
    ["internal_decision_summary", "internal_decision_summary", "written_message", "operations"],
    ["practice_support", "practice_support_pitch", "spoken_pitch", "practice"],
    ["presales_support", "presales_support_pitch", "spoken_pitch", "presales"],
    ["presales_kickoff", "presales_kickoff_briefing", "structured_briefing", "presales"],
    ["direction_summary", "direction_summary_pitch", "structured_briefing", "strategy"],
  ] satisfies Array<[CommunicationEntryIntent, string, CommunicationOutputKind, CommunicationInternalDomain]>)(
    "builds internal staff preset for %s",
    (intent, scenario, outputKind, domain) => {
      const result = buildCommunicationEntryPreset(intent, {
        companyId: uuid.company,
        companyName: "Acme",
        opportunityId: uuid.opportunity,
        opportunityTitle: "Besoin Data",
        internalRole: intent === "direction_summary" ? "executive_management" : "manager_n1",
        internalRelationship: intent === "direction_summary" ? "executive_committee" : "hierarchical_up",
        internalDomain: domain,
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.brief.what.scenario).toBe(scenario)
      expect(result.brief.what.scope).toBe("internal")
      expect(result.brief.what.activityCategory).toBe("internal_staff")
      expect(result.brief.what.outputKind).toBe(outputKind)
      expect(result.brief.who.recipient.type).toBe("internal")
      expect(result.brief.context.companyRef).toBe(uuid.company)
      expect(result.brief.context.opportunityRef).toBe(uuid.opportunity)
    },
  )

  it("keeps staffing need scope internal even when account and opportunity are present", () => {
    const result = buildCommunicationEntryPreset("staffing_help", {
      companyId: uuid.company,
      companyName: "Acme",
      opportunityId: uuid.opportunity,
      opportunityTitle: "Besoin Data",
      candidateId: uuid.candidate,
      candidateName: "Jane Candidate",
      internalDomain: "staffing",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.brief.what.scope).toBe("internal")
    expect(result.request.companyId).toBe(uuid.company)
    expect(result.brief.context.companyRef).toBe(uuid.company)
    expect(result.brief.context.opportunityRef).toBe(uuid.opportunity)
  })

  it("builds finance invoice follow-up only with structured invoice facts", () => {
    const result = buildCommunicationEntryPreset("finance_invoice_follow_up", {
      companyId: uuid.company,
      companyName: "Acme",
      invoiceId: uuid.invoice,
      invoiceReference: "FAC-2026-0042",
      invoiceAmount: "12 500 EUR",
      invoiceDueDate: "2026-07-31",
      invoiceStatus: "échue",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.brief.what.scenario).toBe("invoice_follow_up")
    expect(result.brief.what.scope).toBe("account")
    expect(result.brief.what.activityCategory).toBe("commerce_actif")
    expect(result.brief.who.objective).toBe("secure_payment")
    expect(result.brief.context.mustInclude).toContain("FAC-2026-0042")
  })

  it("does not infer agenda management context from an ambiguous event title", () => {
    const result = buildCommunicationEntryPreset("agenda_event_preparation", {
      eventId: uuid.event,
      eventTitle: "Entretien annuel Jean",
      eventType: "meeting",
      eventStartsAt: "2026-08-01T09:00:00.000Z",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.brief.what.scenario).toBe("weekly_briefing_prep")
    expect(result.brief.what.scope).toBe("internal")
    expect(result.brief.context.collaboratorRef).toBeUndefined()
    expect(result.brief.context.profileRef).toBeUndefined()
  })
})

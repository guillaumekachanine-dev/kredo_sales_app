import { describe, expect, it } from "vitest"
import {
  buildCommunicationEntryPreset,
  type CommunicationEntryContext,
  type CommunicationEntryIntent,
} from "./communication-entry-intents"
import { resolveCommunicationOptions, type CommunicationContextFacts } from "./communication-options-resolver"
import { getScenarioDefinition } from "./communication-scenario-registry"
import {
  buildDocumentEntities,
  buildDocumentScopeJson,
  isEligibleDocumentResultType,
  mapResultTypeToDocumentType,
} from "./communication-result-documents"
import type {
  CommunicationActivityCategory,
  CommunicationOutputKind,
  CommunicationRecipientType,
  CommunicationScope,
} from "@/lib/n8n/types"

const ids = {
  workspace: "00000000-0000-4000-8000-000000000000",
  company: "11111111-1111-4111-8111-111111111111",
  contact: "22222222-2222-4222-8222-222222222222",
  opportunity: "33333333-3333-4333-8333-333333333333",
  mission: "44444444-4444-4444-8444-444444444444",
  candidate: "55555555-5555-4555-8555-555555555555",
  signal: "66666666-6666-4666-8666-666666666666",
  collaborator: "77777777-7777-4777-8777-777777777777",
  offer: "88888888-8888-4888-8888-888888888888",
}

type MatrixFixture = {
  label: string
  intent: CommunicationEntryIntent
  context: CommunicationEntryContext
  scenario: string
  outputKind: CommunicationOutputKind
  activityCategory: CommunicationActivityCategory
  scope: CommunicationScope
  recipientType: CommunicationRecipientType
}

const accountContext: CommunicationEntryContext = {
  companyId: ids.company,
  companyName: "Acme",
  contactId: ids.contact,
  contactName: "Alice Contact",
  opportunityId: ids.opportunity,
  opportunityTitle: "Programme data",
  missionId: ids.mission,
  missionTitle: "Mission Alpha",
  candidateId: ids.candidate,
  candidateName: "Jane Candidate",
  signalId: ids.signal,
  offerId: ids.offer,
}

const collaboratorContext: CommunicationEntryContext = {
  collaboratorId: ids.collaborator,
  collaboratorName: "Jean Consultant",
  missionId: ids.mission,
  missionTitle: "Mission Alpha",
}

function internalContext(overrides: Partial<CommunicationEntryContext> = {}): CommunicationEntryContext {
  return {
    companyId: ids.company,
    companyName: "Acme",
    opportunityId: ids.opportunity,
    opportunityTitle: "Programme data",
    candidateId: ids.candidate,
    candidateName: "Jane Candidate",
    internalRole: "manager_n1",
    internalRelationship: "hierarchical_up",
    internalDomain: "operations",
    ...overrides,
  }
}

const MATRIX: MatrixFixture[] = [
  { label: "Mail basé sur un signal", intent: "signal_outreach", context: accountContext, scenario: "signal_outreach", outputKind: "written_message", activityCategory: "commerce_prospection", scope: "account", recipientType: "prospect" },
  { label: "Cold call prospect", intent: "signal_outreach", context: accountContext, scenario: "cold_call_pitch", outputKind: "spoken_pitch", activityCategory: "commerce_prospection", scope: "account", recipientType: "prospect" },
  { label: "Brief de découverte", intent: "discovery_preparation", context: accountContext, scenario: "meeting_prep_discovery", outputKind: "structured_briefing", activityCategory: "commerce_prospection", scope: "account", recipientType: "prospect" },
  { label: "Mail de renouvellement", intent: "mission_renewal", context: accountContext, scenario: "mission_renewal", outputKind: "written_message", activityCategory: "commerce_actif", scope: "account", recipientType: "active_client" },
  { label: "Pitch objection prix", intent: "price_objection", context: accountContext, scenario: "price_objection_pitch", outputKind: "spoken_pitch", activityCategory: "commerce_actif", scope: "account", recipientType: "active_client" },
  { label: "Brief de soutenance", intent: "proposal_defense", context: accountContext, scenario: "proposal_defense_pitch", outputKind: "structured_briefing", activityCategory: "commerce_actif", scope: "account", recipientType: "active_client" },
  { label: "Communication de risque", intent: "delivery_risk_message", context: accountContext, scenario: "risk_communication", outputKind: "written_message", activityCategory: "delivery", scope: "account", recipientType: "active_client" },
  { label: "Brief d’escalade", intent: "delivery_risk_briefing", context: accountContext, scenario: "escalation_briefing", outputKind: "structured_briefing", activityCategory: "delivery", scope: "account", recipientType: "active_client" },
  { label: "Invitation candidat", intent: "candidate_interview", context: accountContext, scenario: "candidate_interview_invitation", outputKind: "written_message", activityCategory: "recrutement", scope: "account", recipientType: "candidate" },
  { label: "Présentation d’opportunité au candidat", intent: "opportunity_to_candidate", context: accountContext, scenario: "opportunity_to_candidate_pitch", outputKind: "structured_briefing", activityCategory: "recrutement", scope: "account", recipientType: "candidate" },
  { label: "Brief recruteur avant entretien", intent: "recruiter_preparation", context: accountContext, scenario: "recruiter_briefing_pre_interview", outputKind: "structured_briefing", activityCategory: "recrutement", scope: "account", recipientType: "candidate" },
  { label: "Message de reconnaissance", intent: "consultant_recognition", context: collaboratorContext, scenario: "collaborator_recognition", outputKind: "written_message", activityCategory: "management_consultants", scope: "collaborator", recipientType: "collaborator" },
  { label: "Talk track changement de mission", intent: "consultant_assignment_change", context: collaboratorContext, scenario: "assignment_change_notice", outputKind: "spoken_pitch", activityCategory: "management_consultants", scope: "collaborator", recipientType: "collaborator" },
  { label: "Brief de recadrage", intent: "consultant_disciplinary_meeting", context: collaboratorContext, scenario: "disciplinary_meeting_posture", outputKind: "structured_briefing", activityCategory: "management_consultants", scope: "collaborator", recipientType: "collaborator" },
  { label: "Brief 1:1", intent: "consultant_one_to_one", context: collaboratorContext, scenario: "one_on_one_alignment", outputKind: "structured_briefing", activityCategory: "management_consultants", scope: "collaborator", recipientType: "collaborator" },
  { label: "Brief intercontrat", intent: "consultant_intercontract_talk_track", context: collaboratorContext, scenario: "intercontract_exit_pitch", outputKind: "structured_briefing", activityCategory: "management_consultants", scope: "collaborator", recipientType: "collaborator" },
  { label: "Demande d’aide staffing", intent: "staffing_help", context: internalContext({ internalRole: "recruitment", internalRelationship: "cross_functional", internalDomain: "staffing" }), scenario: "staffing_help_request", outputKind: "written_message", activityCategory: "internal_staff", scope: "internal", recipientType: "internal" },
  { label: "Pitch d’arbitrage N+1", intent: "finance_resource_arbitrage", context: internalContext(), scenario: "resource_arbitrage_pitch", outputKind: "spoken_pitch", activityCategory: "internal_staff", scope: "internal", recipientType: "internal" },
  { label: "Brief de business review", intent: "manager_business_review", context: internalContext({ internalDomain: "commercial" }), scenario: "quarterly_business_review", outputKind: "structured_briefing", activityCategory: "internal_staff", scope: "internal", recipientType: "internal" },
  { label: "Appui avant-vente", intent: "presales_support", context: internalContext({ internalRole: "presales", internalRelationship: "cross_functional", internalDomain: "presales" }), scenario: "presales_support_pitch", outputKind: "spoken_pitch", activityCategory: "internal_staff", scope: "internal", recipientType: "internal" },
  { label: "Synthèse direction", intent: "direction_summary", context: internalContext({ internalRole: "executive_management", internalRelationship: "executive_committee", internalDomain: "strategy" }), scenario: "direction_summary_pitch", outputKind: "structured_briefing", activityCategory: "internal_staff", scope: "internal", recipientType: "internal" },
]

function factsFor(fixture: MatrixFixture, recipientType: CommunicationRecipientType): CommunicationContextFacts {
  return {
    scope: fixture.scope,
    recipientType,
    hasCompany: Boolean(fixture.context.companyId),
    hasContact: Boolean(fixture.context.contactId),
    hasOpportunity: Boolean(fixture.context.opportunityId),
    hasMission: Boolean(fixture.context.missionId),
    hasCandidate: Boolean(fixture.context.candidateId),
    hasCollaborator: Boolean(fixture.context.collaboratorId),
    hasOffer: Boolean(fixture.context.offerId),
    internalRole: fixture.context.internalRole,
    internalRelationship: fixture.context.internalRelationship,
    internalDomain: fixture.context.internalDomain,
  }
}

function expectedResultType(fixture: MatrixFixture) {
  if (fixture.outputKind === "written_message") return "communication"
  return fixture.activityCategory === "commerce_prospection" || fixture.activityCategory === "commerce_actif"
    ? "commercial_pitch"
    : "prise_de_parole"
}

describe("INTEL-020 deterministic communication E2E matrix", () => {
  it("covers the 21 agreed flows across all categories, output kinds, and scopes", () => {
    expect(MATRIX).toHaveLength(21)
    expect(new Set(MATRIX.map((fixture) => fixture.activityCategory))).toEqual(new Set([
      "commerce_prospection",
      "commerce_actif",
      "delivery",
      "recrutement",
      "management_consultants",
      "internal_staff",
    ]))
    expect(new Set(MATRIX.map((fixture) => fixture.outputKind))).toEqual(new Set([
      "written_message",
      "spoken_pitch",
      "structured_briefing",
    ]))
    expect(new Set(MATRIX.map((fixture) => fixture.scope))).toEqual(new Set(["account", "collaborator", "internal"]))
  })

  it.each(MATRIX)("$label", (fixture) => {
    const entry = buildCommunicationEntryPreset(fixture.intent, fixture.context)
    expect(entry.ok).toBe(true)
    if (!entry.ok) return

    const scenario = getScenarioDefinition(fixture.scenario as never)
    expect(scenario).toBeDefined()
    if (!scenario) return

    const requestedBrief = {
      ...entry.brief,
      what: {
        ...entry.brief.what,
        scenario: fixture.scenario as never,
        outputKind: fixture.outputKind,
        activityCategory: fixture.activityCategory,
        scope: fixture.scope,
        channel: scenario.defaultChannel,
      },
      who: {
        ...entry.brief.who,
        objective: scenario.defaultObjective,
      },
    }
    const resolution = resolveCommunicationOptions(
      factsFor(fixture, fixture.recipientType),
      requestedBrief,
    )
    const brief = resolution.normalizedBrief

    expect(brief.what).toMatchObject({
      scenario: fixture.scenario,
      outputKind: fixture.outputKind,
      activityCategory: fixture.activityCategory,
      scope: fixture.scope,
      channel: scenario.defaultChannel,
    })
    expect(brief.who.recipient.type).toBe(fixture.recipientType)

    if (fixture.scope !== "account") {
      expect(brief.who.recipient.contactId).toBeUndefined()
      expect(brief.who.recipient.companyName).toBeUndefined()
    }
    if (fixture.scope === "collaborator") {
      expect(brief.who.recipient.collaboratorId).toBe(ids.collaborator)
      expect(brief.context.companyRef).toBeUndefined()
    }

    const resultType = expectedResultType(fixture)
    expect(isEligibleDocumentResultType(resultType)).toBe(true)
    expect(mapResultTypeToDocumentType(resultType)).toBe(resultType)
    expect(buildDocumentScopeJson(brief)).toMatchObject({
      outputKind: fixture.outputKind,
      activityCategory: fixture.activityCategory,
      scope: fixture.scope,
      scenario: fixture.scenario,
    })

    const runPrimary = fixture.scope === "collaborator"
      ? { type: "collaborator", id: ids.collaborator }
      : fixture.scope === "account"
        ? { type: "company", id: ids.company }
        : { type: "workspace", id: ids.workspace }
    const entities = buildDocumentEntities({
      inputSnapshot: brief,
      companyId: fixture.scope === "account" ? ids.company : null,
      runPrimaryEntityType: runPrimary.type,
      runPrimaryEntityId: runPrimary.id,
    })

    if (fixture.scope === "internal") {
      expect(entities.primaryEntity).toBeNull()
      expect(entities.links.map((link) => `${link.entityType}:${link.entityId}`)).toContain(`company:${ids.company}`)
    } else {
      expect(entities.primaryEntity).toEqual({ entityType: runPrimary.type, entityId: runPrimary.id })
    }
  })
})

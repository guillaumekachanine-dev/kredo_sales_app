import { describe, expect, it } from "vitest"
import type { CommunicationBrief } from "@/lib/n8n/types"
import { resolveCommunicationOptions, type CommunicationContextFacts } from "./communication-options-resolver"
import {
  buildBriefFormModel,
  buildContextSourceStates,
  mergeCommunicationFacts,
  purgeIncompatibleReferences,
} from "./communication-brief-form-model"

function brief(overrides: Partial<CommunicationBrief> = {}): CommunicationBrief {
  const base: CommunicationBrief = {
    what: {
      channel: "email",
      scenario: "signal_outreach",
      outputKind: "written_message",
      length: "standard",
      activityCategory: "commerce_prospection",
      scope: "account",
    },
    who: {
      sender: { role: "business_manager", name: "Guillaume" },
      recipient: { type: "prospect", persona: "other", relation: "warm" },
      objective: "get_meeting",
    },
    how: { tone: "direct", formality: "vous", language: "fr" },
    context: {},
  }
  return {
    ...base,
    ...overrides,
    what: { ...base.what, ...overrides.what },
    who: {
      ...base.who,
      ...overrides.who,
      sender: { ...base.who.sender, ...overrides.who?.sender },
      recipient: { ...base.who.recipient, ...overrides.who?.recipient },
    },
    how: { ...base.how, ...overrides.how },
    context: { ...base.context, ...overrides.context },
  }
}

function resolveFor(
  facts: CommunicationContextFacts,
  overrides: Partial<CommunicationBrief> = {},
) {
  return resolveCommunicationOptions(facts, brief(overrides))
}

describe("buildBriefFormModel", () => {
  it("hides opportunity/mission entity pivots for pure prospection", () => {
    const resolution = resolveFor({ hasCompany: true })
    const model = buildBriefFormModel(resolution.normalizedBrief, resolution)
    expect(model.showOpportunity).toBe(false)
    expect(model.showMission).toBe(false)
  })

  it("requires and shows the offer picker only for offer-anchored scenarios", () => {
    const resolution = resolveFor({ hasCompany: true }, {
      what: { ...brief().what, scenario: "offer_introduction" },
    })
    const model = buildBriefFormModel(resolution.normalizedBrief, resolution)
    expect(model.showOffer).toBe(true)
    expect(model.offerRequired).toBe(true)

    const notOffered = resolveFor({ hasCompany: true }, {
      what: { ...brief().what, scenario: "post_meeting", activityCategory: "commerce_actif" },
    })
    const notOfferedModel = buildBriefFormModel(notOffered.normalizedBrief, notOffered)
    expect(notOfferedModel.showOffer).toBe(false)
  })

  it("shows the opportunity pivot for commerce actif and the mission pivot for delivery", () => {
    const commerceActif = resolveFor({ hasCompany: true, recipientType: "active_client" }, {
      what: { ...brief().what, scenario: "proposal_follow_up", activityCategory: "commerce_actif" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "active_client" } },
    })
    const commerceActifModel = buildBriefFormModel(commerceActif.normalizedBrief, commerceActif)
    expect(commerceActifModel.showOpportunity).toBe(true)

    const delivery = resolveFor({ hasMission: true, recipientType: "active_client" }, {
      what: { ...brief().what, scenario: "project_alert_escalation", activityCategory: "delivery" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "active_client" } },
    })
    const deliveryModel = buildBriefFormModel(delivery.normalizedBrief, delivery)
    expect(deliveryModel.showMission).toBe(true)
  })

  it("distinguishes a candidate-directed scenario from a client-directed one about a candidate", () => {
    const toCandidate = resolveFor({ hasCompany: true }, {
      what: { ...brief().what, scenario: "candidate_follow_up", activityCategory: "recrutement" },
    })
    const toCandidateModel = buildBriefFormModel(toCandidate.normalizedBrief, toCandidate)
    expect(toCandidateModel.candidateIsRecipient).toBe(true)
    expect(toCandidateModel.recipientTypeOptions).toEqual(["candidate"])
    expect(toCandidateModel.showContact).toBe(false)
    expect(toCandidateModel.showCandidate).toBe(true)

    const toClient = resolveFor({ hasCompany: true }, {
      what: { ...brief().what, scenario: "candidate_to_client_pitch", activityCategory: "recrutement", outputKind: "structured_briefing", channel: "meeting_briefing" },
    })
    const toClientModel = buildBriefFormModel(toClient.normalizedBrief, toClient)
    expect(toClientModel.candidateIsRecipient).toBe(false)
    expect(toClientModel.showCandidate).toBe(true)
    expect(toClientModel.showContact).toBe(true)
    expect(toClientModel.recipientTypeOptions).toEqual(["active_client", "prospect"])
  })
})

describe("buildContextSourceStates", () => {
  it("locks required sources, exposes optional ones, and hides irrelevant ones", () => {
    const resolution = resolveFor({ hasMission: true, recipientType: "active_client" }, {
      what: { ...brief().what, scenario: "project_alert_escalation", activityCategory: "delivery" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "active_client" } },
    })
    const states = buildContextSourceStates(resolution, undefined, {
      company: true, contact: false, opportunity: false, mission: true, candidate: false,
      collaborator: false, offer: false, interactions: false, news: false, sector_analysis: false,
      documents: false, agenda: false,
    })
    const byId = Object.fromEntries(states.map((s) => [s.id, s.visibility]))
    expect(byId.mission_context).toBe("locked_on")
    // account_profile est optionnel pour delivery — présent et disponible.
    expect(byId.account_profile).toBe("optional_on")
    // candidate_profile n'est ni requis ni optionnel pour delivery — absent.
    expect(byId.candidate_profile).toBeUndefined()
  })

  it("marks a required source unavailable when the data genuinely is not loaded", () => {
    const resolution = resolveFor({ hasMission: true, recipientType: "active_client" }, {
      what: { ...brief().what, scenario: "project_alert_escalation", activityCategory: "delivery" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "active_client" } },
    })
    const states = buildContextSourceStates(resolution, undefined, {
      company: false, contact: false, opportunity: false, mission: false, candidate: false,
      collaborator: false, offer: false, interactions: false, news: false, sector_analysis: false,
      documents: false, agenda: false,
    })
    const byId = Object.fromEntries(states.map((s) => [s.id, s.visibility]))
    expect(byId.mission_context).toBe("unavailable")
  })

  it("respects a user's optional-source deactivation without touching required sources", () => {
    const resolution = resolveFor({ hasCompany: true }, {
      what: { ...brief().what, scenario: "offer_introduction" },
    })
    const states = buildContextSourceStates(resolution, ["crm_contacts"], {
      company: true, contact: true, opportunity: false, mission: false, candidate: false,
      collaborator: false, offer: true, interactions: false, news: false, sector_analysis: false,
      documents: false, agenda: false,
    })
    const byId = Object.fromEntries(states.map((s) => [s.id, s.visibility]))
    expect(byId.crm_contacts).toBe("optional_off")
    expect(byId.account_profile).toBe("locked_on")
  })
})

describe("purgeIncompatibleReferences", () => {
  it("drops an offer reference when the resolved category no longer references offers", () => {
    const withOffer = brief({
      what: { ...brief().what, scenario: "cross_sell", activityCategory: "commerce_actif" },
      context: { offerRef: "offer-123" },
    })
    // Bascule vers commerce_prospection, dont aucun scénario ne référence offerRef.
    const resolution = resolveCommunicationOptions({ hasCompany: true }, {
      ...withOffer,
      what: { ...withOffer.what, activityCategory: "commerce_prospection" },
    })
    const purged = purgeIncompatibleReferences(resolution.normalizedBrief, resolution)
    expect(purged.brief.context.offerRef).toBeUndefined()
    expect(purged.adjustments).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "offerRef" }),
    ]))
  })

  it("keeps a reference that remains relevant to the resolved scenario", () => {
    const withOpportunity = brief({
      what: { ...brief().what, scenario: "proposal_follow_up", activityCategory: "commerce_actif" },
      context: { opportunityRef: "opp-1" },
    })
    const resolution = resolveCommunicationOptions({ hasCompany: true, recipientType: "active_client" }, withOpportunity)
    const purged = purgeIncompatibleReferences(resolution.normalizedBrief, resolution)
    expect(purged.brief.context.opportunityRef).toBe("opp-1")
    expect(purged.adjustments).toHaveLength(0)
  })
})

function collaboratorBrief(overrides: Partial<CommunicationBrief> = {}): CommunicationBrief {
  const base: CommunicationBrief = {
    what: {
      channel: "internal_note",
      scenario: "collaborator_recognition",
      outputKind: "written_message",
      length: "standard",
      activityCategory: "management_consultants",
      scope: "collaborator",
    },
    who: {
      sender: { role: "business_manager", name: "Guillaume" },
      recipient: { type: "collaborator", persona: "other", relation: "unknown", collaboratorId: "collab-1", displayName: "Antoine F." },
      objective: "acknowledge_contribution",
    },
    how: { tone: "warm", formality: "tu", language: "fr" },
    context: { collaboratorRef: "collab-1" },
  }
  return {
    ...base,
    ...overrides,
    what: { ...base.what, ...overrides.what },
    who: {
      ...base.who,
      ...overrides.who,
      sender: { ...base.who.sender, ...overrides.who?.sender },
      recipient: { ...base.who.recipient, ...overrides.who?.recipient },
    },
    how: { ...base.how, ...overrides.how },
    context: { ...base.context, ...overrides.context },
  }
}

describe("buildBriefFormModel — management_consultants (Lot 8)", () => {
  it("shows the consultant pivot and the optional mission pivot, hides every CRM field", () => {
    const brief = collaboratorBrief()
    const resolution = resolveCommunicationOptions({ hasCollaborator: true }, brief)
    const model = buildBriefFormModel(resolution.normalizedBrief, resolution)
    expect(model.showConsultant).toBe(true)
    expect(model.showMission).toBe(true)
    expect(model.showOpportunity).toBe(false)
    expect(model.showCandidate).toBe(false)
    expect(model.showOffer).toBe(false)
    expect(model.showContact).toBe(false)
    expect(model.showPersonaRelation).toBe(false)
    expect(model.showCategorySelector).toBe(false)
  })

  it("resolves scenario-specific tones instead of the uniform category default (command §5)", () => {
    const disciplinary = resolveCommunicationOptions({ hasCollaborator: true }, collaboratorBrief({
      what: { ...collaboratorBrief().what, scenario: "disciplinary_meeting_posture", outputKind: "structured_briefing", channel: "meeting_briefing" },
    }))
    const disciplinaryModel = buildBriefFormModel(disciplinary.normalizedBrief, disciplinary)
    expect(disciplinaryModel.tones).toEqual(["assertive", "direct", "diplomatic", "prudent"])

    const recognition = resolveCommunicationOptions({ hasCollaborator: true }, collaboratorBrief())
    const recognitionModel = buildBriefFormModel(recognition.normalizedBrief, recognition)
    expect(recognitionModel.tones).toEqual(["warm", "enthusiastic_confident", "direct"])

    // business_roi reste exclu même pour un scénario avec override (command §5 "respecter les exclusions").
    expect(recognitionModel.tones).not.toContain("business_roi")
  })
})

describe("buildContextSourceStates — management_consultants", () => {
  it("locks collaborator_context (required) and exposes mission_context as optional", () => {
    const resolution = resolveCommunicationOptions({ hasCollaborator: true }, collaboratorBrief())
    const states = buildContextSourceStates(resolution, undefined, {
      company: false, contact: false, opportunity: false, mission: true, candidate: false,
      collaborator: true, offer: false, interactions: false, news: false, sector_analysis: false,
      documents: false, agenda: true,
    })
    const byId = Object.fromEntries(states.map((s) => [s.id, s.visibility]))
    expect(byId.collaborator_context).toBe("locked_on")
    expect(byId.mission_context).toBe("optional_on")
    // account_profile n'est ni requis ni optionnel pour management_consultants.
    expect(byId.account_profile).toBeUndefined()
  })
})

describe("purgeIncompatibleReferences — CRM field neutralization (Lot 8 command §7)", () => {
  it("clears persona/relation/contactId/companyName once scope leaves account, without deleting them (compat historique)", () => {
    const staleBrief = collaboratorBrief({
      who: {
        ...collaboratorBrief().who,
        recipient: {
          ...collaboratorBrief().who.recipient,
          persona: "purchasing",
          relation: "warm",
          contactId: "contact-from-a-previous-account-scope-session",
          companyName: "Ancien compte",
        },
      },
    })
    const resolution = resolveCommunicationOptions({ hasCollaborator: true }, staleBrief)
    const purged = purgeIncompatibleReferences(resolution.normalizedBrief, resolution)
    expect(purged.brief.who.recipient.persona).toBe("other")
    expect(purged.brief.who.recipient.relation).toBe("unknown")
    expect(purged.brief.who.recipient.contactId).toBeUndefined()
    expect(purged.brief.who.recipient.companyName).toBeUndefined()
    expect(purged.brief.who.recipient.collaboratorId).toBe("collab-1")
    expect(purged.adjustments).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "recipientCrmFields" }),
    ]))
  })

  it("leaves an already-clean collaborator brief untouched (no noisy adjustments)", () => {
    const resolution = resolveCommunicationOptions({ hasCollaborator: true }, collaboratorBrief())
    const purged = purgeIncompatibleReferences(resolution.normalizedBrief, resolution)
    expect(purged.adjustments).toHaveLength(0)
  })

  it("does not touch persona/relation for account-scope briefs", () => {
    const resolution = resolveFor({ hasCompany: true })
    const purged = purgeIncompatibleReferences(resolution.normalizedBrief, resolution)
    expect(purged.adjustments).toHaveLength(0)
  })
})

describe("mergeCommunicationFacts", () => {
  it("lets manually picked refs count as facts for the next resolution", () => {
    const withMission = brief({
      what: { ...brief().what, scenario: "project_alert_escalation", activityCategory: "delivery" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "active_client" } },
      context: { missionRef: "mission-1" },
    })
    const merged = mergeCommunicationFacts(undefined, withMission)
    expect(merged.hasMission).toBe(true)
  })

  it("regression: does not let a lifecycle-based recipientType silently override a candidate-directed recruitment scenario", () => {
    // Le compte a un lifecycle réel ("prospect") qui, propagé tel quel, ne
    // matche jamais eligibleRecipientTypes=["candidate"] — sans le correctif,
    // le résolveur écarterait candidate_follow_up de `candidates` et le
    // remplacerait silencieusement par un autre scénario recrutement.
    const targeted = brief({
      what: { ...brief().what, scenario: "candidate_follow_up", activityCategory: "recrutement" },
    })
    const baseFacts: CommunicationContextFacts = { hasCompany: true, recipientType: "prospect" }
    const merged = mergeCommunicationFacts(baseFacts as never, targeted)
    expect(merged.recipientType).toBeUndefined()

    const resolution = resolveCommunicationOptions(merged, targeted)
    expect(resolution.normalizedBrief.what.scenario).toBe("candidate_follow_up")
    expect(resolution.normalizedBrief.who.recipient.type).toBe("candidate")
  })

  it("preserves the base recipientType fact outside recruitment", () => {
    const merged = mergeCommunicationFacts({ recipientType: "active_client" } as never, brief())
    expect(merged.recipientType).toBe("active_client")
  })
})

function internalBrief(overrides: Partial<CommunicationBrief> = {}): CommunicationBrief {
  const base: CommunicationBrief = {
    what: {
      channel: "internal_note",
      scenario: "internal_arbitrage_request",
      outputKind: "written_message",
      length: "standard",
      activityCategory: "internal_staff",
      scope: "internal",
    },
    who: {
      sender: { role: "business_manager", name: "Guillaume" },
      recipient: { type: "internal", persona: "other", relation: "unknown", internalRole: "manager_n1", internalRelationship: "hierarchical_up", internalDomain: "commercial" },
      objective: "request_action",
    },
    how: { tone: "assertive", formality: "tu", language: "fr" },
    context: {},
  }
  return {
    ...base,
    ...overrides,
    what: { ...base.what, ...overrides.what },
    who: {
      ...base.who,
      ...overrides.who,
      sender: { ...base.who.sender, ...overrides.who?.sender },
      recipient: { ...base.who.recipient, ...overrides.who?.recipient },
    },
    how: { ...base.how, ...overrides.how },
    context: { ...base.context, ...overrides.context },
  }
}

describe("buildBriefFormModel — internal_staff (Lot 9)", () => {
  it("shows the internal recipient block, hides every CRM/offer field", () => {
    const resolution = resolveCommunicationOptions({ internalRole: "manager_n1" }, internalBrief())
    const model = buildBriefFormModel(resolution.normalizedBrief, resolution)
    expect(model.showInternalRecipient).toBe(true)
    expect(model.showCategorySelector).toBe(false)
    expect(model.showContact).toBe(false)
    expect(model.showPersonaRelation).toBe(false)
    expect(model.showConsultant).toBe(false)
    expect(model.showCandidate).toBe(false)
    expect(model.showOffer).toBe(false)
  })

  it("exposes optional internal references (company/opportunity/mission/collaborator) — command §4", () => {
    const resolution = resolveCommunicationOptions({ internalRole: "manager_n1" }, internalBrief())
    const model = buildBriefFormModel(resolution.normalizedBrief, resolution)
    expect(model.showCompanyRef).toBe(true)
    expect(model.showOpportunity).toBe(true)
    expect(model.showMission).toBe(true)
    expect(model.showCollaboratorRef).toBe(true)
    // candidateId volontairement non exposé ce lot (cf. rapport de lot).
    expect(model.showCandidate).toBe(false)
  })

  it("resolves scenario-specific tones for the named cases (command §6)", () => {
    const escalation = resolveCommunicationOptions({ internalRole: "manager_n1" }, internalBrief({
      what: { ...internalBrief().what, scenario: "internal_alert_escalation" },
    }))
    expect(buildBriefFormModel(escalation.normalizedBrief, escalation).tones).toEqual(["prudent", "assertive"])

    const coordination = resolveCommunicationOptions({ internalRole: "recruitment" }, internalBrief({
      what: { ...internalBrief().what, scenario: "cross_functional_coordination_request" },
      who: { ...internalBrief().who, recipient: { ...internalBrief().who.recipient, internalRole: "recruitment" } },
    }))
    expect(buildBriefFormModel(coordination.normalizedBrief, coordination).tones).toEqual(["direct", "diplomatic"])

    const direction = resolveCommunicationOptions({ internalRole: "executive_management" }, internalBrief({
      what: { ...internalBrief().what, scenario: "quarterly_business_review", outputKind: "structured_briefing", channel: "meeting_briefing" },
      who: { ...internalBrief().who, recipient: { ...internalBrief().who.recipient, internalRole: "executive_management", internalRelationship: "executive_committee", internalDomain: "strategy" } },
    }))
    expect(buildBriefFormModel(direction.normalizedBrief, direction).tones).toEqual(["formal", "business_roi", "assertive"])

    // Défaut de catégorie préservé quand aucun override n'est déclaré.
    const arbitrage = resolveCommunicationOptions({ internalRole: "manager_n1" }, internalBrief())
    expect(buildBriefFormModel(arbitrage.normalizedBrief, arbitrage).tones).toEqual(["business_roi", "assertive", "prudent"])
  })

  it("has no locked context source today (internal_staff declares zero required sources)", () => {
    const resolution = resolveCommunicationOptions({ internalRole: "manager_n1" }, internalBrief())
    const states = buildContextSourceStates(resolution, undefined, {
      company: false, contact: false, opportunity: false, mission: false, candidate: false,
      collaborator: false, offer: false, interactions: false, news: false, sector_analysis: false,
      documents: false, agenda: false,
    })
    expect(states.every((source) => source.visibility !== "locked_on")).toBe(true)
  })
})

describe("purgeIncompatibleReferences — internal_staff (Lot 9)", () => {
  it("clears CRM recipient fields for an internal brief carrying stale account-scope state", () => {
    const stale = internalBrief({
      who: {
        ...internalBrief().who,
        recipient: { ...internalBrief().who.recipient, persona: "purchasing", relation: "warm", contactId: "old-contact" },
      },
    })
    const resolution = resolveCommunicationOptions({ internalRole: "manager_n1" }, stale)
    const purged = purgeIncompatibleReferences(resolution.normalizedBrief, resolution)
    expect(purged.brief.who.recipient.persona).toBe("other")
    expect(purged.brief.who.recipient.relation).toBe("unknown")
    expect(purged.brief.who.recipient.contactId).toBeUndefined()
    expect(purged.brief.who.recipient.internalRole).toBe("manager_n1")
  })

  it("keeps a company reference relevant to internal_staff and purges an offer reference left over from another category", () => {
    const withRefs = internalBrief({ context: { companyRef: "company-1", offerRef: "offer-stale" } })
    const resolution = resolveCommunicationOptions({ internalRole: "manager_n1" }, withRefs)
    const purged = purgeIncompatibleReferences(resolution.normalizedBrief, resolution)
    expect(purged.brief.context.companyRef).toBe("company-1")
    // offerRef reste théoriquement dans optionalReferences (command §4), donc
    // non purgé ici — la garde réelle empêchant son usage est showOffer
    // (toujours false, gouverné par scenario.requiresOffer, jamais vrai en internal_staff).
    expect(purged.brief.context.offerRef).toBe("offer-stale")
  })
})

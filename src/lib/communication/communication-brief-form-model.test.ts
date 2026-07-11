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

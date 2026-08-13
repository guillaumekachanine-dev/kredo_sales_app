import { describe, expect, it } from "vitest"
import type { CommunicationBrief } from "@/lib/n8n/types"
import { resolveCommunicationOptions } from "./communication-options-resolver"

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

describe("resolveCommunicationOptions", () => {
  it("resolves the three scopes and their canonical categories", () => {
    expect(resolveCommunicationOptions({ hasCompany: true }, brief()).availableActivityCategories)
      .toEqual(["commerce_prospection", "commerce_actif", "delivery", "recrutement"])
    expect(resolveCommunicationOptions({ hasCollaborator: true }, brief()).normalizedBrief.what.activityCategory)
      .toBe("management_consultants")
    expect(resolveCommunicationOptions({ internalRole: "presales" }, brief()).normalizedBrief.what.activityCategory)
      .toBe("internal_staff")
  })

  it("preserves valid user choices and replaces invalid ones with adjustments", () => {
    const valid = brief({
      what: { ...brief().what, scenario: "cross_sell", activityCategory: "commerce_actif" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "active_client" }, objective: "present_offer" },
    })
    const preserved = resolveCommunicationOptions({ scope: "account", recipientType: "active_client" }, valid, { scenario: "user", objective: "user" })
    expect(preserved.normalizedBrief.what.scenario).toBe("cross_sell")
    expect(preserved.adjustments.find((item) => item.field === "scenario")).toBeUndefined()

    const invalid = resolveCommunicationOptions({ hasCollaborator: true }, brief(), { scenario: "user" })
    expect(invalid.normalizedBrief.what.scenario).not.toBe("signal_outreach")
    expect(invalid.adjustments).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "scenario" }),
    ]))
  })

  it("keeps multi-finality scenarios and filters an incompatible finality", () => {
    const multi = brief({
      what: { ...brief().what, scope: "collaborator", activityCategory: "management_consultants", scenario: "collaborator_recognition", outputKind: "spoken_pitch", channel: "spoken_pitch_30s" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "collaborator" } },
    })
    expect(resolveCommunicationOptions({ hasCollaborator: true }, multi).availableOutputKinds)
      .toEqual(["written_message", "spoken_pitch"])

    const changed = resolveCommunicationOptions({ hasCompany: true }, brief({
      what: { ...brief().what, outputKind: "spoken_pitch", channel: "spoken_pitch_30s" },
    }))
    expect(changed.normalizedBrief.what.outputKind).toBe("written_message")
    expect(changed.adjustments).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "outputKind" }),
      expect.objectContaining({ field: "channel" }),
    ]))
  })

  it("handles offer requirements only for the scenarios that declare them", () => {
    const offered = resolveCommunicationOptions({ hasCompany: true }, brief({
      what: { ...brief().what, scenario: "offer_introduction" },
    }))
    expect(offered.requiredReferences).toContain("offerRef")

    const notOffered = resolveCommunicationOptions({ hasCompany: true }, brief({
      what: { ...brief().what, scenario: "client_crisis_talk_track", activityCategory: "commerce_actif", outputKind: "structured_briefing", channel: "meeting_briefing" },
    }))
    expect(notOffered.requiredReferences).not.toContain("offerRef")
  })

  it("limits sector rebound objectives to the scenario contract", () => {
    const resolved = resolveCommunicationOptions({ hasCompany: true }, brief({
      what: { ...brief().what, scenario: "sector_rebound" },
    }))

    expect(resolved.availableObjectives).toEqual(["get_meeting"])
    expect(resolved.availableObjectives).not.toContain("manage_expectations")
    expect(resolved.availableObjectives).not.toContain("escalate_issue")
  })

  it("preserves an explicit cockpit scenario even when the account lifecycle suggests another family", () => {
    const selected = brief({
      what: {
        ...brief().what,
        activityCategory: "commerce_prospection",
        scenario: "sector_rebound",
      },
      who: {
        ...brief().who,
        recipient: { ...brief().who.recipient, type: "prospect" },
        objective: "get_meeting",
      },
    })

    const resolved = resolveCommunicationOptions(
      { scope: "account", hasCompany: true, recipientType: "active_client" },
      selected,
      { activityCategory: "user", scenario: "user", objective: "user" },
    )

    expect(resolved.normalizedBrief.what.activityCategory).toBe("commerce_prospection")
    expect(resolved.normalizedBrief.what.scenario).toBe("sector_rebound")
    expect(resolved.normalizedBrief.who.objective).toBe("get_meeting")
  })

  it("uses only compatible tones and supports delivery, recruitment and Staff", () => {
    const delivery = resolveCommunicationOptions({ hasMission: true, recipientType: "active_client" }, brief({
      what: { ...brief().what, scenario: "project_alert_escalation", activityCategory: "delivery" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "active_client" } },
      how: { ...brief().how, tone: "enthusiastic_confident" },
    }))
    expect(delivery.normalizedBrief.how.tone).toBe("diplomatic")

    const recruitment = resolveCommunicationOptions({ hasCandidate: true, recipientType: "candidate" }, brief({
      what: { ...brief().what, scenario: "candidate_follow_up", activityCategory: "recrutement" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "candidate" } },
    }))
    expect(recruitment.availableScenarios).toContain("candidate_follow_up")

    const staff = resolveCommunicationOptions({ internalRole: "presales" }, brief())
    expect(staff.normalizedBrief.who.recipient.type).toBe("internal")
  })

  it("normalizes legacy values deterministically without mutating inputs", () => {
    const legacy = brief({
      what: {
        ...brief().what,
        scenario: "profile_submission" as never,
        activityCategory: "interne_management" as never,
        scope: "internal",
      },
    })
    const snapshot = JSON.stringify(legacy)
    const first = resolveCommunicationOptions({ scope: "internal" }, legacy)
    const second = resolveCommunicationOptions({ scope: "internal" }, legacy)
    expect(first.normalizedBrief.what.activityCategory).toBe("internal_staff")
    expect(first.normalizedBrief.what.scenario).not.toBe("profile_submission")
    expect(first).toEqual(second)
    expect(JSON.stringify(legacy)).toBe(snapshot)
  })

  it("preserves a manually chosen recipient type over a stale lifecycle fact when both are eligible (Lot 7)", () => {
    const chosenProspect = brief({
      what: { ...brief().what, scenario: "candidate_to_client_pitch", activityCategory: "recrutement", outputKind: "structured_briefing", channel: "meeting_briefing" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "prospect" } },
    })
    const resolved = resolveCommunicationOptions({ hasCompany: true, recipientType: "active_client" }, chosenProspect)
    expect(resolved.normalizedBrief.who.recipient.type).toBe("prospect")

    const invalidChoice = brief({
      what: { ...brief().what, scenario: "candidate_to_client_pitch", activityCategory: "recrutement", outputKind: "structured_briefing", channel: "meeting_briefing" },
      who: { ...brief().who, recipient: { ...brief().who.recipient, type: "candidate" } },
    })
    const fallback = resolveCommunicationOptions({ hasCompany: true, recipientType: "active_client" }, invalidChoice)
    expect(fallback.normalizedBrief.who.recipient.type).toBe("active_client")
  })

  it("resolves the full spread of management_consultants scenarios covered by Lot 8 (recognition, difficult feedback, intercontract, annual review, retention, sensitive briefing)", () => {
    const managementBrief = (scenario: string, outputKind: "written_message" | "spoken_pitch" | "structured_briefing", channel: string) =>
      brief({
        what: {
          channel: channel as never,
          scenario: scenario as never,
          outputKind,
          length: "standard",
          activityCategory: "management_consultants",
          scope: "collaborator",
        },
        who: { ...brief().who, recipient: { type: "collaborator", persona: "other", relation: "unknown", collaboratorId: "collab-1" } },
      })

    const cases: [string, "written_message" | "spoken_pitch" | "structured_briefing", string][] = [
      ["collaborator_recognition", "written_message", "internal_note"],
      ["performance_feedback_talk_track", "spoken_pitch", "spoken_pitch_30s"],
      ["intercontract_action_plan_message", "written_message", "internal_note"],
      ["annual_review_follow_up", "written_message", "internal_note"],
      ["consultant_retention_follow_up", "written_message", "internal_note"],
      ["sensitive_meeting_briefing", "structured_briefing", "meeting_briefing"],
    ]

    for (const [scenario, outputKind, channel] of cases) {
      const resolved = resolveCommunicationOptions({ hasCollaborator: true }, managementBrief(scenario, outputKind, channel))
      expect(resolved.normalizedBrief.what.scenario).toBe(scenario)
      expect(resolved.normalizedBrief.what.activityCategory).toBe("management_consultants")
      expect(resolved.normalizedBrief.who.recipient.type).toBe("collaborator")
      // Mission jamais requise (command §2 "seulement si la registry l'exige" —
      // aucun scénario management ne l'exige aujourd'hui).
      expect(resolved.requiredReferences).not.toContain("missionRef")
      expect(resolved.optionalReferences).toContain("missionRef")
    }
  })

  it("keeps a management_consultants multi-finality scenario as one entry across finalities", () => {
    const asWritten = resolveCommunicationOptions({ hasCollaborator: true }, brief({
      what: { ...brief().what, scenario: "assignment_change_notice", activityCategory: "management_consultants", scope: "collaborator", outputKind: "written_message", channel: "internal_note" },
      who: { ...brief().who, recipient: { type: "collaborator", persona: "other", relation: "unknown", collaboratorId: "collab-1" } },
    }))
    expect(asWritten.normalizedBrief.what.scenario).toBe("assignment_change_notice")

    const asSpoken = resolveCommunicationOptions({ hasCollaborator: true }, brief({
      what: { ...brief().what, scenario: "assignment_change_notice", activityCategory: "management_consultants", scope: "collaborator", outputKind: "spoken_pitch", channel: "spoken_pitch_30s" },
      who: { ...brief().who, recipient: { type: "collaborator", persona: "other", relation: "unknown", collaboratorId: "collab-1" } },
    }))
    expect(asSpoken.normalizedBrief.what.scenario).toBe("assignment_change_notice")
    expect(asSpoken.normalizedBrief.what.outputKind).toBe("spoken_pitch")
  })

  it("covers the six internal_staff destinataires named by Lot 9 (N+1, pair transverse, Practice, avant-vente, finance, direction)", () => {
    const roleCases: [
      "manager_n1" | "peer_business_manager" | "practice_lead" | "presales" | "finance_admin" | "executive_management",
      "hierarchical_up" | "peer" | "cross_functional" | "executive_committee" | "team",
      "commercial" | "recruitment" | "practice" | "presales" | "finance" | "strategy",
    ][] = [
      ["manager_n1", "hierarchical_up", "commercial"], // N+1 hiérarchique
      ["peer_business_manager", "peer", "commercial"], // pair transverse (BM pair)
      ["practice_lead", "cross_functional", "practice"], // Practice
      ["presales", "cross_functional", "presales"], // avant-vente
      ["finance_admin", "team", "finance"], // finance
      ["executive_management", "executive_committee", "strategy"], // direction
    ]

    for (const [role, relationship, domain] of roleCases) {
      const withRole = brief({
        what: { ...brief().what, scenario: "internal_arbitrage_request", activityCategory: "internal_staff", scope: "internal", channel: "internal_note" },
        who: { ...brief().who, recipient: { type: "internal", persona: "other", relation: "unknown", internalRole: role, internalRelationship: relationship, internalDomain: domain } },
      })
      const resolved = resolveCommunicationOptions({ internalRole: role }, withRole)
      expect(resolved.normalizedBrief.who.recipient.type).toBe("internal")
      expect(resolved.normalizedBrief.who.recipient.internalRole).toBe(role)
      expect(resolved.normalizedBrief.who.recipient.internalRelationship).toBe(relationship)
      expect(resolved.normalizedBrief.who.recipient.internalDomain).toBe(domain)
      expect(resolved.normalizedBrief.what.activityCategory).toBe("internal_staff")
    }
  })

  it("preserves a manually chosen internal role/relationship/domain over a stale preset fact (Lot 9, same fix as recipientType)", () => {
    const changedInForm = brief({
      what: { ...brief().what, scenario: "internal_arbitrage_request", activityCategory: "internal_staff", scope: "internal", channel: "internal_note" },
      who: { ...brief().who, recipient: { type: "internal", persona: "other", relation: "unknown", internalRole: "finance_admin", internalRelationship: "team", internalDomain: "finance" } },
    })
    // Le fact vient d'un preset d'ouverture périmé ("manager_n1") — le choix
    // fait dans le formulaire (finance_admin) doit rester prioritaire.
    const resolved = resolveCommunicationOptions({ internalRole: "manager_n1" }, changedInForm)
    expect(resolved.normalizedBrief.who.recipient.internalRole).toBe("finance_admin")
  })

  it("resolves the scenarios named by Lot 9 (arbitrage, staffing, escalade, QBR)", () => {
    const cases = ["internal_arbitrage_request", "staffing_help_request", "internal_alert_escalation", "quarterly_business_review"] as const
    for (const scenario of cases) {
      const resolved = resolveCommunicationOptions({ internalRole: "manager_n1" }, brief({
        what: { ...brief().what, scenario, activityCategory: "internal_staff", scope: "internal", channel: "internal_note" },
        who: { ...brief().who, recipient: { type: "internal", persona: "other", relation: "unknown", internalRole: "manager_n1", internalRelationship: "hierarchical_up", internalDomain: "commercial" } },
      }))
      expect(resolved.normalizedBrief.what.scenario).toBe(scenario)
      expect(resolved.normalizedBrief.what.activityCategory).toBe("internal_staff")
    }
  })

  it("keeps an internal_staff multi-finality scenario as one entry across finalities (QBR)", () => {
    const asBriefing = resolveCommunicationOptions({ internalRole: "executive_management" }, brief({
      what: { ...brief().what, scenario: "quarterly_business_review", activityCategory: "internal_staff", scope: "internal", outputKind: "structured_briefing", channel: "meeting_briefing" },
      who: { ...brief().who, recipient: { type: "internal", persona: "other", relation: "unknown", internalRole: "executive_management" } },
    }))
    expect(asBriefing.normalizedBrief.what.scenario).toBe("quarterly_business_review")

    const asSpoken = resolveCommunicationOptions({ internalRole: "executive_management" }, brief({
      what: { ...brief().what, scenario: "quarterly_business_review", activityCategory: "internal_staff", scope: "internal", outputKind: "spoken_pitch", channel: "spoken_pitch_30s" },
      who: { ...brief().who, recipient: { type: "internal", persona: "other", relation: "unknown", internalRole: "executive_management" } },
    }))
    expect(asSpoken.normalizedBrief.what.scenario).toBe("quarterly_business_review")
    expect(asSpoken.normalizedBrief.what.outputKind).toBe("spoken_pitch")
  })

  it("rejects an ambiguous legacy category instead of silently guessing", () => {
    const ambiguous = brief({
      what: {
        ...brief().what,
        activityCategory: "interne_management" as never,
        scope: undefined as never,
      },
    })
    expect(() => resolveCommunicationOptions({}, ambiguous))
      .toThrow("Cannot normalize legacy interne_management without an explicit scope")
  })
})

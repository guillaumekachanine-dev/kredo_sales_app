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

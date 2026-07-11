import { describe, expect, it } from "vitest"
import type { CommunicationBrief } from "@/lib/n8n/types"
import {
  applyCommunicationPurposeToBrief,
  getCommunicationPurposeNavigationItems,
  getCommunicationPurposeOption,
  getCommunicationPurposeOptions,
  getOutputKindFromComposerPreset,
  getScenarioPurposeGroups,
  normalizeCommunicationPurpose,
} from "./communication-purpose"
import { getScenarioDefinition } from "./communication-scenario-registry"

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

describe("communication purpose navigation", () => {
  it("exposes the three canonical finalities and their labels", () => {
    expect(getCommunicationPurposeOptions()).toEqual([
      expect.objectContaining({
        value: "written_message",
        label: "Rédiger un mail",
        subtitle: "message prêt à relire",
      }),
      expect.objectContaining({
        value: "spoken_pitch",
        label: "Élaborer un pitch",
        subtitle: "discours oral structuré",
      }),
      expect.objectContaining({
        value: "structured_briefing",
        label: "Préparer un RDV",
        subtitle: "fiche d'arguments et posture",
      }),
    ])
    expect(getCommunicationPurposeOption("structured_briefing").shortLabel).toBe("RDV")
  })

  it("defines separate desktop and mobile navigation contracts without adaptive double mounting", () => {
    const desktop = getCommunicationPurposeNavigationItems("desktop")
    const mobile = getCommunicationPurposeNavigationItems("mobile")

    expect(desktop).toHaveLength(3)
    expect(mobile).toHaveLength(3)
    expect(desktop.every((item) => item.minTouchTargetPx === 32)).toBe(true)
    expect(mobile.every((item) => item.minTouchTargetPx >= 44)).toBe(true)
    expect(mobile.map((item) => item.value)).toEqual(["written_message", "spoken_pitch", "structured_briefing"])
  })

  it("normalizes legacy mail and pitch presets without emitting legacy values", () => {
    expect(normalizeCommunicationPurpose("mail")).toBe("written_message")
    expect(normalizeCommunicationPurpose("pitch", "spoken_pitch_30s")).toBe("spoken_pitch")
    expect(normalizeCommunicationPurpose("pitch", "meeting_briefing")).toBe("structured_briefing")

    expect(getOutputKindFromComposerPreset({ outputKind: "mail" as never })).toBe("written_message")
    expect(getOutputKindFromComposerPreset({ outputKind: "pitch" as never, channel: "spoken_pitch_30s" })).toBe("spoken_pitch")
    expect(getOutputKindFromComposerPreset({ outputKind: "pitch" as never, channel: "meeting_briefing" })).toBe("structured_briefing")
    expect(["mail", "pitch"]).not.toContain(getOutputKindFromComposerPreset({ outputKind: "pitch" as never }))
  })

  it("distinguishes spoken pitch scenarios from structured briefing scenarios", () => {
    const spokenScenarios = getScenarioPurposeGroups("spoken_pitch").flatMap((group) => group.scenarios.map((scenario) => scenario.value))
    const briefingScenarios = getScenarioPurposeGroups("structured_briefing").flatMap((group) => group.scenarios.map((scenario) => scenario.value))

    expect(spokenScenarios).toContain("signal_based_pitch")
    expect(spokenScenarios).not.toContain("meeting_prep_discovery")
    expect(briefingScenarios).toContain("meeting_prep_discovery")
  })

  it("changes finality by recalculating incompatible scenario, channel and output kind", () => {
    const result = applyCommunicationPurposeToBrief(
      brief(),
      "spoken_pitch",
      { scope: "account", hasCompany: true, recipientType: "prospect" },
    )

    expect(result.brief.what.outputKind).toBe("spoken_pitch")
    expect(result.brief.what.channel).toBe("spoken_pitch_30s")
    expect(result.brief.what.scenario).not.toBe("signal_outreach")
    expect(getScenarioDefinition(result.brief.what.scenario)?.allowedOutputKinds).toContain("spoken_pitch")
  })

  it("keeps compatible user choices for multi-finality scenarios", () => {
    const current = brief({
      what: {
        ...brief().what,
        scope: "internal",
        activityCategory: "internal_staff",
        scenario: "quarterly_business_review",
        outputKind: "spoken_pitch",
        channel: "spoken_pitch_30s",
      },
      who: {
        ...brief().who,
        recipient: { ...brief().who.recipient, type: "internal", internalRole: "manager_n1" },
        objective: "summarize_decisions",
      },
    })

    const result = applyCommunicationPurposeToBrief(
      current,
      "structured_briefing",
      { scope: "internal", recipientType: "internal", internalRole: "manager_n1" },
    )

    expect(result.brief.what.scenario).toBe("quarterly_business_review")
    expect(result.brief.what.outputKind).toBe("structured_briefing")
    expect(result.brief.what.channel).toBe("meeting_briefing")
    expect(result.brief.who.objective).toBe("summarize_decisions")
  })

  it("normalizes invalid values deterministically and clears offers for written messages", () => {
    const current = brief({
      what: {
        ...brief().what,
        scenario: "meeting_prep_discovery",
        outputKind: "structured_briefing",
        channel: "meeting_briefing",
      },
      context: { offerRef: "offer-1" },
    })

    const result = applyCommunicationPurposeToBrief(
      current,
      "written_message",
      { scope: "account", hasCompany: true, recipientType: "prospect" },
    )

    expect(result.brief.what.outputKind).toBe("written_message")
    expect(result.brief.what.channel).toBe("email")
    expect(result.brief.context.offerRef).toBeUndefined()
    expect(getScenarioDefinition(result.brief.what.scenario)?.allowedOutputKinds).toContain("written_message")
  })
})

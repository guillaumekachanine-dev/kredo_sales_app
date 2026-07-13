import { describe, expect, it, vi } from "vitest"
import { enrichFromActiveIntelligenceContext } from "@/components/communication/CommunicationComposerHost"
import type { CommunicationComposerRequest } from "@/lib/communication/communication-composer"
import {
  NEUTRAL_LAUNCH_FAMILIES,
  buildNeutralCommunicationBrief,
  getNeutralObjectiveOptions,
  getNeutralScenariosByFamily,
  getNeutralSecondaryChannelOptions,
} from "@/lib/communication/neutral-launch"

// Mock useIntelligenceContext state
vi.mock("@/hooks/use-intelligence-context", () => ({
  useIntelligenceContext: {
    getState: () => ({
      entityContext: {
        entityType: "company",
        entityId: "mock-company-id",
        label: "Mock Company",
      },
      panelData: {
        company: {
          id: "mock-company-id",
          name: "Mock Company",
        },
      },
    }),
  },
}))

describe("Neutral launch mode contract", () => {
  it("keeps launchMode as contextual by default (implicitly undefined)", () => {
    const request: CommunicationComposerRequest = { origin: "global" }
    expect(request.launchMode).toBeUndefined()
  })

  it("does not enrich the request from active intelligence context in neutral mode", () => {
    const request: CommunicationComposerRequest = {
      origin: "cockpit_header",
      launchMode: "neutral",
    }
    const enriched = enrichFromActiveIntelligenceContext(request)
    expect(enriched.companyId).toBeUndefined()
    expect(enriched.companyName).toBeUndefined()
    expect(enriched.primaryEntity).toBeUndefined()
    expect(enriched).toEqual(request)
  })

  it("enriches the request from active intelligence context in contextual mode", () => {
    const request: CommunicationComposerRequest = {
      origin: "global",
    }
    const enriched = enrichFromActiveIntelligenceContext(request)
    expect(enriched.companyId).toBe("mock-company-id")
    expect(enriched.companyName).toBe("Mock Company")
  })
})

describe("Neutral launch picker model", () => {
  it("exposes the six canonical families in the requested order", () => {
    expect(NEUTRAL_LAUNCH_FAMILIES.map((family) => family.value)).toEqual([
      "commerce_prospection",
      "commerce_actif",
      "recrutement",
      "delivery",
      "management_consultants",
      "internal_staff",
    ])
  })

  it("lists every scenario in a selected family without an output-kind prefilter", () => {
    const scenarios = getNeutralScenariosByFamily("commerce_prospection")
    expect(scenarios.map((scenario) => scenario.value)).toContain("signal_outreach")
    expect(scenarios.map((scenario) => scenario.value)).toContain("cold_call_pitch")
    expect(new Set(scenarios.map((scenario) => scenario.activityCategory))).toEqual(new Set(["commerce_prospection"]))
  })

  it("puts the default objective first with the suggested badge", () => {
    const options = getNeutralObjectiveOptions("cold_call_pitch")
    expect(options[0]).toMatchObject({ value: "get_meeting", suggested: true })
    expect(options.slice(1).every((option) => option.suggested === false)).toBe(true)
  })

  it("filters secondary formats by scenario and selected output kind", () => {
    expect(getNeutralSecondaryChannelOptions("collaborator_recognition", "written_message").map((option) => option.value))
      .toEqual(["email", "linkedin_invitation", "linkedin_message", "internal_note"])
    expect(getNeutralSecondaryChannelOptions("collaborator_recognition", "spoken_pitch").map((option) => option.value))
      .toEqual(["spoken_pitch_30s"])
  })

  it("builds the final brief through the resolver and preserves neutral choices", () => {
    const brief = buildNeutralCommunicationBrief({
      activityCategory: "management_consultants",
      scenario: "assignment_change_notice",
      objective: "announce_change",
      outputKind: "spoken_pitch",
      channel: "spoken_pitch_30s",
    })

    expect(brief.what.scope).toBe("collaborator")
    expect(brief.what.activityCategory).toBe("management_consultants")
    expect(brief.what.scenario).toBe("assignment_change_notice")
    expect(brief.who.objective).toBe("announce_change")
    expect(brief.what.outputKind).toBe("spoken_pitch")
    expect(brief.what.channel).toBe("spoken_pitch_30s")
  })

  it("rejects invalid scenario/objective/output/channel combinations instead of silently changing them", () => {
    expect(() => buildNeutralCommunicationBrief({
      activityCategory: "commerce_prospection",
      scenario: "signal_outreach",
      objective: "get_meeting",
      outputKind: "spoken_pitch",
      channel: "spoken_pitch_30s",
    })).toThrow("Output kind spoken_pitch is not available for signal_outreach")
  })
})

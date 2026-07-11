import { describe, expect, it } from "vitest"
import type { CommunicationBrief } from "@/lib/n8n/types"
import { resolveBriefWithLoadedContext } from "./communication-context-brief"
import type { LoadedCommunicationContext } from "./communication-context-loader"
import { createEmptySourceAvailability } from "./communication-context-mappers"

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
      sender: { role: "business_manager", name: "" },
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

describe("resolveBriefWithLoadedContext", () => {
  it("keeps the current composer behavior when no loaded context exists", () => {
    const current = brief()
    const resolved = resolveBriefWithLoadedContext(current, null)

    expect(resolved.brief).toBe(current)
    expect(resolved.resolution).toBeNull()
  })

  it("applies the Lot 3 resolver from loaded collaborator facts", () => {
    const loadedContext: LoadedCommunicationContext = {
      facts: {
        scope: "collaborator",
        recipientType: "collaborator",
        hasCollaborator: true,
      },
      references: { collaboratorContext: { collaborator: { id: "collaborator-1" } } },
      sourceAvailability: createEmptySourceAvailability(),
    }

    const resolved = resolveBriefWithLoadedContext(brief(), loadedContext)

    expect(resolved.resolution).not.toBeNull()
    expect(resolved.brief.what.scope).toBe("collaborator")
    expect(resolved.brief.what.activityCategory).toBe("management_consultants")
    expect(resolved.brief.who.recipient.type).toBe("collaborator")
  })
})

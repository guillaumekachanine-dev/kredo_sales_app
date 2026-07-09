import { describe, expect, it } from "vitest"
import { buildDefaultBrief } from "./communication-brief-options"

const contacts = [
  {
    id: "contact-decideur",
    fullName: "Alice Martin",
    jobTitle: "DSI",
    relationshipRole: "decideur",
    email: "alice@example.com",
  },
]

describe("buildDefaultBrief", () => {
  it("prefills the selected contact and persona", () => {
    const brief = buildDefaultBrief({
      company: { name: "Acme", lifecycleStatus: "prospect" },
      contacts,
      communicationPreset: { contactId: "contact-decideur" },
    }, "Guillaume")

    expect(brief.who.sender.name).toBe("Guillaume")
    expect(brief.who.recipient.contactId).toBe("contact-decideur")
    expect(brief.who.recipient.displayName).toBe("Alice Martin")
    expect(brief.who.recipient.persona).toBe("other")
    expect(brief.who.recipient.relation).toBe("warm")
  })

  it("applies scenario defaults and business references", () => {
    const brief = buildDefaultBrief({
      company: { name: "Acme", lifecycleStatus: "client_actif" },
      contacts,
      communicationPreset: {
        scenario: "profile_submission",
        mustInclude: "Présenter le profil Data Engineer",
        refs: {
          opportunityRef: "opportunity-1",
          profileRef: "candidate-1",
        },
      },
    }, "Guillaume")

    expect(brief.what.channel).toBe("email")
    expect(brief.what.scenario).toBe("profile_submission")
    expect(brief.who.objective).toBe("submit_profile")
    expect(brief.who.recipient.type).toBe("active_client")
    expect(brief.context.mustInclude).toBe("Présenter le profil Data Engineer")
    expect(brief.context.opportunityRef).toBe("opportunity-1")
    expect(brief.context.profileRef).toBe("candidate-1")
  })
})

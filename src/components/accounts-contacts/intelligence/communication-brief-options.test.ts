import { describe, expect, it } from "vitest"
import {
  buildDefaultBrief,
  defaultInternalDomainForRole,
  defaultInternalRelationshipForRole,
  INTERNAL_DOMAIN_OPTIONS,
  INTERNAL_RELATIONSHIP_OPTIONS,
  INTERNAL_ROLE_OPTIONS,
} from "./communication-brief-options"

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
        scenario: "profile_submission_to_client",
        mustInclude: "Présenter le profil Data Engineer",
        refs: {
          opportunityRef: "opportunity-1",
          profileRef: "candidate-1",
        },
      },
    }, "Guillaume")

    expect(brief.what.channel).toBe("email")
    expect(brief.what.scenario).toBe("profile_submission_to_client")
    expect(brief.who.objective).toBe("submit_profile")
    expect(brief.who.recipient.type).toBe("active_client")
    expect(brief.context.mustInclude).toBe("Présenter le profil Data Engineer")
    expect(brief.context.opportunityRef).toBe("opportunity-1")
    expect(brief.context.profileRef).toBe("candidate-1")
  })
})

describe("internal role/relationship/domain taxonomies (Lot 9)", () => {
  it("exposes exactly the nine canonical roles, five relationships and nine domains", () => {
    expect(INTERNAL_ROLE_OPTIONS.map((o) => o.value).sort()).toEqual([
      "delivery_management", "executive_management", "finance_admin", "manager_n1",
      "other", "peer_business_manager", "practice_lead", "presales", "recruitment",
    ].sort())
    expect(INTERNAL_RELATIONSHIP_OPTIONS.map((o) => o.value).sort()).toEqual([
      "cross_functional", "executive_committee", "hierarchical_up", "peer", "team",
    ].sort())
    expect(INTERNAL_DOMAIN_OPTIONS.map((o) => o.value).sort()).toEqual([
      "commercial", "delivery", "finance", "operations", "practice",
      "presales", "recruitment", "staffing", "strategy",
    ].sort())
  })

  it("suggests a sensible default relationship/domain per role without imposing it (command §5)", () => {
    expect(defaultInternalRelationshipForRole("manager_n1")).toBe("hierarchical_up")
    expect(defaultInternalRelationshipForRole("executive_management")).toBe("executive_committee")
    expect(defaultInternalRelationshipForRole("peer_business_manager")).toBe("peer")
    expect(defaultInternalDomainForRole("practice_lead")).toBe("practice")
    expect(defaultInternalDomainForRole("finance_admin")).toBe("finance")
    expect(defaultInternalDomainForRole("recruitment")).toBe("recruitment")
  })
})

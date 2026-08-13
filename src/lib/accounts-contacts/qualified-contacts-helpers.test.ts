import { describe, expect, it } from "vitest"
import {
  deriveContactInterestTopics,
  filterQualifiedContacts,
  groupContactsByDepartment,
  sortQualifiedContacts,
  type DerivedContact,
  type SimpleOffer,
} from "./qualified-contacts-helpers"

const mockContacts: DerivedContact[] = [
  {
    id: "c1",
    personId: "p1",
    companyId: "comp1",
    fullName: "Alice Dupont",
    firstName: "Alice",
    lastName: "Dupont",
    jobTitle: "Directrice IT",
    department: "it",
    relationshipRole: "decideur",
    relationshipLevel: "fort",
    decisionPower: "fort",
    isPriority: true,
    phone: "0601020304",
    email: "alice@test.com",
    linkedinUrl: null,
    hasPhone: true,
    hasActivity: true,
    lastActivityAt: "2026-08-10T10:00:00Z",
    isDecisionMaker: true,
  },
  {
    id: "c2",
    personId: "p2",
    companyId: "comp1",
    fullName: "Bernard Martin",
    firstName: "Bernard",
    lastName: "Martin",
    jobTitle: "Responsable Cybersécurité (RSSI)",
    department: "cybersecurity",
    relationshipRole: "decideur",
    relationshipLevel: "moyen",
    decisionPower: "moyen",
    isPriority: false,
    phone: null,
    email: "bernard@test.com",
    linkedinUrl: null,
    hasPhone: false,
    hasActivity: true,
    lastActivityAt: "2026-08-12T14:00:00Z",
    isDecisionMaker: true,
  },
  {
    id: "c3",
    personId: "p3",
    companyId: "comp1",
    fullName: "Charles Leroy",
    firstName: "Charles",
    lastName: "Leroy",
    jobTitle: "Chef de projet",
    department: "it",
    relationshipRole: "operationnel",
    relationshipLevel: null,
    decisionPower: "faible",
    isPriority: false,
    phone: "0607080910",
    email: null,
    linkedinUrl: null,
    hasPhone: true,
    hasActivity: false,
    lastActivityAt: null,
    isDecisionMaker: false,
  },
]

describe("filterQualifiedContacts", () => {
  it("filters decideurs only", () => {
    const res = filterQualifiedContacts(mockContacts, {
      decideurOnly: true,
      phoneOnly: false,
      activityOnly: false,
    })
    expect(res.map((c) => c.id)).toEqual(["c1", "c2"])
  })

  it("filters contacts with phone only", () => {
    const res = filterQualifiedContacts(mockContacts, {
      decideurOnly: false,
      phoneOnly: true,
      activityOnly: false,
    })
    expect(res.map((c) => c.id)).toEqual(["c1", "c3"])
  })

  it("filters contacts with activity only", () => {
    const res = filterQualifiedContacts(mockContacts, {
      decideurOnly: false,
      phoneOnly: false,
      activityOnly: true,
    })
    expect(res.map((c) => c.id)).toEqual(["c1", "c2"])
  })

  it("combines filters", () => {
    const res = filterQualifiedContacts(mockContacts, {
      decideurOnly: true,
      phoneOnly: true,
      activityOnly: true,
    })
    expect(res.map((c) => c.id)).toEqual(["c1"])
  })
})

describe("sortQualifiedContacts", () => {
  it("sorts by decideurs (default): decideurs first, fort > moyen > faible, then name", () => {
    const res = sortQualifiedContacts(mockContacts, "decideurs")
    expect(res.map((c) => c.id)).toEqual(["c1", "c2", "c3"])
  })

  it("sorts by activite: active first, then most recent lastActivityAt", () => {
    const res = sortQualifiedContacts(mockContacts, "activite")
    expect(res.map((c) => c.id)).toEqual(["c2", "c1", "c3"])
  })

  it("sorts by cibles: isPriority first", () => {
    const res = sortQualifiedContacts(mockContacts, "cibles")
    expect(res[0].id).toBe("c1")
  })

  it("groups by metier", () => {
    const groups = groupContactsByDepartment(mockContacts)
    expect(groups.length).toBeGreaterThan(0)
  })
})

describe("deriveContactInterestTopics", () => {
  const mockOffers: SimpleOffer[] = [
    {
      id: "o1",
      name: "Audit & Socle Cloud Native",
      short_description: "Modernisation des infrastructures",
      keywords: ["cloud", "infrastructure", "devops"],
      typical_profiles: ["Directeur IT", "Cloud Architect", "CTO"],
      use_cases: ["Migration AWS / Azure"],
    },
    {
      id: "o2",
      name: "Accompagnement Cybersécurité & RSSI",
      short_description: "Audit et gouvernance cyber",
      keywords: ["cybersecurity", "cybersécurité", "rssi", "sécurité"],
      typical_profiles: ["RSSI", "Directeur Sécurité"],
      use_cases: ["Conformité NIS2"],
    },
  ]

  it("derives topics based on job title and department", () => {
    const topics = deriveContactInterestTopics(
      { jobTitle: "Directrice IT", department: "it", relationshipRole: "decideur" },
      mockOffers
    )
    expect(topics.length).toBeGreaterThan(0)
    expect(topics[0].offerId).toBe("o1")
  })

  it("returns empty array if no info is provided", () => {
    const topics = deriveContactInterestTopics({}, mockOffers)
    expect(topics).toEqual([])
  })
})

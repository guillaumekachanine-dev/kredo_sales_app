import { describe, expect, it } from "vitest"
import {
  mapAccountContextToFacts,
  mapCollaboratorContextToFacts,
  mapInternalContextToFacts,
} from "./communication-context-mappers"

describe("communication context mappers", () => {
  it("maps account context without mixing CRM lifecycle, mission status and candidate state", () => {
    const mapped = mapAccountContextToFacts({
      company: { id: "company-1", lifecycle_status: "client_actif" },
      contact: { id: "contact-1", relationship_role: "DSI" },
      activeOpportunities: [{ id: "opportunity-1", stage: "qualification" }],
      activeMissions: [{ id: "mission-1", status: "active" }],
      recentInteractions: [{ id: "interaction-1" }],
      sectorNews: [{ title: "News" }],
      sectorIntelligence: { name: "Banque" },
    }, {
      offer: { id: "offer-1" },
    }, {
      candidateId: "candidate-1",
      offerId: "offer-1",
    })

    expect(mapped.facts).toMatchObject({
      scope: "account",
      recipientType: "active_client",
      accountLifecycle: "client_actif",
      hasCompany: true,
      hasContact: true,
      hasOpportunity: true,
      hasMission: true,
      hasCandidate: true,
      hasOffer: true,
      opportunityStatus: "qualification",
      missionStatus: "active",
    })
    expect(mapped.facts).not.toHaveProperty("collaboratorStatus")
    expect(mapped.sourceAvailability).toMatchObject({
      company: true,
      contact: true,
      opportunity: true,
      mission: true,
      candidate: true,
      offer: true,
      interactions: true,
      news: true,
      sector_analysis: true,
      documents: false,
    })
  })

  it("maps absent account references as false without inventing facts", () => {
    const mapped = mapAccountContextToFacts({ company: null, activeOpportunities: [], activeMissions: [] })

    expect(mapped.facts).toMatchObject({
      scope: "account",
      hasCompany: false,
      hasContact: false,
      hasOpportunity: false,
      hasMission: false,
      hasCandidate: false,
      hasOffer: false,
    })
    expect(mapped.facts.accountLifecycle).toBeUndefined()
    expect(Object.values(mapped.sourceAvailability).some(Boolean)).toBe(false)
  })

  it("maps collaborator context from reliable collaborator RPC facts", () => {
    const mapped = mapCollaboratorContextToFacts({
      collaborator: {
        id: "collaborator-1",
        status: "active",
        availability: "available",
        practice: "Data",
        seniority: "senior",
      },
      managerProfile: { id: "profile-1" },
      currentMission: { id: "mission-1", status: "active" },
      recentMissions: [],
      jobProfile: { id: "job-1" },
      skills: [{ name: "SQL" }],
      recentActivity: [{ id: "activity-1" }],
      recentAbsences: [],
    })

    expect(mapped.facts).toMatchObject({
      scope: "collaborator",
      recipientType: "collaborator",
      hasCollaborator: true,
      hasMission: true,
      collaboratorStatus: "active",
      collaboratorAvailability: "available",
      collaboratorPractice: "Data",
      collaboratorSeniority: "senior",
      hasManagerProfile: true,
      hasJobProfile: true,
      hasSkills: true,
    })
    expect(mapped.sourceAvailability).toMatchObject({
      collaborator: true,
      mission: true,
      agenda: true,
    })
    expect(mapped.facts.accountLifecycle).toBeUndefined()
  })

  it("maps internal dimensions only from explicit Staff inputs", () => {
    const mapped = mapInternalContextToFacts({
      internalRole: "presales",
      internalRelationship: "cross_functional",
      internalDomain: "presales",
    })

    expect(mapped.facts).toEqual({
      scope: "internal",
      recipientType: "internal",
      internalRole: "presales",
      internalRelationship: "cross_functional",
      internalDomain: "presales",
    })
    expect(Object.values(mapped.sourceAvailability).some(Boolean)).toBe(false)
  })
})

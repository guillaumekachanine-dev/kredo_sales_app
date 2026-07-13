import { describe, expect, it } from "vitest"
import type { CommunicationBrief, MeetingBriefingOutput, SpokenPitchOutput } from "@/lib/n8n/types"
import {
  buildCommunicationDocumentTitle,
  buildDocumentEntities,
  buildDocumentScopeJson,
  buildResultContentText,
  buildResultPresentationFromBrief,
  buildResultPresentationModel,
  mapResultTypeToDocumentType,
} from "./communication-result-documents"

type BriefOverrides = Omit<Partial<CommunicationBrief>, "context" | "how" | "what" | "who"> & {
  context?: Partial<CommunicationBrief["context"]>
  how?: Partial<CommunicationBrief["how"]>
  what?: Partial<CommunicationBrief["what"]>
  who?: Omit<Partial<CommunicationBrief["who"]>, "recipient" | "sender"> & {
    recipient?: Partial<CommunicationBrief["who"]["recipient"]>
    sender?: Partial<CommunicationBrief["who"]["sender"]>
  }
}

function brief(overrides: BriefOverrides = {}): CommunicationBrief {
  const base: CommunicationBrief = {
    what: {
      channel: "email",
      scenario: "mission_follow_up" as CommunicationBrief["what"]["scenario"],
      outputKind: "written_message",
      length: "standard",
      activityCategory: "delivery",
      scope: "account",
    },
    who: {
      sender: { role: "business_manager", name: "Guillaume" },
      recipient: { type: "active_client", persona: "other", relation: "warm", contactId: "contact-1" },
      objective: "confirm_next_steps",
    },
    how: { tone: "direct", formality: "vous", language: "fr" },
    context: {
      companyRef: "company-1",
      missionRef: "mission-1",
      opportunityRef: "opportunity-1",
      profileRef: "candidate-1",
      offerRef: "offer-1",
    },
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

describe("communication result document mapping", () => {
  it("maps prise_de_parole to a document type and keeps legacy pitch aliases", () => {
    expect(mapResultTypeToDocumentType("communication")).toBe("communication")
    expect(mapResultTypeToDocumentType("commercial_pitch")).toBe("commercial_pitch")
    expect(mapResultTypeToDocumentType("prise_de_parole")).toBe("prise_de_parole")
    expect(mapResultTypeToDocumentType("pitch")).toBe("commercial_pitch")
    expect(mapResultTypeToDocumentType("workspace_diagnostic")).toBe("workspace_diagnostic")
    expect(mapResultTypeToDocumentType("unknown")).toBeNull()
  })
})

describe("communication result presentation", () => {
  it("exposes exact spoken duration labels", () => {
    expect(buildResultPresentationModel({ outputKind: "spoken_pitch", length: "ultra_short" }).headingLabel).toBe("Pitch oral · 30 s")
    expect(buildResultPresentationModel({ outputKind: "spoken_pitch", length: "concise" }).headingLabel).toBe("Pitch oral · 1 min")
    expect(buildResultPresentationModel({ outputKind: "spoken_pitch", length: "standard" }).headingLabel).toBe("Pitch oral · 2 min")
    expect(buildResultPresentationModel({ outputKind: "spoken_pitch", length: "detailed" }).headingLabel).toBe("Pitch oral · 5 min")
  })

  it("switches labels for commercial, management and Staff contexts", () => {
    const commercial = buildResultPresentationModel({
      outputKind: "structured_briefing",
      activityCategory: "commerce_actif",
      scope: "account",
    })
    expect(commercial.briefingObjectiveLabel).toBe("Objectif du rendez-vous")
    expect(commercial.briefingCrossSellLabel).toBe("Cross-sell possible")
    expect(commercial.briefingDataPointsLabel).toBe("Chiffres à citer")

    const management = buildResultPresentationModel({
      outputKind: "structured_briefing",
      activityCategory: "management_consultants",
      scope: "collaborator",
    })
    expect(management.briefingObjectiveLabel).toBe("Objectif de l’entretien")
    expect(management.briefingDataPointsLabel).toBe("Faits à mobiliser")

    const staff = buildResultPresentationModel({
      outputKind: "spoken_pitch",
      activityCategory: "internal_staff",
      scope: "internal",
    })
    expect(staff.headingLabel).toBe("Prise de parole · 2 min")
    expect(staff.spokenCentralLabel).toBe("Message à faire passer")
  })
})

describe("communication document scope and entities", () => {
  it("extracts canonical scope from input_snapshot.what.scope", () => {
    const scopeJson = buildDocumentScopeJson(brief({
      what: {
        scope: "collaborator",
        activityCategory: "management_consultants",
        outputKind: "structured_briefing",
        scenario: "retention_conversation_briefing" as CommunicationBrief["what"]["scenario"],
      },
      who: {
        recipient: {
          type: "collaborator",
          collaboratorId: "collab-1",
          internalRole: undefined,
        },
      },
      context: { collaboratorRef: "collab-1", missionRef: "mission-1" },
    }))

    expect(scopeJson).toMatchObject({
      scope: "collaborator",
      outputKind: "structured_briefing",
      activityCategory: "management_consultants",
      references: { collaboratorRef: "collab-1", missionRef: "mission-1" },
    })
  })

  it("preserves legacy input_snapshot.scope objects", () => {
    expect(buildDocumentScopeJson({ scope: { companyIds: ["company-1"] } })).toEqual({ companyIds: ["company-1"] })
  })

  it("builds Account links without unsupported offer links", () => {
    const entities = buildDocumentEntities({
      inputSnapshot: brief(),
      companyId: "company-1",
      runPrimaryEntityType: "company",
      runPrimaryEntityId: "company-1",
    })

    expect(entities.primaryEntity).toEqual({ entityType: "company", entityId: "company-1" })
    expect(entities.links).toEqual([
      { entityType: "company", entityId: "company-1" },
      { entityType: "contact", entityId: "contact-1" },
      { entityType: "opportunity", entityId: "opportunity-1" },
      { entityType: "mission", entityId: "mission-1" },
      { entityType: "candidate", entityId: "candidate-1" },
    ])
  })

  it("keeps a Collaborator document primary without an account", () => {
    const entities = buildDocumentEntities({
      inputSnapshot: brief({
        what: { scope: "collaborator", activityCategory: "management_consultants" },
        who: { recipient: { type: "collaborator", contactId: undefined, collaboratorId: "collab-1" } },
        context: {
          companyRef: undefined,
          collaboratorRef: "collab-1",
          missionRef: "mission-1",
          opportunityRef: undefined,
          profileRef: undefined,
          offerRef: undefined,
        },
      }),
      companyId: null,
      runPrimaryEntityType: "collaborator",
      runPrimaryEntityId: "collab-1",
    })

    expect(entities.primaryEntity).toEqual({ entityType: "collaborator", entityId: "collab-1" })
    expect(entities.links).toEqual([
      { entityType: "collaborator", entityId: "collab-1" },
      { entityType: "mission", entityId: "mission-1" },
    ])
  })

  it("keeps an Internal document saveable without an account or primary entity", () => {
    const entities = buildDocumentEntities({
      inputSnapshot: brief({
        what: { scope: "internal", activityCategory: "internal_staff" },
        who: { recipient: { type: "internal", contactId: undefined, internalRole: "manager_n1" } },
        context: {
          companyRef: "company-optional",
          missionRef: undefined,
          opportunityRef: undefined,
          profileRef: undefined,
          offerRef: undefined,
        },
      }),
      companyId: null,
      runPrimaryEntityType: "workspace",
      runPrimaryEntityId: "workspace-1",
    })

    expect(entities.primaryEntity).toBeNull()
    expect(entities.links).toEqual([{ entityType: "company", entityId: "company-optional" }])
  })
})

describe("communication document titles and text", () => {
  it("builds contextual titles for written, spoken and briefing outputs", () => {
    expect(buildCommunicationDocumentTitle({
      documentType: "communication",
      inputSnapshot: brief({ what: { outputKind: "written_message", scenario: "mission_follow_up" as CommunicationBrief["what"]["scenario"] } }),
    })).toBe("Message — Suivi de mission")

    expect(buildCommunicationDocumentTitle({
      documentType: "prise_de_parole",
      inputSnapshot: brief({
        what: {
          outputKind: "spoken_pitch",
          activityCategory: "internal_staff",
          scope: "internal",
          scenario: "resource_arbitrage_pitch" as CommunicationBrief["what"]["scenario"],
        },
      }),
    })).toBe("Prise de parole — Arbitrage de ressources")

    expect(buildCommunicationDocumentTitle({
      documentType: "prise_de_parole",
      inputSnapshot: brief({
        what: {
          outputKind: "structured_briefing",
          activityCategory: "management_consultants",
          scope: "collaborator",
          scenario: "retention_conversation_briefing" as CommunicationBrief["what"]["scenario"],
        },
      }),
    })).toBe("Briefing — Entretien de rétention")
  })

  it("builds text from written message, spoken pitch and structured briefing", () => {
    const writtenText = buildResultContentText({
      subjects: ["Suivi de mission"],
      body: "Bonjour, voici le suivi.",
      key_points: ["Point A"],
      source_refs: [],
      warnings: [],
    }, null, buildResultPresentationFromBrief(brief()))
    expect(writtenText).toContain("Objet : Suivi de mission")
    expect(writtenText).toContain("Bonjour, voici le suivi.")

    const spoken: SpokenPitchOutput = {
      kind: "spoken_pitch",
      hook: "Accroche",
      problem_recognition: "Diagnostic",
      offer_link: "Message central",
      ask: "Demande",
      alt_close: "Repli",
      word_count: 85,
      tone_notes: [],
      source_refs: [],
      warnings: [],
    }
    const staffPresentation = buildResultPresentationModel({
      outputKind: "spoken_pitch",
      activityCategory: "internal_staff",
      scope: "internal",
    })
    expect(buildResultContentText(spoken, null, staffPresentation)).toContain("Message à faire passer : Message central")

    const briefing: MeetingBriefingOutput = {
      kind: "meeting_briefing",
      objective: "Rendre l'arbitrage clair",
      key_message: "Prioriser le staffing",
      arguments: [{ title: "Charge", evidence: "Deux missions critiques" }],
      expected_objections: [{ objection: "Pas de marge", response: "Reprioriser" }],
      cross_sell_hypotheses: [],
      data_points_to_mention: ["Deux missions"],
      close_options: ["Décision cette semaine"],
      do_not_say: [],
      source_refs: [],
      warnings: [],
    }
    const briefingText = buildResultContentText(briefing, null, staffPresentation)
    expect(briefingText).toContain("Faits à mobiliser")
    expect(briefingText).toContain("Issues et prochaines étapes")
  })
})

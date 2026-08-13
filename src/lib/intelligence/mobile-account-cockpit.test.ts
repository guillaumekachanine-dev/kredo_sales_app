import { describe, expect, it } from "vitest"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import { buildMobileAccountCockpit } from "@/lib/intelligence/mobile-account-cockpit"

function voyagePriveFixture(): ClientIntelligenceData {
  return {
    company: {
      id: "voyage-prive",
      name: "Voyage Privé",
      lifecycleStatus: "client",
    },
    contacts: [{ id: "pascal", fullName: "Pascal PEREGRINA" }],
    opportunities: [{
      id: "booking",
      title: "Renfort équipe Booking",
      stage: "contractualisation",
      opportunityType: "staffing",
      estimatedGain: 55_000,
      weightedGain: 44_000,
      nextActionLabel: "Formaliser l accord de principe",
      nextActionAt: "2026-08-12T10:00:00.000Z",
      targetCloseDate: "2026-08-28",
      closedAt: null,
    }],
    missions: Array.from({ length: 8 }, (_, index) => ({
      id: `mission-${index}`,
      title: index === 0 ? "Mission Java" : `Mission ${index + 1}`,
      roleTitle: null,
      practice: null,
      status: "active",
      startDate: "2026-01-01",
      endDate: index === 0 ? "2026-09-10" : "2026-12-31",
      grossMarginPct: null,
    })),
    commercialTimeline: [
      {
        id: "copil",
        source: "calendar_event",
        nature: "meeting",
        title: "COPIL mission – Lead Backend Booking",
        summary: null,
        occurredAt: "2026-08-17T12:00:00.000Z",
        contactName: "Nathalie MARSAN",
        status: "confirmed",
      },
      {
        id: "consultant-follow-up",
        source: "calendar_event",
        nature: "meeting",
        title: "Suivi consultant",
        summary: null,
        occurredAt: "2026-08-19T09:30:00.000Z",
        contactName: null,
        status: "confirmed",
      },
    ],
    veilleArticles: [],
    accountSignals: [{
      id: "cyber",
      category: "cybersecurity",
      type: "incident",
      title: "Une cyberattaque frappe Voyage Privé : les données volées sont déjà exploitées dans des arnaques - 01net.com",
      summary: "Données volées chez Voyage Privé déjà exploitées dans des arnaques.",
      detectedAt: "2026-07-09T09:00:00.000Z",
      expiresAt: "2026-09-07T00:00:00.000Z",
      publishedAt: "2026-02-17T00:00:00.000Z",
      globalScore: 0.658,
      interestScore: 0.8,
      urgencyScore: 0.7,
      confidenceScore: 0.9,
      status: "new",
      primarySourceId: "source-cyber",
      recommendedAction: "Partager un retour d'expérience cybersécurité.",
      recommendedPracticeId: null,
      primarySource: { id: "source-cyber", source_name: "Google News", source_url: null },
    }],
    accountIssues: [{
      id: "java-renewal",
      title: "Reconduction de la mission Java",
      category: "delivery",
      problemStatement: "La mission Java doit être reconduite.",
      evidenceLevel: "confirmed",
      provenance: "relational",
      importance: 5,
      urgency: 5,
      criticality: 5,
      businessImpact: 5,
      accessibility: 4,
      kredoFit: 5,
      contactIds: ["pascal"],
      recommendedNextProbe: "La reconduction Java est-elle validée ?",
      status: "open",
      createdAt: "2026-08-01T00:00:00.000Z",
    }],
    sectorSnapshot: null,
  } as unknown as ClientIntelligenceData
}

describe("buildMobileAccountCockpit", () => {
  it("construit le brief éditorial Voyage Privé à partir des données existantes", () => {
    const cockpit = buildMobileAccountCockpit(
      voyagePriveFixture(),
      new Date("2026-08-13T10:00:00.000Z"),
    )

    expect(cockpit.stateLabel).toBe("Client actif")
    expect(cockpit.accountSummary).toBe("8 missions · 1 opportunité · COPIL lundi")
    expect(cockpit.nowAction.title).toBe("Préparer le COPIL avec Nathalie Marsan")
    expect(cockpit.nowAction.meta).toBe("Lun. 17 août · 14:00")
    expect(cockpit.nowAction).toMatchObject({ eventId: "copil", eventStartsAt: "2026-08-17T12:00:00.000Z" })
    expect(cockpit.actuality.title).toContain("cyberattaque frappe Voyage Privé")
    expect(cockpit.actuality.meta).toBe("9 juil · 01net")
    expect(cockpit.opportunityWindow.title).toBe("Renfort équipe Booking · 55 k€")
    expect(cockpit.opportunityWindow.context).toBe("L'accord de principe à formaliser.")
    expect(cockpit.developmentAction.title).toBe("Recontacter Pascal Peregrina")
    expect(cockpit.developmentAction.context).toBe("Qualifier la reconduction Java.")
    expect(cockpit.upcoming.map((item) => [item.label, item.timing])).toEqual([
      ["COPIL mission", "Lun. 14:00"],
      ["Suivi consultant", "Mer. 11:30"],
      ["Action Booking", "En retard"],
    ])
  })

  it("garde des états vides actionnables pour un compte pauvre en données", () => {
    const fixture = voyagePriveFixture()
    fixture.contacts = []
    fixture.opportunities = []
    fixture.missions = []
    fixture.commercialTimeline = []
    fixture.accountSignals = []
    fixture.accountIssues = []

    const cockpit = buildMobileAccountCockpit(fixture, new Date("2026-08-13T10:00:00.000Z"))

    expect(cockpit.nowAction.title).toBe("Définir la prochaine action commerciale")
    expect(cockpit.actuality.title).toBe("Aucune actualité exploitable détectée")
    expect(cockpit.opportunityWindow.title).toBe("Aucune fenêtre commerciale qualifiée")
    expect(cockpit.developmentAction.title).toBe("Identifier un interlocuteur clé")
    expect(cockpit.upcoming).toEqual([])
  })

  it("fait remonter une mission proche de sa fin quand le compte n'a pas d'opportunité", () => {
    const fixture = voyagePriveFixture()
    fixture.opportunities = []
    fixture.commercialTimeline = []
    fixture.missions = [
      { ...fixture.missions[0], endDate: "2026-08-30" },
    ]

    const cockpit = buildMobileAccountCockpit(fixture, new Date("2026-08-13T10:00:00.000Z"))

    expect(cockpit.opportunityWindow.title).toBe("Mission Java se termine dans 17 jours")
    expect(cockpit.opportunityWindow.context).toBe("Renouvellement non identifié.")
    expect(cockpit.upcoming[0]).toMatchObject({ label: "Fin Mission Java", timing: "Dans 17 j" })
  })

  it("préfère un article de veille lié et exploitable au fallback signal", () => {
    const fixture = voyagePriveFixture()
    fixture.veilleArticles = [{
      id: "article-direct",
      title: "Voyage Privé accélère son programme cyber",
      summary: "Le groupe renforce sa résilience.",
      commercialAction: "Proposer un échange sur la résilience.",
      sourceName: "01net",
      sourceUrl: "https://example.com/article",
      publishedAt: "2026-08-12T08:00:00.000Z",
      createdAt: "2026-08-12T09:00:00.000Z",
    }]

    const cockpit = buildMobileAccountCockpit(fixture, new Date("2026-08-13T10:00:00.000Z"))

    expect(cockpit.actuality.id).toBe("article:article-direct")
    expect(cockpit.actuality.title).toBe("Voyage Privé accélère son programme cyber")
    expect(cockpit.actuality.meta).toBe("12 août · 01net")
  })
})

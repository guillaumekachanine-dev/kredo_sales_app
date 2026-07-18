import { describe, expect, it } from "vitest"
import {
  getInitialAccountSignals,
  hasVisibleOpenQuestions,
  normalizeOperationalDepartments,
  normalizeOperationalStakeholders,
  normalizeOperationalWorkload,
  resolveContactOfferSuggestion,
  sortCompanyContacts,
  type ContactOfferCandidate,
} from "./client-intelligence-company"

describe("normalisation des activités opérationnelles", () => {
  it("normalise le format direction → tableau d'activités", () => {
    const departments = normalizeOperationalDepartments({
      direction_financiere: [{
        ref: "D1",
        activite: "Consolidation et clôture",
        pct_temps: "25-30%",
        description: "Clôtures multi-entités.",
      }],
    })

    expect(departments).toEqual([{
      id: "direction-financiere",
      label: "Direction financiere",
      description: null,
      activities: [{
        code: "D1",
        label: "Consolidation et clôture",
        description: "Clôtures multi-entités.",
        workloadLabel: "25-30%",
      }],
    }])
  })

  it("normalise le format direction → description + activites", () => {
    const departments = normalizeOperationalDepartments({
      "R&D et Création": {
        description: "17 centres de création.",
        activites: [{ code: "R1", label: "Formulation", part_temps: "30-35%" }],
      },
    })

    expect(departments[0]).toMatchObject({
      id: "r-d-et-creation",
      label: "R&D et Création",
      description: "17 centres de création.",
      activities: [{ code: "R1", label: "Formulation", workloadLabel: "30-35%" }],
    })
  })
})

describe("normalisation du diagnostic partiel", () => {
  it("retourne une cartographie vide lorsque les interlocuteurs sont absents", () => {
    expect(normalizeOperationalStakeholders(undefined)).toEqual([])
    expect(normalizeOperationalStakeholders(null)).toEqual([])
  })

  it("détecte les catégories variables de répartition sans convertir une plage en valeur exacte", () => {
    const workload = normalizeOperationalWorkload({
      constat_cle: "La conformité concentre la charge.",
      par_fonction: [{
        fonction: "R&D",
        coeur_metier: "Création (45%)",
        coordination: "Évaluation (20%)",
        qualite_conformite: "Réglementaire (25-30%)",
      }],
    })

    expect(workload.functions[0].segments.map((segment) => segment.category)).toEqual([
      "coeur_metier",
      "coordination",
      "qualite_conformite",
    ])
    expect(workload.functions[0].segments[0]).toMatchObject({ percentageLabel: "45%", percentageValue: 45 })
    expect(workload.functions[0].segments[2]).toMatchObject({ percentageLabel: "25-30%", percentageValue: null })
    expect(workload.primaryFinding).toBe("La conformité concentre la charge.")
  })
})

describe("contacts prioritaires", () => {
  it("trie priorité, décideur, prescripteur, acheteur, autres, puis nom", () => {
    const contacts = sortCompanyContacts([
      { fullName: "Zoé Autre", relationshipRole: null },
      { fullName: "Alice Acheteur", relationshipRole: "acheteur" },
      { fullName: "Paul Prescripteur", relationshipRole: "prescripteur" },
      { fullName: "Daniel Décideur", relationshipRole: "decideur" },
      { fullName: "Béatrice Prioritaire", relationshipRole: null, isPriority: true },
    ])

    expect(contacts.map((contact) => contact.fullName)).toEqual([
      "Béatrice Prioritaire",
      "Daniel Décideur",
      "Paul Prescripteur",
      "Alice Acheteur",
      "Zoé Autre",
    ])
  })
})

describe("suggestion déterministe contact → offre", () => {
  const offers: ContactOfferCandidate[] = [
    {
      id: "offer-portals",
      name: "Custom Business Applications & B2B Portals",
      practiceName: "Digital Business Solutions",
      keywords: ["business application", "b2b portal", "custom software"],
      typicalProfiles: ["Solution Architect"],
      shortDescription: "Applications métier et portails partenaires.",
    },
    {
      id: "offer-data",
      name: "Data & AI Strategy, Governance & Responsible AI",
      practiceName: "Data & AI",
      keywords: ["data strategy", "ai strategy"],
      typicalProfiles: ["Data Architect"],
      shortDescription: "Gouvernance Data et IA.",
    },
    {
      id: "offer-cloud",
      name: "Cloud Strategy, Assessment & Landing Zones",
      practiceName: "Cloud Engineering",
      keywords: ["cloud strategy", "assessment", "landing zones"],
      typicalProfiles: ["Infrastructure Manager"],
      shortDescription: "Stratégie cloud et trajectoire d'infrastructure.",
    },
    {
      id: "offer-cyber",
      name: "Cyber Strategy, GRC & Compliance",
      practiceName: "Cybersecurity",
      keywords: ["cyber strategy", "grc", "compliance"],
      typicalProfiles: ["CISO", "RSSI"],
      shortDescription: "Stratégie cyber, risques et conformité.",
    },
    {
      id: "offer-ux",
      name: "UX Research & Service Design",
      practiceName: "Digital Experience",
      keywords: ["ux research", "service design"],
      typicalProfiles: ["UX Lead"],
      shortDescription: "Recherche utilisateur et design de services.",
    },
    {
      id: "offer-quality",
      name: "Quality Strategy & Test Governance",
      practiceName: "Quality Engineering",
      keywords: ["quality strategy", "test governance"],
      typicalProfiles: ["Quality Director"],
      shortDescription: "Stratégie qualité et gouvernance de test.",
    },
  ]

  it("suggère l'offre applicative attendue à un Directeur Digital", () => {
    expect(resolveContactOfferSuggestion({ jobTitle: "Directeur Digital", department: "Digital" }, offers)).toEqual({
      offerId: "offer-portals",
      offerName: "Custom Business Applications & B2B Portals",
    })
  })

  it("retourne null lorsque le rapprochement n'est pas fiable", () => {
    expect(resolveContactOfferSuggestion({ jobTitle: "Directeur Général", department: "Direction" }, offers)).toBeNull()
  })

  it("ne confond pas réseaux avec UX et suggère le cloud à un administrateur systèmes", () => {
    expect(resolveContactOfferSuggestion({ jobTitle: "Administrateur Réseaux et Systèmes", department: null }, offers)).toEqual({
      offerId: "offer-cloud",
      offerName: "Cloud Strategy, Assessment & Landing Zones",
    })
  })

  it("reconnaît le sigle RSSI comme un profil cyber", () => {
    expect(resolveContactOfferSuggestion({ jobTitle: "RSSI", department: null }, offers)).toEqual({
      offerId: "offer-cyber",
      offerName: "Cyber Strategy, GRC & Compliance",
    })
  })

  it("privilégie la cyber lorsque le titre CTO mentionne explicitement la sécurité", () => {
    expect(resolveContactOfferSuggestion({ jobTitle: "Group CTO & Security", department: null }, offers)).toEqual({
      offerId: "offer-cyber",
      offerName: "Cyber Strategy, GRC & Compliance",
    })
  })

  it("classe un ingénieur software design dans l'applicatif, pas dans l'UX", () => {
    expect(resolveContactOfferSuggestion({ jobTitle: "Senior Software Design Engineer", department: null }, offers)).toEqual({
      offerId: "offer-portals",
      offerName: "Custom Business Applications & B2B Portals",
    })
  })

  it("reconnaît la variante anglaise cybersecurity", () => {
    expect(resolveContactOfferSuggestion({ jobTitle: "CYBERSECURITY AND NETWORK ARCHITECTURE MANAGER", department: null }, offers)).toEqual({
      offerId: "offer-cyber",
      offerName: "Cyber Strategy, GRC & Compliance",
    })
  })

  it("privilégie la qualité au terme générique software", () => {
    expect(resolveContactOfferSuggestion({ jobTitle: "Software And Firmware Quality Director", department: null }, offers)).toEqual({
      offerId: "offer-quality",
      offerName: "Quality Strategy & Test Governance",
    })
  })
})

describe("visibilité conditionnelle", () => {
  it("n'affiche les hypothèses que si une question non écartée existe", () => {
    expect(hasVisibleOpenQuestions([{ text: "Question", provenance: "inferred", dismissed: true }])).toBe(false)
    expect(hasVisibleOpenQuestions([
      { text: "Question écartée", provenance: "inferred", dismissed: true },
      { text: "Question visible", provenance: "inferred" },
    ])).toBe(true)
  })

  it("limite les signaux initiaux aux cinq plus récents", () => {
    const signals = Array.from({ length: 8 }, (_, index) => ({
      id: `signal-${index}`,
      detectedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    }))

    expect(getInitialAccountSignals(signals).map((signal) => signal.id)).toEqual([
      "signal-7",
      "signal-6",
      "signal-5",
      "signal-4",
      "signal-3",
    ])
  })
})

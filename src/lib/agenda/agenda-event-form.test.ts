import { describe, expect, it } from "vitest"

import { AGENDA_EVENT_TYPE_KEYS } from "@/lib/agenda/agenda-config"
import {
  buildContextPayloadFields,
  collectContextErrors,
  getContextRule,
  pruneContextValues,
  validateAgendaEventForm,
  type AgendaEventContextValues,
  type AgendaEventFormValues,
} from "@/lib/agenda/agenda-event-form"

const EMPTY_CONTEXT: AgendaEventContextValues = {
  company: null,
  contact_id: "",
  opportunity_id: "",
  candidate_id: "",
  collaborator_id: "",
  mission_id: "",
}

function makeForm(overrides: Partial<AgendaEventFormValues> = {}): AgendaEventFormValues {
  return {
    ...EMPTY_CONTEXT,
    title: "Point hebdo",
    event_type: "rdv_client_suivi",
    date: "2026-09-10",
    start_time: "09:00",
    end_time: "10:00",
    create_task: false,
    task_title: "",
    task_date: "",
    task_time: "08:30",
    ...overrides,
  }
}

describe("getContextRule — matrice des 16 scénarios", () => {
  const EXPECTED: Record<string, string[]> = {
    rdv_prospection: ["company", "contact"],
    appel_qualification: ["company", "contact"],
    appel_prospection: ["company", "contact"],
    mailing_prospection: ["company", "contact"],
    rdv_client_suivi: ["company", "contact"],
    soutenance: ["company", "contact"],
    atelier_client: ["company", "contact"],
    suivi_mission_client: ["company", "contact"],
    entretien_candidat: ["opportunity", "candidate"],
    preparation_candidat: ["opportunity", "candidate"],
    sourcing_candidats: ["opportunity", "candidate"],
    suivi_mission_collab: ["mission", "collaborator"],
    ead_collab: ["mission", "collaborator"],
    entretien_rh: ["mission", "collaborator"],
    preparation_collab: ["mission", "collaborator"],
    presentation_rt: [],
  }

  it("couvre exactement les 16 event_type de AGENDA_EVENT_TYPES", () => {
    expect(new Set(AGENDA_EVENT_TYPE_KEYS)).toEqual(new Set(Object.keys(EXPECTED)))
    expect(AGENDA_EVENT_TYPE_KEYS).toHaveLength(16)
  })

  for (const [eventType, fields] of Object.entries(EXPECTED)) {
    it(`${eventType} → [${fields.join(", ") || "aucun"}]`, () => {
      expect(getContextRule(eventType).fields).toEqual(fields)
    })
  }

  it("seul management impose un champ contextuel obligatoire (collaborator)", () => {
    const MANAGEMENT = new Set([
      "suivi_mission_collab",
      "ead_collab",
      "entretien_rh",
      "preparation_collab",
    ])
    for (const eventType of AGENDA_EVENT_TYPE_KEYS) {
      expect(getContextRule(eventType).requiredFields).toEqual(
        MANAGEMENT.has(eventType) ? ["collaborator"] : [],
      )
    }
  })

  it("event_type vide ou inconnu → aucun contexte", () => {
    expect(getContextRule("")).toEqual({ fields: [], requiredFields: [] })
    expect(getContextRule(null)).toEqual({ fields: [], requiredFields: [] })
    expect(getContextRule("type_inconnu")).toEqual({ fields: [], requiredFields: [] })
  })
})

describe("pruneContextValues — nettoyage au changement de nature", () => {
  it("conserve company + contact entre deux scénarios commerciaux", () => {
    const values: AgendaEventContextValues = {
      ...EMPTY_CONTEXT,
      company: { id: "c1" },
      contact_id: "ct1",
    }
    expect(pruneContextValues("rdv_client_suivi", values)).toBe(values)
  })

  it("preparation_candidat → rdv_client_suivi efface candidat + besoin", () => {
    const values: AgendaEventContextValues = {
      ...EMPTY_CONTEXT,
      opportunity_id: "o1",
      candidate_id: "cand1",
    }
    const next = pruneContextValues("rdv_client_suivi", values)
    expect(next.opportunity_id).toBe("")
    expect(next.candidate_id).toBe("")
  })

  it("commerce → management efface company/contact et laisse collaborator/mission vides", () => {
    const values: AgendaEventContextValues = {
      ...EMPTY_CONTEXT,
      company: { id: "c1" },
      contact_id: "ct1",
    }
    const next = pruneContextValues("suivi_mission_collab", values)
    expect(next.company).toBeNull()
    expect(next.contact_id).toBe("")
  })

  it("passage à interne efface tout le contexte", () => {
    const values: AgendaEventContextValues = {
      company: { id: "c1" },
      contact_id: "ct1",
      opportunity_id: "o1",
      candidate_id: "cand1",
      collaborator_id: "col1",
      mission_id: "m1",
    }
    expect(pruneContextValues("presentation_rt", values)).toEqual(EMPTY_CONTEXT)
  })

  it("retourne la même référence quand rien ne change", () => {
    expect(pruneContextValues("presentation_rt", EMPTY_CONTEXT)).toBe(EMPTY_CONTEXT)
  })
})

describe("buildContextPayloadFields — aucune donnée hors scénario", () => {
  const opportunities = [{ id: "o1", company_id: "derived-co" }]

  it("commerce : company/contact envoyés, le reste à null", () => {
    const payload = buildContextPayloadFields(
      "rdv_client_suivi",
      {
        company_id: "c1",
        contact_id: "ct1",
        opportunity_id: "o1",
        candidate_id: "cand1",
        collaborator_id: "col1",
        mission_id: "m1",
      },
      opportunities,
    )
    expect(payload).toEqual({
      company_id: "c1",
      contact_id: "ct1",
      opportunity_id: null,
      candidate_id: null,
      collaborator_id: null,
      mission_id: null,
    })
  })

  it("recrutement : company_id dérivé de l'opportunité, contact ignoré", () => {
    const payload = buildContextPayloadFields(
      "preparation_candidat",
      {
        company_id: "should-be-ignored",
        contact_id: "ct1",
        opportunity_id: "o1",
        candidate_id: "cand1",
        collaborator_id: "",
        mission_id: "",
      },
      opportunities,
    )
    expect(payload.company_id).toBe("derived-co")
    expect(payload.contact_id).toBeNull()
    expect(payload.opportunity_id).toBe("o1")
    expect(payload.candidate_id).toBe("cand1")
  })

  it("management : collaborator/mission envoyés, contexte CRM à null", () => {
    const payload = buildContextPayloadFields(
      "ead_collab",
      {
        company_id: "c1",
        contact_id: "ct1",
        opportunity_id: "o1",
        candidate_id: "cand1",
        collaborator_id: "col1",
        mission_id: "m1",
      },
      opportunities,
    )
    expect(payload).toEqual({
      company_id: null,
      contact_id: null,
      opportunity_id: null,
      candidate_id: null,
      collaborator_id: "col1",
      mission_id: "m1",
    })
  })

  it("interne : tout à null", () => {
    const payload = buildContextPayloadFields(
      "presentation_rt",
      {
        company_id: "c1",
        contact_id: "ct1",
        opportunity_id: "o1",
        candidate_id: "cand1",
        collaborator_id: "col1",
        mission_id: "m1",
      },
      opportunities,
    )
    expect(Object.values(payload).every((v) => v === null)).toBe(true)
  })
})

describe("validateAgendaEventForm", () => {
  it("valide un formulaire commercial minimal", () => {
    expect(validateAgendaEventForm(makeForm())).toEqual({})
  })

  it("nature obligatoire", () => {
    expect(validateAgendaEventForm(makeForm({ event_type: "" })).event_type).toBeDefined()
  })

  it("titre, date, horaires obligatoires", () => {
    const errors = validateAgendaEventForm(
      makeForm({ title: "  ", date: "", start_time: "", end_time: "" }),
    )
    expect(errors.title).toBeDefined()
    expect(errors.date).toBeDefined()
    expect(errors.start_time).toBeDefined()
    expect(errors.end_time).toBeDefined()
  })

  it("fin doit être postérieure au début", () => {
    expect(
      validateAgendaEventForm(makeForm({ start_time: "10:00", end_time: "09:00" })).end_time,
    ).toBeDefined()
    expect(
      validateAgendaEventForm(makeForm({ start_time: "10:00", end_time: "10:00" })).end_time,
    ).toBeDefined()
  })

  it("management sans collaborateur → erreur contextuelle", () => {
    const errors = validateAgendaEventForm(makeForm({ event_type: "ead_collab" }))
    expect(errors.collaborator_id).toBeDefined()
    expect(
      validateAgendaEventForm(makeForm({ event_type: "ead_collab", collaborator_id: "col1" }))
        .collaborator_id,
    ).toBeUndefined()
  })

  it("scénario commercial : company/contact jamais obligatoires", () => {
    const errors = validateAgendaEventForm(makeForm({ event_type: "rdv_prospection" }))
    expect(errors.company).toBeUndefined()
    expect(errors.contact_id).toBeUndefined()
  })

  it("tâche préparatoire : intitulé + date obligatoires, antériorité vérifiée", () => {
    const missing = validateAgendaEventForm(makeForm({ create_task: true }))
    expect(missing.task_title).toBeDefined()
    expect(missing.task_date).toBeDefined()

    const late = validateAgendaEventForm(
      makeForm({
        create_task: true,
        task_title: "Relire",
        date: "2026-09-10",
        start_time: "09:00",
        task_date: "2026-09-10",
        task_time: "10:00",
      }),
    )
    expect(late.task_date).toBe("La tâche doit expirer avant le début de l'événement.")

    const ok = validateAgendaEventForm(
      makeForm({
        create_task: true,
        task_title: "Relire",
        date: "2026-09-10",
        start_time: "09:00",
        task_date: "2026-09-09",
        task_time: "10:00",
      }),
    )
    expect(ok.task_date).toBeUndefined()
  })
})

describe("collectContextErrors", () => {
  it("n'émet une erreur que pour les requiredFields du scénario", () => {
    expect(collectContextErrors("rdv_client_suivi", EMPTY_CONTEXT)).toEqual({})
    expect(collectContextErrors("presentation_rt", EMPTY_CONTEXT)).toEqual({})
    expect(collectContextErrors("suivi_mission_collab", EMPTY_CONTEXT)).toEqual({
      collaborator_id: "Le collaborateur est obligatoire.",
    })
  })
})

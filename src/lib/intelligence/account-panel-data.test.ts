import { describe, expect, it } from "vitest"
import {
  buildPanelContacts,
  buildPanelEvents,
  buildPanelOpportunities,
  hasStructuredSectorPlaybook,
  toEffectiveSectorRow,
  type PanelContactRow,
  type PanelEventRow,
  type PanelOpportunityRow,
} from "./account-panel-data"

function contact(overrides: Partial<PanelContactRow>): PanelContactRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    person_id: overrides.person_id ?? crypto.randomUUID(),
    job_title: overrides.job_title ?? "DSI",
    relationship_role: overrides.relationship_role ?? "decideur",
    is_priority: overrides.is_priority ?? false,
    persons: overrides.persons ?? {
      full_name: "Marie Martin",
      first_name: "Marie",
      last_name: "Martin",
      primary_email: "marie@example.com",
    },
  }
}

function opportunity(overrides: Partial<PanelOpportunityRow>): PanelOpportunityRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Mission data",
    stage: overrides.stage ?? "qualification",
    priority: overrides.priority ?? "normale",
    next_action_label: overrides.next_action_label ?? null,
    next_action_at: overrides.next_action_at ?? null,
    target_close_date: overrides.target_close_date ?? null,
    created_at: overrides.created_at ?? "2026-07-01T10:00:00.000Z",
  }
}

function event(overrides: Partial<PanelEventRow>): PanelEventRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Comite client",
    event_type: overrides.event_type ?? "meeting",
    status: overrides.status ?? "scheduled",
    starts_at: overrides.starts_at ?? "2026-07-03T10:00:00.000Z",
    ends_at: overrides.ends_at ?? "2026-07-03T11:00:00.000Z",
    contact_id: overrides.contact_id ?? null,
    opportunity_id: overrides.opportunity_id ?? null,
  }
}

describe("account panel data rules", () => {
  it("filters and sorts key contacts without using decision_power", () => {
    const contacts = buildPanelContacts([
      contact({
        id: "operationnel",
        person_id: "p-operationnel",
        relationship_role: "operationnel",
        persons: { full_name: "Zoé Hors filtre", first_name: "Zoé", last_name: "Hors filtre", primary_email: null },
      }),
      contact({
        id: "dsi-priority",
        person_id: "p-dsi",
        relationship_role: "dsi",
        is_priority: true,
        persons: { full_name: "Benoit DSI", first_name: "Benoit", last_name: "DSI", primary_email: null },
      }),
      contact({
        id: "decideur",
        person_id: "p-decideur",
        relationship_role: "decideur",
        is_priority: false,
        persons: { full_name: "Alice Decideur", first_name: "Alice", last_name: "Decideur", primary_email: null },
      }),
      contact({
        id: "direction",
        person_id: "p-direction",
        relationship_role: "direction_metier",
        is_priority: false,
        persons: { full_name: "Claire Metier", first_name: "Claire", last_name: "Metier", primary_email: null },
      }),
    ])

    expect(contacts.map((item) => item.id)).toEqual(["dsi-priority", "decideur", "direction"])
    expect(contacts.every((item) => item.relationshipRole === "decideur")).toBe(true)
  })

  it("deduplicates key contacts by person and keeps the strongest row", () => {
    const contacts = buildPanelContacts([
      contact({ id: "secondary", person_id: "person-1", relationship_role: "direction_metier" }),
      contact({ id: "primary", person_id: "person-1", relationship_role: "decideur" }),
    ])

    expect(contacts).toHaveLength(1)
    expect(contacts[0].id).toBe("primary")
  })

  it("excludes terminal opportunities and orders open opportunities by business priority", () => {
    const opportunities = buildPanelOpportunities([
      opportunity({ id: "lost", stage: "perdu", next_action_at: "2026-07-02T09:00:00.000Z" }),
      opportunity({ id: "later-high", priority: "haute", next_action_at: "2026-07-05T09:00:00.000Z" }),
      opportunity({ id: "close-date", priority: "basse", target_close_date: "2026-07-03" }),
      opportunity({ id: "soon-normal", priority: "normale", next_action_at: "2026-07-02T10:00:00.000Z" }),
    ])

    expect(opportunities.map((item) => item.id)).toEqual(["soon-normal", "later-high", "close-date"])
  })

  it("excludes cancelled or past events", () => {
    const events = buildPanelEvents([
      event({ id: "past", starts_at: "2026-07-01T10:00:00.000Z" }),
      event({ id: "cancelled", status: "cancelled", starts_at: "2026-07-03T09:00:00.000Z" }),
      event({ id: "future", starts_at: "2026-07-03T08:00:00.000Z" }),
    ], "2026-07-02T00:00:00.000Z")

    expect(events.map((item) => item.id)).toEqual(["future"])
  })

  it("requires an active structured sector with non-empty playbook", () => {
    expect(hasStructuredSectorPlaybook({
      id: "sector-1",
      name: "Sante",
      slug: "sante",
      status: "active",
      playbook: { angles: ["IA"] },
    })).toBe(true)
    expect(hasStructuredSectorPlaybook({
      id: "sector-2",
      name: "Retail",
      slug: "retail",
      status: "draft",
      playbook: { angles: ["IA"] },
    })).toBe(false)
    expect(hasStructuredSectorPlaybook({
      id: "sector-3",
      name: "Industrie",
      slug: "industrie",
      status: "active",
      playbook: {},
    })).toBe(false)
  })
})

// Lot 0 — résolution sectorielle héritée.
describe("toEffectiveSectorRow", () => {
  const resolved = (overrides: Record<string, unknown> = {}) => ({
    segment_id: "segment-1",
    segment_name: "5.1 Spatial",
    segment_slug: "spatial",
    segment_status: "development",
    macro_id: "macro-1",
    macro_name: "Aéronautique, Spatial & Défense",
    macro_slug: "aeronautique-spatial-defense",
    macro_status: "active",
    playbook: { personas: ["DSI"] },
    playbook_level: "macro",
    has_segment_knowledge: false,
    ...overrides,
  }) as Parameters<typeof toEffectiveSectorRow>[0]

  it("retient le macro quand le playbook en vient — statut et slug compris", () => {
    // Le slug alimente /ressources/playbook/[slug] : pointer le segment
    // enverrait les 36 fiches de seed vers une page de playbook vide.
    expect(toEffectiveSectorRow(resolved())).toEqual({
      id: "macro-1",
      name: "Aéronautique, Spatial & Défense",
      slug: "aeronautique-spatial-defense",
      status: "active",
      playbook: { personas: ["DSI"] },
    })
  })

  it("retient le segment dès qu'il porte son propre playbook", () => {
    const row = toEffectiveSectorRow(resolved({ playbook_level: "segment", segment_status: "active" }))
    expect(row).toMatchObject({ id: "segment-1", slug: "spatial", status: "active" })
  })

  it("garde le drapeau « playbook structuré » allumé sur un segment de seed", () => {
    expect(hasStructuredSectorPlaybook(toEffectiveSectorRow(resolved()))).toBe(true)
  })

  it("retombe sur le segment quand le macro est absent", () => {
    const row = toEffectiveSectorRow(resolved({ macro_id: null, macro_name: null, macro_slug: null, macro_status: null }))
    expect(row).toMatchObject({ id: "segment-1", slug: "spatial", status: "development" })
  })

  it("renvoie null sans ligne résolue", () => {
    expect(toEffectiveSectorRow(null)).toBeNull()
  })
})

import { describe, expect, it } from "vitest"
import {
  ACTIVE_MISSIONS_QUERY_LIMIT,
  deriveStaffingHorizon,
  staffingHorizonProvider,
} from "../data/corpus/staffing-horizon-provider"
import { createFakeSupabase, type FakeDataset } from "./fake-supabase"

const WS_ID = "workspace-test-123"

describe("deriveStaffingHorizon", () => {
  it("dérive un horizon de 4 mois calendaires : le mois analysé + 3 mois à venir", () => {
    const { windowStart, windowEnd } = deriveStaffingHorizon("2026-08-01", "2026-08-31")
    expect(windowStart).toBe("2026-08-01")
    expect(windowEnd).toBe("2026-11-30")
  })

  it("franchit correctement le passage d'année", () => {
    const { windowStart, windowEnd } = deriveStaffingHorizon("2026-11-01", "2026-11-30")
    expect(windowStart).toBe("2026-11-01")
    expect(windowEnd).toBe("2027-02-28")
  })
})

describe("staffingHorizonProvider — résolveur de corpus", () => {
  const SELECTOR = { kind: "staffing_horizon" as const, periodStart: "2026-08-01", periodEnd: "2026-08-31" }

  it("hydrate un consultant en mission avec une date de fin connue", async () => {
    const dataset: FakeDataset = {
      collaborators: [
        { id: "collab-1", workspace_id: WS_ID, person_id: "person-1", status: "active", practice: "Cloud", current_title: "Dev" },
      ],
      persons: [{ id: "person-1", workspace_id: WS_ID, full_name: "Alice Martin" }],
      missions: [
        { id: "mission-1", workspace_id: WS_ID, collaborator_id: "collab-1", title: "Mission Acme", status: "active", end_date: "2026-10-15", practice: "Cloud" },
      ],
      collaborator_absences: [],
      v_collaborator_ytd_activity: [],
      person_skills: [],
      opportunities: [],
      opportunity_skills: [],
      skills: [],
      companies: [],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await staffingHorizonProvider.resolve({ workspaceId: WS_ID, supabase }, SELECTOR)

    const staffingItem = result.items.find((item) => item.ref.table === "collaborators")
    expect(staffingItem).toBeDefined()
    expect(staffingItem?.content).toContain("Date de fin de mission : 2026-10-15")
    expect(staffingItem?.date).toBe("2026-10-15")
  })

  it("signale explicitement l'absence de date de fin — jamais une absence de risque", async () => {
    const dataset: FakeDataset = {
      collaborators: [
        { id: "collab-2", workspace_id: WS_ID, person_id: "person-2", status: "active", practice: "Data", current_title: "Lead Data" },
      ],
      persons: [{ id: "person-2", workspace_id: WS_ID, full_name: "Bruno Petit" }],
      missions: [
        { id: "mission-2", workspace_id: WS_ID, collaborator_id: "collab-2", title: "Mission Sans Fin", status: "active", end_date: null, practice: "Data" },
      ],
      collaborator_absences: [],
      v_collaborator_ytd_activity: [],
      person_skills: [],
      opportunities: [],
      opportunity_skills: [],
      skills: [],
      companies: [],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await staffingHorizonProvider.resolve({ workspaceId: WS_ID, supabase }, SELECTOR)

    const staffingItem = result.items.find((item) => item.ref.table === "collaborators")
    expect(staffingItem?.content).toContain("sans date de fin connue")
    expect(staffingItem?.content).not.toMatch(/aucun risque|pas de risque/i)
  })

  it("marque un consultant sans mission active comme disponible dès maintenant", async () => {
    const dataset: FakeDataset = {
      collaborators: [
        { id: "collab-3", workspace_id: WS_ID, person_id: "person-3", status: "active", practice: "Cyber", current_title: "Consultant" },
      ],
      persons: [{ id: "person-3", workspace_id: WS_ID, full_name: "Chloé Dubois" }],
      missions: [],
      collaborator_absences: [],
      v_collaborator_ytd_activity: [],
      person_skills: [],
      opportunities: [],
      opportunity_skills: [],
      skills: [],
      companies: [],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await staffingHorizonProvider.resolve({ workspaceId: WS_ID, supabase }, SELECTOR)

    const staffingItem = result.items.find((item) => item.ref.table === "collaborators")
    expect(staffingItem?.content).toContain("disponible dès maintenant")
  })

  it("hydrate les absences recouvrant l'horizon", async () => {
    const dataset: FakeDataset = {
      collaborators: [
        { id: "collab-4", workspace_id: WS_ID, person_id: "person-4", status: "active", practice: "Data", current_title: "Consultant" },
      ],
      persons: [{ id: "person-4", workspace_id: WS_ID, full_name: "Denis Roche" }],
      missions: [],
      collaborator_absences: [
        { id: "abs-1", workspace_id: WS_ID, collaborator_id: "collab-4", absence_type: "conge_paye", start_date: "2026-09-01", end_date: "2026-09-10", duration_days: 8 },
      ],
      v_collaborator_ytd_activity: [],
      person_skills: [],
      opportunities: [],
      opportunity_skills: [],
      skills: [],
      companies: [],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await staffingHorizonProvider.resolve({ workspaceId: WS_ID, supabase }, SELECTOR)

    const absenceItem = result.items.find((item) => item.ref.table === "collaborator_absences")
    expect(absenceItem).toBeDefined()
    expect(absenceItem?.content).toContain("Type d'absence : conge_paye")
  })

  it("ne recalcule pas le taux d'activité YTD : il est repris tel quel du corpus", async () => {
    const dataset: FakeDataset = {
      collaborators: [
        { id: "collab-5", workspace_id: WS_ID, person_id: "person-5", status: "active", practice: "Data", current_title: "Consultant" },
      ],
      persons: [{ id: "person-5", workspace_id: WS_ID, full_name: "Elise Fabre" }],
      missions: [],
      collaborator_absences: [],
      v_collaborator_ytd_activity: [
        { collaborator_id: "collab-5", full_name: "Elise Fabre", year: 2026, ytd_activity_rate: 82.5, taci_target: 90, gap_vs_target: -7.5 },
      ],
      person_skills: [],
      opportunities: [],
      opportunity_skills: [],
      skills: [],
      companies: [],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await staffingHorizonProvider.resolve({ workspaceId: WS_ID, supabase }, SELECTOR)

    const ytdItem = result.items.find((item) => item.ref.table === "v_collaborator_ytd_activity")
    expect(ytdItem?.content).toContain("Taux d'activité YTD : 82.5 %")
    expect(ytdItem?.content).toContain("Écart à la cible : -7.5 pts")
  })

  it("rapproche les compétences significatives (niveau ≥ 3) et les besoins ouverts avec leurs compétences requises", async () => {
    const dataset: FakeDataset = {
      collaborators: [
        { id: "collab-6", workspace_id: WS_ID, person_id: "person-6", status: "active", practice: "Data", current_title: "Data Engineer" },
      ],
      persons: [{ id: "person-6", workspace_id: WS_ID, full_name: "Farid Nassar" }],
      missions: [],
      collaborator_absences: [],
      v_collaborator_ytd_activity: [],
      person_skills: [
        { workspace_id: WS_ID, person_id: "person-6", skill_id: "skill-python", level: 4 },
        { workspace_id: WS_ID, person_id: "person-6", skill_id: "skill-excel", level: 2 }, // sous le seuil, exclu
      ],
      opportunities: [
        { id: "opp-1", workspace_id: WS_ID, title: "Besoin Data Engineer", stage: "qualification", company_id: "comp-1", opportunity_type: "regie", practice: "Data", seniority: "senior", duration_days: 120 },
      ],
      opportunity_skills: [
        { workspace_id: WS_ID, opportunity_id: "opp-1", skill_id: "skill-python", importance: "critique", min_level: 3 },
      ],
      skills: [
        { id: "skill-python", workspace_id: WS_ID, name: "Python" },
        { id: "skill-excel", workspace_id: WS_ID, name: "Excel" },
      ],
      companies: [{ id: "comp-1", workspace_id: WS_ID, name: "Acme Corp" }],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await staffingHorizonProvider.resolve({ workspaceId: WS_ID, supabase }, SELECTOR)

    const skillsItem = result.items.find((item) => item.ref.table === "person_skills")
    expect(skillsItem?.content).toContain("Python")
    expect(skillsItem?.content).not.toContain("Excel")

    const needItem = result.items.find((item) => item.ref.table === "opportunities")
    expect(needItem).toBeDefined()
    expect(needItem?.content).toContain("Compte : Acme Corp")
    expect(needItem?.content).toContain("Compétences requises : Python (critique)")
  })

  it("exclut les opportunités aux stages terminaux (gagné/perdu/abandonné)", async () => {
    const dataset: FakeDataset = {
      collaborators: [],
      persons: [],
      missions: [],
      collaborator_absences: [],
      v_collaborator_ytd_activity: [],
      person_skills: [],
      opportunities: [
        { id: "opp-open", workspace_id: WS_ID, title: "Besoin ouvert", stage: "qualification", company_id: null },
        { id: "opp-won", workspace_id: WS_ID, title: "Affaire gagnée", stage: "gagne", company_id: null },
      ],
      opportunity_skills: [],
      skills: [],
      companies: [],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await staffingHorizonProvider.resolve({ workspaceId: WS_ID, supabase }, SELECTOR)

    const oppItems = result.items.filter((item) => item.ref.table === "opportunities")
    expect(oppItems).toHaveLength(1)
    expect(oppItems[0]?.ref.id).toBe("opp-open")
  })

  it("trace une exclusion provider_limit à la saturation d'une borne dure", async () => {
    const missions = Array.from({ length: ACTIVE_MISSIONS_QUERY_LIMIT }, (_, i) => ({
      id: `mission-${i}`,
      workspace_id: WS_ID,
      collaborator_id: `collab-${i}`,
      title: `Mission ${i}`,
      status: "active",
      end_date: "2026-12-01",
      practice: "Cloud",
    }))
    const dataset: FakeDataset = {
      collaborators: [{ id: "collab-0", workspace_id: WS_ID, person_id: "person-0", status: "active", practice: "Cloud", current_title: "Dev" }],
      persons: [],
      missions,
      collaborator_absences: [],
      v_collaborator_ytd_activity: [],
      person_skills: [],
      opportunities: [],
      opportunity_skills: [],
      skills: [],
      companies: [],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await staffingHorizonProvider.resolve({ workspaceId: WS_ID, supabase }, SELECTOR)

    expect(result.exclusions).toContainEqual({
      ref: { kind: "staffing_horizon", table: "missions", id: "__query_limit__" },
      title: `Missions actives : borne de requête atteinte (${ACTIVE_MISSIONS_QUERY_LIMIT})`,
      provenance: "missions",
      reason: "provider_limit",
    })
  })

  it("filtre strictement sur le workspaceId (seconde serrure)", async () => {
    const dataset: FakeDataset = {
      collaborators: [
        { id: "collab-other-ws", workspace_id: "other-workspace", person_id: "person-x", status: "active", practice: "Cloud", current_title: "Dev" },
      ],
      persons: [],
      missions: [],
      collaborator_absences: [],
      v_collaborator_ytd_activity: [],
      person_skills: [],
      opportunities: [],
      opportunity_skills: [],
      skills: [],
      companies: [],
    }

    const { supabase, calls } = createFakeSupabase(dataset)
    const result = await staffingHorizonProvider.resolve({ workspaceId: WS_ID, supabase }, SELECTOR)

    expect(result.items).toHaveLength(0)
    const collabCall = calls.find((c) => c.table === "collaborators")
    expect(collabCall?.eq).toContainEqual(["workspace_id", WS_ID])
  })
})

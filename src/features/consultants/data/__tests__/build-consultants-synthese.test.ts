import { describe, expect, it } from "vitest"
import { buildConsultantsSynthese } from "../build-consultants-synthese"
import type {
  BuildConsultantsSyntheseInput,
  RawOfferPractice,
} from "../consultants-synthese.types"

const REFERENCE_DATE = new Date("2026-09-08T00:00:00.000Z")

const OFFER_PRACTICES: RawOfferPractice[] = [
  { id: "op-data", slug: "data-ai", name: "Data & AI", color_hex: "#818CF8", sort_order: 1 },
  { id: "op-cloud", slug: "cloud-engineering", name: "Cloud Engineering", color_hex: "#10B981", sort_order: 2 },
  { id: "op-cyber", slug: "cybersecurity", name: "Cybersecurity", color_hex: "#C41E3A", sort_order: 3 },
  { id: "op-dbs", slug: "digital-business-solutions", name: "Digital Business Solutions", color_hex: "#6366F1", sort_order: 4 },
]

function baseInput(
  overrides: Partial<BuildConsultantsSyntheseInput> = {},
): BuildConsultantsSyntheseInput {
  return {
    referenceDate: REFERENCE_DATE,
    collaborators: [],
    collaboratorPersonId: {},
    missions: [],
    candidates: [],
    compensations: [],
    hiringProcesses: [],
    positionings: [],
    jobProfiles: [],
    offerPractices: OFFER_PRACTICES,
    compensationReadable: true,
    ...overrides,
  }
}

describe("buildConsultantsSynthese — KPI", () => {
  it("compte l'effectif actif en excluant les sortis", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        collaborators: [
          { id: "c1", status: "en_mission", current_title: null, practice: "Data", job_profile_id: null, full_name: "A" },
          { id: "c2", status: "intercontrat", current_title: null, practice: "Cloud", job_profile_id: null, full_name: "B" },
          { id: "c3", status: "sorti", current_title: null, practice: "Data", job_profile_id: null, full_name: "C" },
        ],
      }),
    )
    expect(vm.kpis.activeCollaborators).toBe(2)
  })

  it("compte le vivier via le statut candidat 'vivier'", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        candidates: [
          { id: "k1", status: "vivier", practice_id: null, person_id: "p1" },
          { id: "k2", status: "vivier", practice_id: null, person_id: "p2" },
          { id: "k3", status: "recrute", practice_id: null, person_id: "p3" },
        ],
      }),
    )
    expect(vm.kpis.talentPoolCandidates).toBe(2)
  })

  it("compte les recrutements 'hired' clos dans l'année civile de référence", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        hiringProcesses: [
          { id: "h1", status: "hired", current_step: "integration", closed_at: "2026-03-01T00:00:00Z" },
          { id: "h2", status: "hired", current_step: "integration", closed_at: "2025-12-30T00:00:00Z" },
          { id: "h3", status: "hired", current_step: "integration", closed_at: null },
          { id: "h4", status: "active", current_step: "signature", closed_at: null },
        ],
      }),
    )
    expect(vm.kpis.hiresYearToDate).toBe(1)
    expect(vm.kpis.referenceYear).toBe(2026)
  })
})

describe("buildConsultantsSynthese — répartition par practice", () => {
  it("résout la practice collaborateur via job_profile puis via le texte libre", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        jobProfiles: [{ id: "jp1", practice_id: "op-cyber" }],
        collaborators: [
          // via job_profile → cybersecurity (le texte dirait Data)
          { id: "c1", status: "en_mission", current_title: null, practice: "Data", job_profile_id: "jp1", full_name: "A" },
          // via texte libre → data-ai
          { id: "c2", status: "en_mission", current_title: null, practice: "Data Engineer", job_profile_id: null, full_name: "B" },
          // non mappable → bucket Autre
          { id: "c3", status: "en_mission", current_title: null, practice: "???", job_profile_id: null, full_name: "C" },
        ],
      }),
    )
    const byKey = Object.fromEntries(vm.practiceBreakdown.map((b) => [b.key, b.collaborators]))
    expect(byKey["cybersecurity"]).toBe(1)
    expect(byKey["data-ai"]).toBe(1)
    expect(byKey["null"] ?? byKey[null as unknown as string]).toBe(1)
    const other = vm.practiceBreakdown.find((b) => b.key === null)
    expect(other?.label).toContain("Autre")
  })

  it("rapproche le texte libre exactement sur offer_practices.name avant l'heuristique", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        collaborators: [
          // « Digital Business Solutions » contient « digital » : l'heuristique
          // seule le classerait en cloud ; le rapprochement exact le corrige.
          { id: "c1", status: "en_mission", current_title: null, practice: "Digital Business Solutions", job_profile_id: null, full_name: "A" },
        ],
      }),
    )
    expect(vm.practiceBreakdown.map((b) => b.key)).toEqual(["digital-business-solutions"])
  })

  it("résout la practice candidat via practice_id relationnel", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        candidates: [
          { id: "k1", status: "vivier", practice_id: "op-data", person_id: "p1" },
          { id: "k2", status: "en_process", practice_id: "op-data", person_id: "p2" },
          { id: "k3", status: "vivier", practice_id: null, person_id: "p3" },
        ],
      }),
    )
    const data = vm.practiceBreakdown.find((b) => b.key === "data-ai")
    expect(data?.candidates).toBe(2)
    const other = vm.practiceBreakdown.find((b) => b.key === null)
    expect(other?.candidates).toBe(1)
  })

  it("n'émet pas de bucket practice vide", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        collaborators: [
          { id: "c1", status: "en_mission", current_title: null, practice: "Data", job_profile_id: null, full_name: "A" },
        ],
      }),
    )
    expect(vm.practiceBreakdown.every((b) => b.collaborators + b.candidates > 0)).toBe(true)
    expect(vm.practiceBreakdown.map((b) => b.key)).toEqual(["data-ai"])
  })
})

describe("buildConsultantsSynthese — prochaines fins de mission", () => {
  it("garde les 5 missions actives à fin la plus proche, triées, avec jours restants dérivés", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        collaborators: [
          { id: "c1", status: "en_mission", current_title: null, practice: "Data", job_profile_id: null, full_name: "Alice" },
        ],
        missions: [
          { id: "m1", title: "M1", status: "active", end_date: "2026-09-18", collaborator_id: "c1", client_name: "ACME" },
          { id: "m0", title: "M0", status: "active", end_date: "2026-09-08", collaborator_id: "c1", client_name: "ACME" },
          { id: "mpast", title: "Past", status: "active", end_date: "2026-01-01", collaborator_id: "c1", client_name: "ACME" },
          { id: "mended", title: "Ended", status: "ended", end_date: "2026-12-01", collaborator_id: "c1", client_name: "ACME" },
          { id: "m2", title: "M2", status: "active", end_date: "2026-10-08", collaborator_id: null, client_name: null },
          { id: "m3", title: "M3", status: "active", end_date: "2026-11-08", collaborator_id: "c1", client_name: "ACME" },
          { id: "m4", title: "M4", status: "active", end_date: "2026-12-08", collaborator_id: "c1", client_name: "ACME" },
          { id: "m5", title: "M5", status: "active", end_date: "2027-01-08", collaborator_id: "c1", client_name: "ACME" },
        ],
      }),
    )
    expect(vm.upcomingMissionEnds.map((m) => m.missionId)).toEqual(["m0", "m1", "m2", "m3", "m4"])
    expect(vm.upcomingMissionEnds[0].daysRemaining).toBe(0)
    expect(vm.upcomingMissionEnds[1].daysRemaining).toBe(10)
    expect(vm.upcomingMissionEnds[0].collaboratorName).toBe("Alice")
    expect(vm.upcomingMissionEnds[2].collaboratorName).toBeNull()
  })
})

describe("buildConsultantsSynthese — intercontrat", () => {
  const interco = {
    id: "c1",
    status: "intercontrat" as const,
    current_title: "Dev Java",
    practice: "Cloud",
    job_profile_id: null,
    full_name: "Bob",
  }

  it("expose la dernière mission, la rémunération et les positionnements traçables", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        collaborators: [interco],
        collaboratorPersonId: { c1: "person-1" },
        candidates: [{ id: "k1", status: "vivier", practice_id: null, person_id: "person-1" }],
        missions: [
          { id: "m1", title: "Ancienne mission", status: "ended", end_date: "2026-06-30", collaborator_id: "c1", client_name: "ACME" },
          { id: "m0", title: "Plus ancienne", status: "ended", end_date: "2025-01-01", collaborator_id: "c1", client_name: "ACME" },
        ],
        compensations: [{ collaborator_id: "c1", gross_annual: 55000, cjm: 420 }],
        positionings: [
          { status: "identifie", person_id: "person-1", opportunity_stage: "qualification" },
          { status: "envoye_client", person_id: "person-1", opportunity_stage: "cv_envoyes" },
          { status: "abandonne", person_id: "person-1", opportunity_stage: "qualification" },
          { status: "identifie", person_id: "person-1", opportunity_stage: "perdu" },
        ],
      }),
    )
    const row = vm.interContractCollaborators[0]
    expect(row.lastMissionTitle).toBe("Ancienne mission")
    expect(row.lastMissionEndDate).toBe("2026-06-30")
    expect(row.grossAnnual).toBe(55000)
    expect(row.cjm).toBe(420)
    expect(row.compensationVisible).toBe(true)
    expect(row.activePositionings).toBe(2)
  })

  it("marque les positionnements non traçables (pas de fiche candidat miroir)", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        collaborators: [interco],
        collaboratorPersonId: { c1: "person-1" },
        candidates: [],
        positionings: [{ status: "identifie", person_id: "person-1", opportunity_stage: "qualification" }],
      }),
    )
    expect(vm.interContractCollaborators[0].activePositionings).toBeNull()
    expect(vm.dataNotes.some((n) => n.includes("non traçables"))).toBe(true)
  })

  it("masque la rémunération quand le rôle n'est pas habilité", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        collaborators: [interco],
        collaboratorPersonId: { c1: "person-1" },
        compensations: [],
        compensationReadable: false,
      }),
    )
    const row = vm.interContractCollaborators[0]
    expect(row.grossAnnual).toBeNull()
    expect(row.cjm).toBeNull()
    expect(row.compensationVisible).toBe(false)
    expect(vm.dataNotes.some((n) => n.includes("Rémunération"))).toBe(true)
  })
})

describe("buildConsultantsSynthese — pipeline recrutement", () => {
  it("répartit les process actifs par étape et compte les issues de l'année", () => {
    const vm = buildConsultantsSynthese(
      baseInput({
        hiringProcesses: [
          { id: "h1", status: "active", current_step: "tests_techniques", closed_at: null },
          { id: "h2", status: "active", current_step: "tests_techniques", closed_at: null },
          { id: "h3", status: "active", current_step: "signature", closed_at: null },
          { id: "h4", status: "hired", current_step: "integration", closed_at: "2026-02-02" },
          { id: "h5", status: "rejected", current_step: "entretien_manager", closed_at: "2026-04-04" },
          { id: "h6", status: "withdrawn", current_step: "proposition", closed_at: "2025-04-04" },
        ],
      }),
    )
    expect(vm.recruitmentPipeline.totalActive).toBe(3)
    const byStep = Object.fromEntries(
      vm.recruitmentPipeline.byStep.map((s) => [s.step, s.count]),
    )
    expect(byStep["tests_techniques"]).toBe(2)
    expect(byStep["signature"]).toBe(1)
    expect(byStep["prequalification"]).toBe(0)
    expect(vm.recruitmentPipeline.byStep).toHaveLength(6)
    expect(vm.recruitmentPipeline.hiresYearToDate).toBe(1)
    expect(vm.recruitmentPipeline.closedNotHiredYearToDate).toBe(1)
  })
})

describe("buildConsultantsSynthese — réserves méthodo", () => {
  it("mentionne toujours la définition provisoire du vivier", () => {
    const vm = buildConsultantsSynthese(baseInput())
    expect(vm.dataNotes.some((n) => n.toLowerCase().includes("vivier"))).toBe(true)
  })
})

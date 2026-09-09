import { describe, expect, it } from "vitest"
import {
  buildOpportunitiesSynthese,
  IMPORTANCE_WEIGHT,
} from "../build-opportunities-synthese"
import type {
  BuildOpportunitiesSyntheseInput,
  RawSyntheseOpportunity,
} from "../opportunities-synthese.types"

const REFERENCE_DATE = new Date("2026-09-09T00:00:00.000Z")

const OFFER_PRACTICES = [
  { id: "op-cloud", slug: "cloud-engineering", name: "Cloud Engineering", sort_order: 2 },
  { id: "op-cyber", slug: "cybersecurity", name: "Cybersecurity", sort_order: 3 },
  { id: "op-qa", slug: "quality-engineering-testing", name: "Quality Engineering & Testing", sort_order: 8 },
]

function opp(overrides: Partial<RawSyntheseOpportunity> = {}): RawSyntheseOpportunity {
  return {
    id: "o1",
    title: "Opp 1",
    stage: "qualification",
    conviction: 50,
    estimated_gain: 100_000,
    acv: null,
    company_id: "c1",
    company_name: "ACME",
    practice: null,
    next_action_at: null,
    next_action_label: null,
    target_close_date: null,
    ...overrides,
  }
}

function baseInput(
  overrides: Partial<BuildOpportunitiesSyntheseInput> = {},
): BuildOpportunitiesSyntheseInput {
  return {
    referenceDate: REFERENCE_DATE,
    sharedKpis: { openNeedsCount: 5, activePositioningsCount: 9 },
    opportunities: [],
    positionings: [],
    opportunitySkills: [],
    vivierPersonSkills: [],
    vivierPersonCount: 0,
    offerPractices: OFFER_PRACTICES,
    ...overrides,
  }
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

describe("buildOpportunitiesSynthese — KPI", () => {
  it("reprend openNeedsCount et activePositioningsCount de getNeedsStaffingSharedData sans les recalculer", () => {
    const vm = buildOpportunitiesSynthese(
      baseInput({
        sharedKpis: { openNeedsCount: 5, activePositioningsCount: 9 },
        // du bruit de positionnements qui ne doit PAS influencer les KPI partagés
        opportunities: [opp({ id: "o1", stage: "recherche_profil" })],
        positionings: [
          { opportunity_id: "o1", status: "identifie" },
          { opportunity_id: "o1", status: "retenu" },
        ],
      }),
    )
    expect(vm.kpis.openNeedsCount).toBe(5)
    expect(vm.kpis.activePositioningsCount).toBe(9)
  })

  it("CA du pipe = Σ ((acv ?? estimated_gain ?? 0) × conviction/100) sur les opps ouvertes (option B — OPP-19)", () => {
    const vm = buildOpportunitiesSynthese(
      baseInput({
        opportunities: [
          opp({ id: "o1", acv: 120_000, estimated_gain: 90_000, conviction: 50 }), // 60 000
          opp({ id: "o2", acv: null, estimated_gain: 40_000, conviction: 25 }), //     10 000
          opp({ id: "o3", acv: null, estimated_gain: null, conviction: 80 }), //            0
          opp({ id: "oW", stage: "gagne", acv: 999_999, conviction: 100 }), //  exclue (terminale)
        ],
      }),
    )
    expect(vm.kpis.pipeWeightedValue).toBe(70_000)
    expect(vm.kpis.openOpportunitiesCount).toBe(3)
  })
})

describe("buildOpportunitiesSynthese — invariant somme pipe", () => {
  const vm = buildOpportunitiesSynthese(
    baseInput({
      opportunities: [
        opp({ id: "o1", company_id: "c1", company_name: "ACME", practice: "Cloud Engineering", acv: 200_000, conviction: 50, stage: "qualification" }),
        opp({ id: "o2", company_id: "c2", company_name: "Globex", practice: "Cyber", estimated_gain: 80_000, conviction: 25, stage: "cv_envoyes" }),
        opp({ id: "o3", company_id: null, company_name: null, practice: "inconnu xyz", acv: 50_000, conviction: 100, stage: "recherche_profil" }),
      ],
    }),
  )

  it("Σ pipeByStage == Σ pipeByClient == Σ pipeByPractice == pipeWeightedValue", () => {
    expect(sum(vm.pipeByStage.map((b) => b.weightedValue))).toBeCloseTo(vm.kpis.pipeWeightedValue, 6)
    expect(sum(vm.pipeByClient.map((b) => b.weightedValue))).toBeCloseTo(vm.kpis.pipeWeightedValue, 6)
    expect(sum(vm.pipeByPractice.map((b) => b.weightedValue))).toBeCloseTo(vm.kpis.pipeWeightedValue, 6)
  })

  it("pipeByStage expose les 5 étapes actives, 0 inclus", () => {
    expect(vm.pipeByStage.map((b) => b.stage)).toEqual([
      "qualification",
      "recherche_profil",
      "cv_envoyes",
      "entretien_client",
      "contractualisation",
    ])
    expect(vm.pipeByStage.find((b) => b.stage === "entretien_client")?.opportunityCount).toBe(0)
  })

  it("pipeByClient regroupe les opps sans client sous « Client non renseigné »", () => {
    const unassigned = vm.pipeByClient.find((b) => b.key === "__unassigned__")
    expect(unassigned?.label).toBe("Client non renseigné")
    expect(unassigned?.opportunityCount).toBe(1)
  })

  it("pipeByPractice : match exact sur offer_practices.name, heuristique, puis « Autre » en dernier", () => {
    const keys = vm.pipeByPractice.map((b) => b.key)
    expect(keys).toContain("cloud-engineering") // "Cloud Engineering" verbatim
    expect(keys).toContain("cybersecurity") // "Cyber" via heuristique getPracticeByName
    expect(keys[keys.length - 1]).toBe("__other__") // "inconnu xyz" → Autre, en dernier
    expect(vm.pipeByPractice.find((b) => b.key === "__other__")?.label).toBe("Autre / non rattaché")
  })
})

describe("buildOpportunitiesSynthese — top compétences (OPP-20)", () => {
  it("classe les compétences demandées par Σ (weight × importance) et limite à 5", () => {
    const vm = buildOpportunitiesSynthese(
      baseInput({
        opportunities: [opp({ id: "o1" }), opp({ id: "o2" })],
        opportunitySkills: [
          { opportunity_id: "o1", skill_id: "s-k8s", skill_name: "Kubernetes", importance: "indispensable", weight: 5 }, // 15
          { opportunity_id: "o2", skill_id: "s-k8s", skill_name: "Kubernetes", importance: "souhaitee", weight: 5 }, // +10 => 25, 2 opps
          { opportunity_id: "o1", skill_id: "s-go", skill_name: "Go", importance: "indispensable", weight: 4 }, // 12
          { opportunity_id: "o1", skill_id: "s-sql", skill_name: "SQL", importance: "bonus", weight: 2 }, // 2
        ],
      }),
    )
    expect(vm.skillsDemand[0]).toMatchObject({ skillId: "s-k8s", score: 25, opportunityCount: 2 })
    expect(vm.skillsDemand[1]).toMatchObject({ skillId: "s-go", score: 12 })
    expect(vm.skillsDemand.length).toBeLessThanOrEqual(5)
    expect(IMPORTANCE_WEIGHT).toEqual({ indispensable: 3, souhaitee: 2, bonus: 1 })
  })

  it("ignore les opportunity_skills des opps terminales", () => {
    const vm = buildOpportunitiesSynthese(
      baseInput({
        opportunities: [opp({ id: "oW", stage: "gagne" })],
        opportunitySkills: [
          { opportunity_id: "oW", skill_id: "s1", skill_name: "X", importance: "indispensable", weight: 5 },
        ],
      }),
    )
    expect(vm.skillsDemand).toEqual([])
  })

  it("classe le vivier par nombre de profils distincts portant la compétence", () => {
    const vm = buildOpportunitiesSynthese(
      baseInput({
        vivierPersonCount: 3,
        vivierPersonSkills: [
          { person_id: "p1", skill_id: "s-k8s", skill_name: "Kubernetes", level: 4 },
          { person_id: "p2", skill_id: "s-k8s", skill_name: "Kubernetes", level: 3 },
          { person_id: "p2", skill_id: "s-k8s", skill_name: "Kubernetes", level: 5 }, // doublon personne
          { person_id: "p1", skill_id: "s-go", skill_name: "Go", level: 2 },
        ],
      }),
    )
    expect(vm.skillsSupply[0]).toMatchObject({ skillId: "s-k8s", personCount: 2 })
    expect(vm.skillsSupply[1]).toMatchObject({ skillId: "s-go", personCount: 1 })
  })
})

describe("buildOpportunitiesSynthese — progression staffing (OPP-21)", () => {
  const vm = buildOpportunitiesSynthese(
    baseInput({
      opportunities: [opp({ id: "o1", title: "Besoin A", stage: "recherche_profil" })],
      positionings: [
        { opportunity_id: "o1", status: "identifie" },
        { opportunity_id: "o1", status: "propose_interne" },
        { opportunity_id: "o1", status: "preselectionne" },
        { opportunity_id: "o1", status: "envoye_client" },
        { opportunity_id: "o1", status: "entretien_realise" },
        { opportunity_id: "o1", status: "retenu" },
        { opportunity_id: "o1", status: "refuse_client" }, // hors entonnoir
      ],
    }),
  )

  it("mappe les statuts vers 5 buckets, terminaux négatifs exclus", () => {
    const row = vm.processByOpportunity[0]
    expect(row.positioningsByBucket).toEqual({
      identifie: 1,
      propose: 2,
      envoye_client: 1,
      entretien: 1,
      retenu: 1,
    })
    expect(row.excludedPositioningsCount).toBe(1)
    expect(row.activePositioningsCount).toBe(6)
    expect(row.stage).toBe("recherche_profil")
    expect(row.stageLabel).toBe("Recherche profils")
  })

  it("l'entonnoir agrégé conserve l'ordre canonique et inclut les 0", () => {
    expect(vm.staffingFunnel.map((s) => s.bucket)).toEqual([
      "identifie",
      "propose",
      "envoye_client",
      "entretien",
      "retenu",
    ])
    expect(vm.staffingFunnel.map((s) => s.count)).toEqual([1, 2, 1, 1, 1])
  })
})

describe("buildOpportunitiesSynthese — échéances (builder canonique Lot 8)", () => {
  it("délègue au builder OpportunityDeadline : priorité next_action_at > agenda > closing, trie ASC, limite à 5", () => {
    const vm = buildOpportunitiesSynthese(
      baseInput({
        opportunities: [
          opp({ id: "o1", title: "A", next_action_at: "2026-09-20T09:00:00Z", next_action_label: "Relance", target_close_date: "2026-09-10" }),
          opp({ id: "o2", title: "B", next_action_at: null, target_close_date: "2026-09-15" }),
          opp({ id: "o3", title: "C", next_action_at: "2026-08-01T09:00:00Z", target_close_date: "2026-09-30" }), // next_action_at passé → tombe sur le closing
          opp({ id: "o4", title: "D", next_action_at: null, target_close_date: null }), // aucune date → exclue
        ],
        calendarEvents: [
          { opportunity_id: "o2", event_type: "rdv_client_suivi", status: "scheduled", starts_at: "2026-09-12T08:00:00Z" },
        ],
      }),
    )
    expect(vm.upcomingDeadlines.map((d) => d.opportunityId)).toEqual(["o2", "o1", "o3"])
    expect(vm.upcomingDeadlines[0]).toMatchObject({ source: "calendar_event", calendarEventType: "rdv_client_suivi", dueAt: "2026-09-12T08:00:00Z" })
    expect(vm.upcomingDeadlines[1]).toMatchObject({ source: "next_action", label: "Relance", dueAt: "2026-09-20T09:00:00Z" })
    expect(vm.upcomingDeadlines[2]).toMatchObject({ source: "target_close", label: "Date de closing visée" })
  })

  it("ignore les évènements agenda passés / annulés et retombe sur le closing", () => {
    const vm = buildOpportunitiesSynthese(
      baseInput({
        opportunities: [opp({ id: "o1", title: "A", next_action_at: null, target_close_date: "2026-09-25" })],
        calendarEvents: [
          { opportunity_id: "o1", event_type: "soutenance", status: "cancelled", starts_at: "2026-09-12T08:00:00Z" },
          { opportunity_id: "o1", event_type: "soutenance", status: "completed", starts_at: "2026-08-01T08:00:00Z" },
        ],
      }),
    )
    expect(vm.upcomingDeadlines).toEqual([
      expect.objectContaining({ opportunityId: "o1", source: "target_close", dueAt: "2026-09-25" }),
    ])
  })
})

describe("buildOpportunitiesSynthese — dataNotes", () => {
  it("porte toujours les réserves DATA-01 / DATA-02b / vivier / échéances", () => {
    const vm = buildOpportunitiesSynthese(baseInput({ vivierPersonCount: 11 }))
    const joined = vm.dataNotes.join(" || ")
    expect(joined).toContain("DATA-01")
    expect(joined).toContain("OPP-19")
    expect(joined).toContain("OPP-20")
    expect(joined).toContain("11 profil(s)")
    expect(joined).toContain("DATA-03")
  })

  it("ajoute une réserve quand une opp ouverte n'a ni ACV ni gain estimé, ou pas de practice", () => {
    const vm = buildOpportunitiesSynthese(
      baseInput({
        opportunities: [opp({ id: "o1", acv: null, estimated_gain: null, practice: null })],
      }),
    )
    const joined = vm.dataNotes.join(" || ")
    expect(joined).toContain("sans valeur")
    expect(joined).toContain("sans practice résolue")
  })
})

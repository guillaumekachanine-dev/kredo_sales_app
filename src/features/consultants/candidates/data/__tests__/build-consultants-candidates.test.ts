import { describe, expect, it } from "vitest"
import { buildConsultantsCandidates } from "../build-consultants-candidates"
import type {
  BuildConsultantsCandidatesInput,
  RawCandidateRow,
  RawOfferPracticeRef,
} from "../consultants-candidates.types"

const REFERENCE_DATE = new Date("2026-09-08T00:00:00.000Z")

const OFFER_PRACTICES: RawOfferPracticeRef[] = [
  { id: "op-data", slug: "data-ai", name: "Data & AI", sort_order: 1 },
  { id: "op-cloud", slug: "cloud-engineering", name: "Cloud Engineering", sort_order: 2 },
]

function candidate(overrides: Partial<RawCandidateRow> = {}): RawCandidateRow {
  return {
    id: "cand-1",
    person_id: "p1",
    status: "vivier",
    seniority: "Senior",
    current_title: "Data Engineer",
    practice_id: null,
    job_profile_id: null,
    availability: null,
    available_from: null,
    notice_period_days: null,
    expected_salary: null,
    expected_daily_rate: null,
    source: null,
    summary: null,
    full_name: "Alice Martin",
    location: "Paris",
    ...overrides,
  }
}

function baseInput(
  overrides: Partial<BuildConsultantsCandidatesInput> = {},
): BuildConsultantsCandidatesInput {
  return {
    referenceDate: REFERENCE_DATE,
    candidates: [],
    hiringProcesses: [],
    prequalificationMilestones: [],
    positionings: [],
    jobProfiles: [],
    offerPractices: OFFER_PRACTICES,
    ...overrides,
  }
}

describe("buildConsultantsCandidates — population du vivier (C-06)", () => {
  it("liste tous les candidats, y compris sans positionnement ni process", () => {
    const vm = buildConsultantsCandidates(
      baseInput({
        candidates: [
          candidate({ id: "a", full_name: "Alice" }),
          candidate({ id: "b", full_name: "Bob", status: "nouveau" }),
        ],
      }),
    )
    expect(vm.rows).toHaveLength(2)
    expect(vm.counts.total).toBe(2)
    expect(vm.counts.withoutPositioning).toBe(2)
  })

  it("trie les lignes par nom complet", () => {
    const vm = buildConsultantsCandidates(
      baseInput({
        candidates: [
          candidate({ id: "z", full_name: "Zoé" }),
          candidate({ id: "a", full_name: "Ana" }),
        ],
      }),
    )
    expect(vm.rows.map((r) => r.fullName)).toEqual(["Ana", "Zoé"])
  })
})

describe("buildConsultantsCandidates — pipelineState", () => {
  it("classe un statut terminal en 'closed'", () => {
    const vm = buildConsultantsCandidates(
      baseInput({ candidates: [candidate({ status: "recrute" })] }),
    )
    expect(vm.rows[0].pipelineState).toBe("closed")
    expect(vm.rows[0].isTerminalLifecycle).toBe(true)
  })

  it("classe un candidat avec process actif en 'in_process'", () => {
    const vm = buildConsultantsCandidates(
      baseInput({
        candidates: [candidate({ id: "cand-1", status: "vivier" })],
        hiringProcesses: [
          {
            id: "hp1",
            candidate_id: "cand-1",
            status: "active",
            current_step: "tests_techniques",
            started_at: "2026-05-01T00:00:00Z",
            closed_at: null,
          },
        ],
      }),
    )
    expect(vm.rows[0].pipelineState).toBe("in_process")
    expect(vm.rows[0].hasActiveHiringProcess).toBe(true)
    expect(vm.rows[0].latestHiringProcess?.currentStep).toBe("tests_techniques")
  })

  it("classe un candidat 'vivier' sans action en 'pool'", () => {
    const vm = buildConsultantsCandidates(
      baseInput({ candidates: [candidate({ status: "vivier" })] }),
    )
    expect(vm.rows[0].pipelineState).toBe("pool")
  })

  it("classe un positionnement actif en 'in_process' et ignore les positionnements terminaux", () => {
    const vm = buildConsultantsCandidates(
      baseInput({
        candidates: [candidate({ id: "cand-1", status: "vivier" })],
        positionings: [
          {
            candidate_id: "cand-1",
            status: "refuse_client",
            updated_at: "2026-01-01T00:00:00Z",
            next_action: "ne rien faire",
            opportunity_stage: null,
          },
        ],
      }),
    )
    expect(vm.rows[0].pipelineState).toBe("pool")
    expect(vm.rows[0].hasActivePositioning).toBe(false)
    expect(vm.rows[0].nextAction).toBeNull()
  })
})

describe("buildConsultantsCandidates — DATA-4 qualification YTD", () => {
  it("marque qualifiedThisYear via un jalon prequalification/valide daté dans l'année de référence", () => {
    const vm = buildConsultantsCandidates(
      baseInput({
        candidates: [
          candidate({ id: "a", full_name: "A" }),
          candidate({ id: "b", full_name: "B" }),
          candidate({ id: "c", full_name: "C" }),
        ],
        prequalificationMilestones: [
          { candidate_id: "a", completed_at: "2026-03-15T09:00:00Z" },
          { candidate_id: "b", completed_at: "2025-11-20T09:00:00Z" },
          { candidate_id: "c", completed_at: null },
        ],
      }),
    )
    const byId = Object.fromEntries(vm.rows.map((r) => [r.candidateId, r.qualifiedThisYear]))
    expect(byId).toEqual({ a: true, b: false, c: false })
    expect(vm.counts.qualifiedThisYear).toBe(1)
  })
})

describe("buildConsultantsCandidates — DATA-6 disponibilité", () => {
  it("dérive le bucket depuis available_from sans toucher au texte libre", () => {
    const vm = buildConsultantsCandidates(
      baseInput({
        candidates: [
          candidate({ id: "now", available_from: "2026-08-01", availability: "Dispo sous 2 semaines" }),
          candidate({ id: "later", available_from: "2026-12-01", availability: "3 mois" }),
          candidate({ id: "unknown", available_from: null, availability: "Discret (En poste)" }),
        ],
      }),
    )
    const byId = Object.fromEntries(vm.rows.map((r) => [r.candidateId, r]))
    expect(byId.now.availabilityBucket).toBe("immediate")
    expect(byId.later.availabilityBucket).toBe("scheduled")
    expect(byId.unknown.availabilityBucket).toBe("unknown")
    expect(byId.now.availabilityLabel).toBe("Dispo sous 2 semaines")
  })
})

describe("buildConsultantsCandidates — PRODUCT-2 prochaine action", () => {
  it("prend next_action du positionnement actif le plus récent", () => {
    const vm = buildConsultantsCandidates(
      baseInput({
        candidates: [candidate({ id: "cand-1" })],
        positionings: [
          {
            candidate_id: "cand-1",
            status: "envoye_client",
            updated_at: "2026-06-01T00:00:00Z",
            next_action: "relancer le client",
            opportunity_stage: "qualification",
          },
          {
            candidate_id: "cand-1",
            status: "preselectionne",
            updated_at: "2026-02-01T00:00:00Z",
            next_action: "action ancienne",
            opportunity_stage: "qualification",
          },
        ],
      }),
    )
    expect(vm.rows[0].nextAction).toBe("relancer le client")
    expect(vm.rows[0].activePositioningCount).toBe(2)
  })
})

describe("buildConsultantsCandidates — practice (C-17)", () => {
  it("résout la practice via practice_id puis via job_profile_id en repli", () => {
    const vm = buildConsultantsCandidates(
      baseInput({
        candidates: [
          candidate({ id: "direct", practice_id: "op-data" }),
          candidate({ id: "via-profile", practice_id: null, job_profile_id: "jp1" }),
          candidate({ id: "none", practice_id: null, job_profile_id: null }),
        ],
        jobProfiles: [{ id: "jp1", practice_id: "op-cloud" }],
      }),
    )
    const byId = Object.fromEntries(vm.rows.map((r) => [r.candidateId, r]))
    expect(byId.direct.practiceKey).toBe("data-ai")
    expect(byId["via-profile"].practiceKey).toBe("cloud-engineering")
    expect(byId.none.practiceKey).toBeNull()
    expect(byId.none.practiceLabel).toBeNull()
  })
})

describe("buildConsultantsCandidates — lifecycle hors whitelist", () => {
  it("conserve le statut brut et un libellé lisible", () => {
    const vm = buildConsultantsCandidates(
      baseInput({ candidates: [candidate({ status: "statut_exotique" })] }),
    )
    expect(vm.rows[0].lifecycleStatus).toBeNull()
    expect(vm.rows[0].lifecycleStatusRaw).toBe("statut_exotique")
    expect(vm.rows[0].lifecycleLabel).toBe("statut exotique")
  })
})

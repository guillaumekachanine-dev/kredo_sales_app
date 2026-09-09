import { describe, expect, it } from "vitest"
import {
  HIRING_PROCESS_STAGES,
  type HiringProcessStageKey,
} from "@/lib/recruitment/recruitment-stages"
import type { ConsultantsCandidateRow } from "@/features/consultants/candidates/data/consultants-candidates.types"

function makeMockCandidateRow(
  candidateId: string,
  hiringStep?: HiringProcessStageKey,
  status: string = "active",
): ConsultantsCandidateRow {
  return {
    candidateId,
    personId: `person-${candidateId}`,
    fullName: `Candidate ${candidateId}`,
    currentTitle: "Dev Fullstack",
    seniority: "Senior",
    location: "Paris",
    source: "linkedin",
    summary: null,
    practiceKey: "cloud-engineering",
    practiceLabel: "Développement",
    lifecycleStatus: "en_process",
    lifecycleStatusRaw: "en_process",
    lifecycleLabel: "En process",
    isTerminalLifecycle: false,
    pipelineState: "in_process",
    qualifiedThisYear: true,
    availabilityLabel: "Immédiate",
    availableFrom: "2026-09-01",
    noticePeriodDays: 0,
    availabilityBucket: "immediate",
    expectedSalary: 60000,
    expectedDailyRate: 600,
    hasActiveHiringProcess: Boolean(hiringStep),
    latestHiringProcess: hiringStep
      ? {
          processId: `process-${candidateId}`,
          status,
          currentStep: hiringStep,
          startedAt: "2026-08-01T10:00:00Z",
        }
      : null,
    hasActivePositioning: false,
    activePositioningCount: 0,
    nextAction: "Entretien technique",
  }
}

describe("Candidats — logique de filtrage et répartition des étapes de recrutement", () => {
  it("les 6 étapes métier HIRING_PROCESS_STAGES restent inchangées", () => {
    expect(HIRING_PROCESS_STAGES).toHaveLength(6)
    expect(HIRING_PROCESS_STAGES.map((s) => s.key)).toEqual([
      "prequalification",
      "entretien_manager",
      "tests_techniques",
      "proposition",
      "signature",
      "integration",
    ])
  })

  it("isole les candidats avec un process actif et ignore les process terminés ou absents", () => {
    const rows: ConsultantsCandidateRow[] = [
      makeMockCandidateRow("1", "prequalification", "active"),
      makeMockCandidateRow("2", "tests_techniques", "active"),
      makeMockCandidateRow("3", undefined), // sans process
      makeMockCandidateRow("4", "signature", "hired"), // process clos
    ]

    const activeRows = rows.filter(
      (r) => r.latestHiringProcess && r.latestHiringProcess.status === "active",
    )

    expect(activeRows).toHaveLength(2)
    expect(activeRows.map((r) => r.candidateId)).toEqual(["1", "2"])
  })

  it("répartit correctement les candidats par étape de recrutement", () => {
    const rows: ConsultantsCandidateRow[] = [
      makeMockCandidateRow("1", "prequalification"),
      makeMockCandidateRow("2", "prequalification"),
      makeMockCandidateRow("3", "entretien_manager"),
      makeMockCandidateRow("4", "tests_techniques"),
      makeMockCandidateRow("5", "proposition"),
      makeMockCandidateRow("6", "signature"),
    ]

    const groupedByStep = new Map<string, number>()
    for (const stage of HIRING_PROCESS_STAGES) {
      groupedByStep.set(stage.key, 0)
    }

    for (const r of rows) {
      const step = r.latestHiringProcess?.currentStep ?? "prequalification"
      groupedByStep.set(step, (groupedByStep.get(step) ?? 0) + 1)
    }

    expect(groupedByStep.get("prequalification")).toBe(2)
    expect(groupedByStep.get("entretien_manager")).toBe(1)
    expect(groupedByStep.get("tests_techniques")).toBe(1)
    expect(groupedByStep.get("proposition")).toBe(1)
    expect(groupedByStep.get("signature")).toBe(1)
    expect(groupedByStep.get("integration")).toBe(0)
  })
})

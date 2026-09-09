import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { ConsultantsSyntheseViewModel } from "@/features/consultants/data/consultants-synthese.types"
import { SyntheseDesktop } from "./SyntheseDesktop"
import { SyntheseMobile } from "@/features/consultants/mobile/synthese/SyntheseMobile"

function vmFixture(
  overrides: Partial<ConsultantsSyntheseViewModel> = {},
): ConsultantsSyntheseViewModel {
  return {
    generatedAt: "2026-09-08T00:00:00.000Z",
    kpis: {
      activeCollaborators: 29,
      talentPoolCandidates: 11,
      hiresYearToDate: 7,
      referenceYear: 2026,
    },
    practiceBreakdown: [
      {
        key: "data-ai",
        label: "Data & AI",
        colorHex: "#818CF8",
        collaborators: 5,
        candidates: 8,
        hiresYearToDate: 3,
      },
      {
        key: null,
        label: "Autre / non rattaché",
        colorHex: null,
        collaborators: 1,
        candidates: 0,
        hiresYearToDate: 0,
      },
    ],
    upcomingMissionEnds: [
      {
        missionId: "m1",
        missionTitle: "Maintenance Calypso",
        collaboratorName: "Alice Martin",
        clientName: "RATP",
        endDate: "2026-10-01",
        daysRemaining: 23,
      },
    ],
    interContractCollaborators: [
      {
        collaboratorId: "c1",
        fullName: "Bob Durand",
        jobTitle: "Dev Java",
        practiceLabel: "Cloud Engineering",
        lastMissionTitle: "Migration Cloud",
        lastMissionEndDate: "2026-06-30",
        grossAnnual: 55000,
        cjm: 420,
        compensationVisible: true,
        activePositionings: null,
      },
    ],
    recruitmentPipeline: {
      byStep: [
        { step: "prequalification", label: "Préqualification", count: 1 },
        { step: "entretien_manager", label: "Entretien manager", count: 0 },
        { step: "tests_techniques", label: "Tests techniques", count: 3 },
        { step: "proposition", label: "Proposition", count: 2 },
        { step: "signature", label: "Signature", count: 1 },
        { step: "integration", label: "Intégration", count: 0 },
      ],
      totalActive: 8,
      hiresYearToDate: 7,
      closedNotHiredYearToDate: 4,
    },
    dataNotes: ["Vivier = candidats au statut « vivier » — définition provisoire."],
    ...overrides,
  }
}

function renderDesktop(vm: ConsultantsSyntheseViewModel) {
  return renderToStaticMarkup(React.createElement(SyntheseDesktop, { vm }))
}
function renderMobile(vm: ConsultantsSyntheseViewModel) {
  return renderToStaticMarkup(React.createElement(SyntheseMobile, { vm }))
}

describe("SyntheseDesktop", () => {
  it("affiche les 3 KPI, Double voie et les sections éditoriales", () => {
    const markup = renderDesktop(vmFixture())
    expect(markup).toContain(">29<")
    expect(markup).toContain(">11<")
    expect(markup).toContain("Data &amp; AI")
    expect(markup).toContain("Double voie")
    expect(markup).toContain("candidats rattachés par practice")
    expect(markup).toContain("Recrutés")
    expect(markup).toContain("Processus actifs par étape")
    expect(markup).toContain("Prochaines fins de mission")
    expect(markup).toContain("Alice Martin")
    expect(markup).toContain("Bob Durand")
    expect(markup).toContain("23 j")
  })

  it("affiche le CJM compact quand il est visible", () => {
    expect(renderDesktop(vmFixture())).toContain("CJM")
  })

  it("masque le CJM quand compensationVisible est faux", () => {
    const vm = vmFixture()
    vm.interContractCollaborators[0].compensationVisible = false
    vm.interContractCollaborators[0].grossAnnual = null
    vm.interContractCollaborators[0].cjm = null
    const markup = renderDesktop(vm)
    expect(markup).not.toContain("CJM")
  })

  it("rend les réserves méthodo", () => {
    expect(renderDesktop(vmFixture())).toContain("définition provisoire")
  })
})

describe("SyntheseMobile", () => {
  it("rend les KPI, Double voie, les processus et les raccourcis", () => {
    const markup = renderMobile(vmFixture())
    expect(markup).toContain(">29<")
    expect(markup).toContain("Data &amp; AI")
    expect(markup).toContain("Prochaines fins de mission")
    expect(markup).toContain("Double voie")
    expect(markup).toContain("Processus actifs par étape")
    expect(markup).toContain('href="/consultants?section=collaborateurs"')
    expect(markup).toContain('href="/consultants?section=candidats"')
  })

  it("indique les positionnements non traçables", () => {
    expect(renderMobile(vmFixture())).toContain("Positionnements : —")
  })
})

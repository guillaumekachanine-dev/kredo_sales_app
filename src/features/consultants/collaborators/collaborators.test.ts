import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { isCollaboratorStaffed, type CollaborateurRow } from "./collaborators.types"
import { CollaboratorsDesktop } from "./CollaboratorsDesktop"
import { CollaboratorsMobile } from "./CollaboratorsMobile"

function mission(
  overrides: Partial<CollaborateurRow["missions"][number]> = {},
): CollaborateurRow["missions"][number] {
  return {
    id: "m1",
    title: "Mission",
    status: "active",
    start_date: null,
    end_date: "2026-12-01",
    tjm: 600,
    cjm: 400,
    gross_margin_pct: 33,
    company: { name: "ACME" },
    ...overrides,
  }
}

function collab(overrides: Partial<CollaborateurRow> = {}): CollaborateurRow {
  return {
    id: "c1",
    status: "en_mission",
    current_title: "Dev",
    seniority: "Senior",
    practice: "Data",
    exit_date: null,
    person: { first_name: "Alice", last_name: "Martin", full_name: "Alice Martin" },
    missions: [],
    ...overrides,
  }
}

describe("isCollaboratorStaffed (LEGACY-4 / C-16)", () => {
  it("dérive le statut du champ collaborators.status, pas des missions", () => {
    expect(isCollaboratorStaffed({ status: "en_mission" })).toBe(true)
    expect(isCollaboratorStaffed({ status: "intercontrat" })).toBe(false)
    expect(isCollaboratorStaffed({ status: "sorti" })).toBe(false)
  })
})

describe("CollaboratorsDesktop", () => {
  it("calcule le taux d'occupation sur le statut, pas sur la présence d'une mission active", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CollaboratorsDesktop, {
        data: [
          collab({ id: "a", status: "en_mission", missions: [] }),
          collab({ id: "b", status: "en_mission", missions: [] }),
          // intercontrat MAIS porte une mission active — ne doit PAS compter comme occupé
          collab({ id: "c", status: "intercontrat", missions: [mission({ status: "active" })] }),
        ],
      }),
    )
    // statut : 2/3 en mission → 67 %. (Basé sur les missions : 1/3 → 33 %.)
    expect(markup).toContain("67 %")
    expect(markup).toContain("Effectif (3)")
  })

  it("rend la table et le drawer profil", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CollaboratorsDesktop, { data: [collab()] }),
    )
    expect(markup).toContain("Alice Martin")
    expect(markup).toContain("Consultant")
    expect(markup).toContain("Practice")
  })
})

describe("CollaboratorsMobile", () => {
  it("titre = Collaborateurs et hero compté sur le statut", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CollaboratorsMobile, {
        data: [
          collab({ id: "a", status: "en_mission", missions: [] }),
          collab({ id: "b", status: "intercontrat", missions: [mission({ status: "active" })] }),
        ],
      }),
    )
    expect(markup).toContain("Collaborateurs")
    // 1 intercontrat / 2 → « 1 consultant à repositionner » + value 1/2
    expect(markup).toContain("1/2")
  })
})

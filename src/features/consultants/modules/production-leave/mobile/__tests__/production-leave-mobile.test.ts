import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ProductionLeaveMobile } from "../ProductionLeaveMobile"
import type { ProductionLeaveViewModel } from "../../data/production-leave.types"

const mockVm: ProductionLeaveViewModel = {
  referenceMonth: "2026-09",
  availableMonths: ["2026-09", "2026-08"],
  dataNotes: [],
  collaborators: [
    {
      collaboratorId: "collab-1",
      personId: "person-1",
      fullName: "Guillaume Martin",
      currentTitle: "Data Engineer",
      practiceKey: "data-ai",
      practiceLabel: "Data & AI",
      ytd: {
        productivityRate: 81.5,
        targetRate: 85,
        gapVsTarget: -3.5,
      },
      currentMonth: {
        month: "2026-09",
        hasActivityData: true,
        businessDays: 22,
        productionDays: 17,
        nonBillableDays: 2,
        ptoDays: 3,
        sickDays: 0,
        otherAbsenceDays: 0,
        productivityRate: 77.3,
        targetRate: 85,
        gapVsTarget: -7.7,
        revenue: 10200,
        targetRevenue: 11220,
        revenueGap: -1020,
        structuralCost: null,
        margin: null,
        targetMargin: null,
        marginGap: null,
        absenceBreakdown: [
          {
            type: "conge_paye",
            label: "Congés payés",
            days: 3,
            estimatedRevenueImpact: 1800,
          },
        ],
        absences: [
          {
            id: "abs-1",
            type: "conge_paye",
            startDate: "2026-09-08",
            endDate: "2026-09-10",
            durationDays: 3,
          },
        ],
      },
      history: [
        {
          month: "2026-08",
          hasActivityData: true,
          businessDays: 21,
          productionDays: 16,
          nonBillableDays: 0,
          ptoDays: 5,
          sickDays: 0,
          otherAbsenceDays: 0,
          productivityRate: 76.2,
          targetRate: 85,
          gapVsTarget: -8.8,
          revenue: 9600,
          targetRevenue: 10710,
          revenueGap: -1110,
          structuralCost: null,
          margin: null,
          targetMargin: null,
          marginGap: null,
          absenceBreakdown: [],
          absences: [],
        },
        {
          month: "2026-09",
          hasActivityData: true,
          businessDays: 22,
          productionDays: 17,
          nonBillableDays: 2,
          ptoDays: 3,
          sickDays: 0,
          otherAbsenceDays: 0,
          productivityRate: 77.3,
          targetRate: 85,
          gapVsTarget: -7.7,
          revenue: 10200,
          targetRevenue: 11220,
          revenueGap: -1020,
          structuralCost: null,
          margin: null,
          targetMargin: null,
          marginGap: null,
          absenceBreakdown: [
            {
              type: "conge_paye",
              label: "Congés payés",
              days: 3,
              estimatedRevenueImpact: 1800,
            },
          ],
          absences: [
            {
              id: "abs-1",
              type: "conge_paye",
              startDate: "2026-09-08",
              endDate: "2026-09-10",
              durationDays: 3,
            },
          ],
        },
      ],
    },
    {
      collaboratorId: "collab-2",
      personId: "person-2",
      fullName: "Sophie Bernard",
      currentTitle: "Cloud Architect",
      practiceKey: "cloud-engineering",
      practiceLabel: "Cloud Engineering",
      ytd: {
        productivityRate: null,
        targetRate: null,
        gapVsTarget: null,
      },
      currentMonth: null,
      history: [
        {
          month: "2026-09",
          hasActivityData: false,
          businessDays: 0,
          productionDays: 0,
          nonBillableDays: 0,
          ptoDays: 0,
          sickDays: 0,
          otherAbsenceDays: 0,
          productivityRate: null,
          targetRate: null,
          gapVsTarget: null,
          revenue: null,
          targetRevenue: null,
          revenueGap: null,
          structuralCost: null,
          margin: null,
          targetMargin: null,
          marginGap: null,
          absenceBreakdown: [],
          absences: [],
        },
      ],
    },
  ],
}

describe("ProductionLeaveMobile", () => {
  it("rend l'en-tête mobile et la liste de cartes collaborateurs", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductionLeaveMobile, { vm: mockVm }),
    )

    expect(markup).toContain("Activité &amp; Production")
    expect(markup).toContain("Guillaume Martin")
    expect(markup).toContain("Sophie Bernard")
  })

  it("affiche les métriques synthétiques du mois sur chaque carte", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductionLeaveMobile, { vm: mockVm }),
    )

    // Collaborateur avec CRA
    expect(markup).toContain("17 / 22 j")
    expect(markup).toContain("77,3 %")
    expect(markup).toContain("-7.7 pts")
    expect(markup).toContain("Sous cible")

    // Collaborateur sans CRA
    expect(markup).toContain("Aucune donnée d&#x27;activité sur ce mois")
  })

  it("utilise des cibles tactiles supérieures ou égales à 44 px", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductionLeaveMobile, { vm: mockVm }),
    )
    expect(markup).toContain("min-h-[48px]")
  })
})

import React from "react"
import fs from "node:fs"
import path from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ProductionLeaveDesktop } from "../ProductionLeaveDesktop"
import type { ProductionLeaveViewModel } from "../../data/production-leave.types"

const mockVm: ProductionLeaveViewModel = {
  referenceMonth: "2026-09",
  availableMonths: ["2026-09", "2026-08", "2026-07"],
  dataNotes: [
    "Données de rémunération et marges confidentielles (accès administrateur requis).",
  ],
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
          month: "2026-07",
          hasActivityData: true,
          businessDays: 22,
          productionDays: 20,
          nonBillableDays: 0,
          ptoDays: 2,
          sickDays: 0,
          otherAbsenceDays: 0,
          productivityRate: 90.9,
          targetRate: 85,
          gapVsTarget: 5.9,
          revenue: 12000,
          targetRevenue: 11220,
          revenueGap: 780,
          structuralCost: null,
          margin: null,
          targetMargin: null,
          marginGap: null,
          absenceBreakdown: [],
          absences: [],
        },
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

describe("ProductionLeaveDesktop", () => {
  it("rend le modal avec IntelligenceSplitModalShell, le titre, sous-titre et contrôles", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductionLeaveDesktop, {
        vm: mockVm,
        closeHref: "/consultants",
      }),
    )

    expect(markup).toContain("Production &amp; Congés")
    expect(markup).toContain("Analyse mensuelle de l’activité réalisée et des absences")
    expect(markup).toContain("Fermer la modale")
    expect(markup).toContain("production-month-select")
    expect(markup).toContain("Guillaume Martin")
    expect(markup).toContain("Data Engineer")
    expect(markup).toContain("Data &amp; AI")
  })

  it("affiche les indicateurs de productivité et de jours produits", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductionLeaveDesktop, {
        vm: mockVm,
        closeHref: "/consultants",
      }),
    )

    expect(markup).toContain("77,3 %")
    expect(markup).toContain("-7.7 pts")
    expect(markup).toContain("17")
    expect(markup).toContain("/ 22 j ouvrés")
  })

  it("affiche la ventilation des absences et le libellé économique rigoureux", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductionLeaveDesktop, {
        vm: mockVm,
        closeHref: "/consultants",
      }),
    )

    expect(markup).toContain("Congés payés")
    expect(markup).toContain("Manque à produire théorique")
    expect(markup).not.toContain("Coût de l'absence")
  })

  it("masque proprement les coûts et marges quand null sans afficher 0 €", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductionLeaveDesktop, {
        vm: mockVm,
        closeHref: "/consultants",
      }),
    )

    // structuralCost et margin sont null dans mockVm
    expect(markup).not.toContain("0 € de marge")
    expect(markup).not.toContain("Coût structurel : 0 €")
  })

  it("rend un graphique SVG maison sans aucune dépendance recharts/chart.js", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductionLeaveDesktop, {
        vm: mockVm,
        closeHref: "/consultants",
      }),
    )

    expect(markup).toContain("<svg")
    expect(markup).toContain("polyline")
    expect(markup).not.toContain("recharts")
  })

  it("ne génère aucun calendrier journalier de production (C-08/C-30)", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductionLeaveDesktop, {
        vm: mockVm,
        closeHref: "/consultants",
      }),
    )

    expect(markup).not.toContain("calendrier-journalier")
    expect(markup).not.toContain("planning-journalier")
  })

  it("sentinelle structurelle : n'a aucun dialog/backdrop/escape custom et délègue à IntelligenceSplitModalShell", () => {
    const filePath = path.resolve(__dirname, "../ProductionLeaveDesktop.tsx")
    const sourceCode = fs.readFileSync(filePath, "utf-8")

    // Vérifie l'import et l'utilisation de IntelligenceSplitModalShell
    expect(sourceCode).toContain('import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"')
    expect(sourceCode).toContain("<IntelligenceSplitModalShell")

    // Interdit la réintroduction de primitives modales dupliquées
    expect(sourceCode).not.toContain('role="dialog"')
    expect(sourceCode).not.toContain("fixed inset-0")
    expect(sourceCode).not.toContain("window.addEventListener")
    expect(sourceCode).not.toContain("window.removeEventListener")
    expect(sourceCode).not.toContain("max-w-[1500px]")
    expect(sourceCode).not.toContain("max-h-[92vh]")
  })
})

import { describe, expect, it } from "vitest"
import {
  allocateAbsenceDaysToMonth,
  buildProductionLeave,
} from "../build-production-leave"
import type {
  BuildProductionLeaveInput,
  RawAbsence,
  RawActiveCollaborator,
  RawActivitySummary,
  RawCompensation,
  RawYtdActivity,
} from "../production-leave.types"

describe("allocateAbsenceDaysToMonth", () => {
  it("alloue l'intégralité des jours quand l'absence est dans le même mois", () => {
    const absence: RawAbsence = {
      id: "abs-1",
      collaborator_id: "c-1",
      absence_type: "conge_paye",
      start_date: "2026-05-18",
      end_date: "2026-05-22",
      duration_days: 5,
      notes: null,
    }
    expect(allocateAbsenceDaysToMonth(absence, "2026-05")).toBe(5)
    expect(allocateAbsenceDaysToMonth(absence, "2026-04")).toBe(0)
    expect(allocateAbsenceDaysToMonth(absence, "2026-06")).toBe(0)
  })

  it("gère les demi-journées isolées", () => {
    const absence: RawAbsence = {
      id: "abs-half",
      collaborator_id: "c-1",
      absence_type: "conge_paye",
      start_date: "2026-01-30",
      end_date: "2026-01-30",
      duration_days: 0.5,
      notes: null,
    }
    expect(allocateAbsenceDaysToMonth(absence, "2026-01")).toBe(0.5)
  })

  it("ventile correctement une absence traversant deux mois selon les jours ouvrés réels", () => {
    // 2026-07-27 (lundi) au 2026-08-07 (vendredi) = 10 jours ouvrés
    // 5 jours ouvrés en juillet (27, 28, 29, 30, 31)
    // 5 jours ouvrés en août (3, 4, 5, 6, 7)
    const absence: RawAbsence = {
      id: "abs-cross-1",
      collaborator_id: "c-1",
      absence_type: "conge_paye",
      start_date: "2026-07-27",
      end_date: "2026-08-07",
      duration_days: 10,
      notes: "Vacances été",
    }
    expect(allocateAbsenceDaysToMonth(absence, "2026-07")).toBe(5)
    expect(allocateAbsenceDaysToMonth(absence, "2026-08")).toBe(5)
    expect(allocateAbsenceDaysToMonth(absence, "2026-09")).toBe(0)
  })

  it("ventile une absence asymétrique traversant une fin de mois", () => {
    // 2026-06-29 (lundi) au 2026-07-10 (vendredi) = 10 jours ouvrés
    // 2 jours ouvrés en juin (29, 30)
    // 8 jours ouvrés en juillet (1, 2, 3, 6, 7, 8, 9, 10)
    const absence: RawAbsence = {
      id: "abs-cross-2",
      collaborator_id: "c-2",
      absence_type: "conge_paye",
      start_date: "2026-06-29",
      end_date: "2026-07-10",
      duration_days: 10,
      notes: null,
    }
    expect(allocateAbsenceDaysToMonth(absence, "2026-06")).toBe(2)
    expect(allocateAbsenceDaysToMonth(absence, "2026-07")).toBe(8)
  })
})

describe("buildProductionLeave", () => {
  const baseCollab: RawActiveCollaborator = {
    id: "collab-1",
    status: "en_mission",
    current_title: "Consultant Senior Cloud",
    practice: "Digital & Cloud Engineering",
    job_profile_id: "jp-1",
    person_id: "p-1",
    full_name: "Alice Martin",
  }

  const baseCompensation: RawCompensation = {
    collaborator_id: "collab-1",
    gross_annual: 50000,
    charges_rate: 0.45,
    working_days_per_year: 218,
    taci: 0.85,
    cjm: 332.5,
    variable_pay: 0,
  }

  const baseYtd: RawYtdActivity = {
    collaborator_id: "collab-1",
    year: 2026,
    ytd_activity_rate: 88.5,
    taci_target: 0.85,
    gap_vs_target: 3.5,
  }

  function createInput(overrides: Partial<BuildProductionLeaveInput> = {}): BuildProductionLeaveInput {
    return {
      referenceMonth: "2026-09",
      collaborators: [baseCollab],
      activitySummaries: [],
      ytdActivities: [baseYtd],
      absences: [],
      compensations: [baseCompensation],
      offerPractices: [{ id: "op-1", slug: "digital-cloud", name: "Digital & Cloud Engineering" }],
      jobProfiles: [{ id: "jp-1", practice_id: "op-1" }],
      compensationReadable: true,
      ...overrides,
    }
  }

  // ── 1. Agrégation mensuelle ───────────────────────────────────────────────
  describe("Agrégation mensuelle", () => {
    it("agrège un CRA complet (100 % de production)", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 22,
        pto_days: 0,
        sick_days: 0,
        non_billable_days: 0,
        activity_rate_percent: 100,
        cra_status: "validated",
        tjm_snapshot: 600,
        cjm_snapshot: 332.5,
        revenue: 13200,
        employer_cost: 7316.51,
        real_margin: 5883.49,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [summary] }))

      expect(vm.collaborators).toHaveLength(1)
      const c = vm.collaborators[0]
      expect(c.currentMonth).not.toBeNull()
      expect(c.currentMonth?.businessDays).toBe(22)
      expect(c.currentMonth?.productionDays).toBe(22)
      expect(c.currentMonth?.ptoDays).toBe(0)
      expect(c.currentMonth?.sickDays).toBe(0)
      expect(c.currentMonth?.nonBillableDays).toBe(0)
      expect(c.currentMonth?.productivityRate).toBe(100)
    })

    it("agrège un CRA avec congés payés", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 17,
        pto_days: 5,
        sick_days: 0,
        non_billable_days: 0,
        activity_rate_percent: 77.3,
        cra_status: "validated",
        tjm_snapshot: 600,
        cjm_snapshot: 332.5,
        revenue: 10200,
        employer_cost: 7316.51,
        real_margin: 2883.49,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [summary] }))
      const m = vm.collaborators[0].currentMonth
      expect(m?.productionDays).toBe(17)
      expect(m?.ptoDays).toBe(5)
      expect(m?.productivityRate).toBe(77.27)
    })

    it("agrège un CRA avec arrêt maladie", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 20,
        pto_days: 0,
        sick_days: 2,
        non_billable_days: 0,
        activity_rate_percent: 90.9,
        cra_status: "validated",
        tjm_snapshot: 600,
        cjm_snapshot: 332.5,
        revenue: 12000,
        employer_cost: 7316.51,
        real_margin: 4683.49,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [summary] }))
      const m = vm.collaborators[0].currentMonth
      expect(m?.productionDays).toBe(20)
      expect(m?.sickDays).toBe(2)
      expect(m?.productivityRate).toBe(90.91)
    })

    it("agrège un CRA avec jours non facturables (intercontrat / formation)", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 10,
        pto_days: 2,
        sick_days: 0,
        non_billable_days: 10,
        activity_rate_percent: 45.5,
        cra_status: "validated",
        tjm_snapshot: 600,
        cjm_snapshot: 332.5,
        revenue: 6000,
        employer_cost: 7316.51,
        real_margin: -1316.51,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [summary] }))
      const m = vm.collaborators[0].currentMonth
      expect(m?.productionDays).toBe(10)
      expect(m?.nonBillableDays).toBe(10)
      expect(m?.ptoDays).toBe(2)
      expect(m?.productivityRate).toBe(45.45)
    })

    it("gère un collaborateur sans aucun CRA sur le mois de référence et positionne hasActivityData à false", () => {
      const vm = buildProductionLeave(createInput({ activitySummaries: [] }))
      const c = vm.collaborators[0]
      expect(c.currentMonth).toBeNull()
      expect(c.history).toHaveLength(1) // referenceMonth existe dans l'historique
      expect(c.history[0].businessDays).toBe(0)
      expect(c.history[0].productionDays).toBe(0)
      expect(c.history[0].productivityRate).toBeNull()
      expect(c.history[0].hasActivityData).toBe(false)
    })

    it("distingue un zéro réel (CRA avec 0 jour produit) d'une absence de CRA", () => {
      const zeroProductionSummary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 0,
        pto_days: 0,
        sick_days: 0,
        non_billable_days: 22,
        activity_rate_percent: 0,
        cra_status: "validated",
        tjm_snapshot: 600,
        cjm_snapshot: 332.5,
        revenue: 0,
        employer_cost: 7316.51,
        real_margin: -7316.51,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [zeroProductionSummary] }))
      const c = vm.collaborators[0]
      expect(c.currentMonth).not.toBeNull()
      expect(c.currentMonth?.hasActivityData).toBe(true)
      expect(c.currentMonth?.businessDays).toBe(22)
      expect(c.currentMonth?.productionDays).toBe(0)
      expect(c.currentMonth?.productivityRate).toBe(0)
    })

    it("protège contre la division par zéro sur un mois sans jours ouvrés", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 0,
        billable_days: 0,
        pto_days: 0,
        sick_days: 0,
        non_billable_days: 0,
        activity_rate_percent: null,
        cra_status: "draft",
        tjm_snapshot: 600,
        cjm_snapshot: 332.5,
        revenue: null,
        employer_cost: null,
        real_margin: null,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [summary] }))
      const m = vm.collaborators[0].currentMonth
      expect(m?.businessDays).toBe(0)
      expect(m?.productivityRate).toBeNull()
      expect(m?.gapVsTarget).toBeNull()
      expect(m?.targetRevenue).toBeNull()
      expect(m?.structuralCost).toBeNull()
    })

    it("exclut les collaborateurs avec status 'sorti' (C-16)", () => {
      const sortiCollab: RawActiveCollaborator = {
        id: "collab-sorti",
        status: "sorti",
        current_title: "Ancien consultant",
        practice: "Digital & Cloud Engineering",
        job_profile_id: "jp-1",
        person_id: "p-sorti",
        full_name: "Jean Parti",
      }

      const vm = buildProductionLeave(
        createInput({ collaborators: [baseCollab, sortiCollab] }),
      )
      expect(vm.collaborators).toHaveLength(1)
      expect(vm.collaborators[0].collaboratorId).toBe("collab-1")
    })
  })

  // ── 2. Productivité & Objectifs ───────────────────────────────────────────
  describe("Productivité & Objectifs", () => {
    it("calcule correctement le taux de productivité, la cible et l'écart", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 17,
        pto_days: 2,
        sick_days: 1,
        non_billable_days: 2,
        activity_rate_percent: 77.3,
        cra_status: "validated",
        tjm_snapshot: 500,
        cjm_snapshot: 332.5,
        revenue: 8500,
        employer_cost: 7316.51,
        real_margin: 1183.49,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [summary] }))
      const m = vm.collaborators[0].currentMonth
      // 17 / 22 = 77.2727... -> 77.27 %
      expect(m?.productivityRate).toBe(77.27)
      // Cible = taci 0.85 -> 85 %
      expect(m?.targetRate).toBe(85)
      // Écart = 77.27 - 85 = -7.73 pts
      expect(m?.gapVsTarget).toBe(-7.73)
    })

    it("expose les indicateurs YTD depuis la source YTD", () => {
      const vm = buildProductionLeave(createInput())
      const ytd = vm.collaborators[0].ytd
      expect(ytd.productivityRate).toBe(88.5)
      expect(ytd.targetRate).toBe(85)
      expect(ytd.gapVsTarget).toBe(3.5)
    })
  })

  // ── 3. Absences & Ventilation ─────────────────────────────────────────────
  describe("Absences & Ventilation", () => {
    it("ventile les absences par type avec libellés canoniques et impact CA théorique", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 19,
        pto_days: 2,
        sick_days: 1,
        non_billable_days: 0,
        activity_rate_percent: 86.4,
        cra_status: "validated",
        tjm_snapshot: 500,
        cjm_snapshot: 332.5,
        revenue: 9500,
        employer_cost: 7316.51,
        real_margin: 2183.49,
        gross_annual: 50000,
      }

      const absences: RawAbsence[] = [
        {
          id: "abs-1",
          collaborator_id: "collab-1",
          absence_type: "conge_paye",
          start_date: "2026-09-10",
          end_date: "2026-09-11",
          duration_days: 2,
          notes: "CP pont",
        },
        {
          id: "abs-2",
          collaborator_id: "collab-1",
          absence_type: "maladie",
          start_date: "2026-09-21",
          end_date: "2026-09-21",
          duration_days: 1,
          notes: "Rhume",
        },
      ]

      const vm = buildProductionLeave(
        createInput({ activitySummaries: [summary], absences }),
      )
      const m = vm.collaborators[0].currentMonth
      expect(m?.absenceBreakdown).toHaveLength(2)

      const cp = m?.absenceBreakdown.find((b) => b.type === "conge_paye")
      expect(cp?.label).toBe("Congés payés")
      expect(cp?.days).toBe(2)
      // Manque à produire théorique : 2 j * 500 € = 1000 €
      expect(cp?.estimatedRevenueImpact).toBe(1000)

      const mal = m?.absenceBreakdown.find((b) => b.type === "maladie")
      expect(mal?.label).toBe("Maladie")
      expect(mal?.days).toBe(1)
      expect(mal?.estimatedRevenueImpact).toBe(500)

      expect(m?.absences).toHaveLength(2)
    })

    it("rattache un motif inconnu à une catégorie neutre sans l'inventer", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 20,
        pto_days: 0,
        sick_days: 0,
        non_billable_days: 2,
        activity_rate_percent: 90.9,
        cra_status: "validated",
        tjm_snapshot: 500,
        cjm_snapshot: 332.5,
        revenue: 10000,
        employer_cost: 7316.51,
        real_margin: 2683.49,
        gross_annual: 50000,
      }

      const absences: RawAbsence[] = [
        {
          id: "abs-unknown",
          collaborator_id: "collab-1",
          absence_type: "motif_inattendu_xyz",
          start_date: "2026-09-01",
          end_date: "2026-09-02",
          duration_days: 2,
          notes: null,
        },
      ]

      const vm = buildProductionLeave(
        createInput({ activitySummaries: [summary], absences }),
      )
      const m = vm.collaborators[0].currentMonth
      const unknown = m?.absenceBreakdown.find((b) => b.type === "motif_inattendu_xyz")
      expect(unknown?.label).toBe("Autre absence")
      expect(unknown?.days).toBe(2)
    })
  })

  // ── 4. Modélisation Financière ────────────────────────────────────────────
  describe("Modélisation Financière", () => {
    it("calcule CA réalisé, CA cible, écart de CA, coût structurel et marge", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 17,
        pto_days: 2,
        sick_days: 1,
        non_billable_days: 2,
        activity_rate_percent: 77.3,
        cra_status: "validated",
        tjm_snapshot: 600,
        cjm_snapshot: 332.57,
        revenue: 10200,
        employer_cost: 7316.51,
        real_margin: 2883.49,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [summary] }))
      const m = vm.collaborators[0].currentMonth

      // CA réalisé = 17 * 600 = 10200
      expect(m?.revenue).toBe(10200)

      // Jours cible = 22 * 0.85 = 18.7 jours
      // CA cible = 18.7 * 600 = 11220
      expect(m?.targetRevenue).toBe(11220)

      // Écart CA = 10200 - 11220 = -1020
      expect(m?.revenueGap).toBe(-1020)

      // Coût journalier employeur brut = 50000 * 1.45 / 218 = 332.5688...
      // Coût structurel mensuel = 332.5688 * 22 = 7316.51
      expect(m?.structuralCost).toBe(7316.51)

      // Marge = 10200 - 7316.51 = 2883.49
      expect(m?.margin).toBe(2883.49)

      // Marge cible = 11220 - 7316.51 = 3903.49
      expect(m?.targetMargin).toBe(3903.49)

      // Écart marge = 2883.49 - 3903.49 = -1020
      expect(m?.marginGap).toBe(-1020)
    })

    it("masque le coût structurel et les marges lorsque compensationReadable est faux (RLS)", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 17,
        pto_days: 2,
        sick_days: 1,
        non_billable_days: 2,
        activity_rate_percent: 77.3,
        cra_status: "validated",
        tjm_snapshot: 600,
        cjm_snapshot: 332.57,
        revenue: 10200,
        employer_cost: 7316.51,
        real_margin: 2883.49,
        gross_annual: null,
      }

      const vm = buildProductionLeave(
        createInput({ activitySummaries: [summary], compensationReadable: false }),
      )
      const m = vm.collaborators[0].currentMonth

      // Activité et CA restent visibles
      expect(m?.productionDays).toBe(17)
      expect(m?.revenue).toBe(10200)

      // Coûts et marges sont strictement masqués
      expect(m?.structuralCost).toBeNull()
      expect(m?.margin).toBeNull()
      expect(m?.targetMargin).toBeNull()
      expect(m?.marginGap).toBeNull()

      // Présence d'une note de confidentialité
      expect(vm.dataNotes).toContain(
        "Données de rémunération et marges confidentielles (accès administrateur requis).",
      )
    })

    it("renvoie null pour les indicateurs financiers quand le TJM est absent ou nul", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 20,
        pto_days: 2,
        sick_days: 0,
        non_billable_days: 0,
        activity_rate_percent: 90.9,
        cra_status: "validated",
        tjm_snapshot: 0,
        cjm_snapshot: 332.5,
        revenue: null,
        employer_cost: 7316.51,
        real_margin: null,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [summary] }))
      const m = vm.collaborators[0].currentMonth

      expect(m?.revenue).toBeNull()
      expect(m?.targetRevenue).toBeNull()
      expect(m?.revenueGap).toBeNull()
      expect(m?.margin).toBeNull()
      expect(m?.targetMargin).toBeNull()
      expect(m?.marginGap).toBeNull()
    })
  })

  // ── 5. Sentinelles d'invariants ───────────────────────────────────────────
  describe("Sentinelles d'invariants", () => {
    it("SENTINELLE : aucun tableau de jours de production journalier n'est généré (C-08)", () => {
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 17,
        pto_days: 5,
        sick_days: 0,
        non_billable_days: 0,
        activity_rate_percent: 77.3,
        cra_status: "validated",
        tjm_snapshot: 600,
        cjm_snapshot: 332.5,
        revenue: 10200,
        employer_cost: 7316.51,
        real_margin: 2883.49,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [summary] }))
      const m = vm.collaborators[0].currentMonth as unknown as Record<string, unknown>

      // Aucune propriété de calendrier journalier de production
      expect(m.dailyProduction).toBeUndefined()
      expect(m.productionSchedule).toBeUndefined()
      expect(m.calendarDays).toBeUndefined()
      expect(m.dailyActivity).toBeUndefined()
    })

    it("SENTINELLE : aucun billable_days n'est réparti artificiellement dans le calendrier", () => {
      const vm = buildProductionLeave(createInput())
      const json = JSON.stringify(vm)
      expect(json).not.toContain("collaborator_daily_activity")
      expect(json).not.toContain("day_of_month")
      expect(json).not.toContain("daily_status")
    })

    it("SENTINELLE : businessDays - productionDays n'est pas automatiquement assimilé à de l'absence", () => {
      // 22 jours ouvrés, 15 produits, 0 congés, 0 maladie, 7 non facturables (intercontrat)
      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 22,
        billable_days: 15,
        pto_days: 0,
        sick_days: 0,
        non_billable_days: 7,
        activity_rate_percent: 68.2,
        cra_status: "validated",
        tjm_snapshot: 600,
        cjm_snapshot: 332.5,
        revenue: 9000,
        employer_cost: 7316.51,
        real_margin: 1683.49,
        gross_annual: 50000,
      }

      const vm = buildProductionLeave(createInput({ activitySummaries: [summary] }))
      const m = vm.collaborators[0].currentMonth

      expect(m?.businessDays).toBe(22)
      expect(m?.productionDays).toBe(15)
      // L'écart est de 7 jours, mais ptoDays = 0, sickDays = 0, absenceBreakdown = []
      expect(m?.ptoDays).toBe(0)
      expect(m?.sickDays).toBe(0)
      expect(m?.otherAbsenceDays).toBe(0)
      expect(m?.nonBillableDays).toBe(7)
      expect(m?.absenceBreakdown).toHaveLength(0)
    })

    it("SENTINELLE : le TACI n'est pas appliqué deux fois au coût salarial", () => {
      // Vérification que le coût structurel de période est basé sur baseDailyCost (gross * (1+charges) / workingDays)
      // et NON sur baseDailyCost / taci !
      const comp: RawCompensation = {
        collaborator_id: "collab-1",
        gross_annual: 43600,
        charges_rate: 0.45,
        working_days_per_year: 218,
        taci: 0.80, // TACI = 0.8
        cjm: 363.3, // = 290.0 / 0.8
      }

      const summary: RawActivitySummary = {
        collaborator_id: "collab-1",
        period_start: "2026-09-01",
        business_days: 20,
        billable_days: 20,
        pto_days: 0,
        sick_days: 0,
        non_billable_days: 0,
        activity_rate_percent: 100,
        cra_status: "validated",
        tjm_snapshot: 500,
        cjm_snapshot: 363.3,
        revenue: 10000,
        employer_cost: 5800,
        real_margin: 4200,
        gross_annual: 43600,
      }

      const vm = buildProductionLeave(
        createInput({ compensations: [comp], activitySummaries: [summary] }),
      )
      const m = vm.collaborators[0].currentMonth

      // Base journalière réelle = 43600 * 1.45 / 218 = 290.00 €
      // Coût structurel pour 20 jours ouvrés = 290.00 * 20 = 5800.00 €
      // Si le TACI avait été appliqué au dénominateur : 290 / 0.8 = 362.50 € -> 362.50 * 20 = 7250 € (FAUX)
      expect(m?.structuralCost).toBe(5800)
    })
  })
})

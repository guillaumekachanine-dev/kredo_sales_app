import { describe, expect, it } from "vitest"
import { buildEngagementsActivityAnalytics } from "../engagements-activity-utils"
import type {
  ActivityClosureSource,
  ActivityMissionSource,
  ActivityReportSource,
  EngagementsActivitySources,
} from "../engagements-activity-types"

const NOW = new Date("2026-08-15T12:00:00.000Z") // année 2026, mois courant = août (index 7)

function mission(overrides: Partial<ActivityMissionSource> = {}): ActivityMissionSource {
  return {
    id: "m1",
    title: "Mission Alpha",
    startDate: "2026-01-01",
    endDate: null,
    companyId: "c1",
    companyName: "Client Alpha",
    collaboratorName: "Sophie Martin",
    grossMarginPct: 30,
    tjm: 700,
    cjm: 490,
    ...overrides,
  }
}

function report(overrides: Partial<ActivityReportSource> = {}): ActivityReportSource {
  return {
    id: "r1",
    missionId: "m1",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    status: "validated",
    billableDays: 18,
    businessDays: 20,
    ptoDays: 1,
    sickDays: 0,
    nonBillableDays: 1,
    activityRatePercent: 90,
    tjmSnapshot: 700,
    cjmSnapshot: 490,
    ...overrides,
  }
}

function build(
  partial: Partial<Omit<EngagementsActivitySources, "now">> = {},
) {
  return buildEngagementsActivityAnalytics({
    now: NOW,
    issues: [],
    missions: [],
    reports: [],
    closures: [],
    ...partial,
  })
}

describe("buildEngagementsActivityAnalytics — productivité (bloc 1)", () => {
  it("moyenne les activity_rate_percent non nuls par mois et laisse un trou pour les mois sans CRA", () => {
    const result = build({
      missions: [mission()],
      reports: [
        report({ id: "a", periodStart: "2026-01-01", activityRatePercent: 80 }),
        report({ id: "b", periodStart: "2026-01-15", activityRatePercent: 100 }),
        report({ id: "c", periodStart: "2026-03-01", activityRatePercent: 70 }),
      ],
    })

    const january = result.productivity.monthly[0]
    const february = result.productivity.monthly[1]
    const march = result.productivity.monthly[2]

    expect(january.rate).toBe(90)
    expect(january.craCount).toBe(2)
    expect(february.rate).toBeNull()
    expect(march.rate).toBe(70)
  })

  it("marque les mois postérieurs au mois courant comme futurs et exclut leurs CRA du YTD", () => {
    const result = build({
      missions: [mission()],
      reports: [
        report({ id: "a", periodStart: "2026-02-01", activityRatePercent: 60 }),
        report({ id: "b", periodStart: "2026-11-01", activityRatePercent: 100 }),
      ],
    })

    expect(result.productivity.monthly[10].isFuture).toBe(true)
    expect(result.productivity.monthly[1].isFuture).toBe(false)
    // YTD ne retient que février (60), pas novembre.
    expect(result.productivity.ytdAverageRate).toBe(60)
  })

  it("expose la cible métier ACTIVITY_THRESHOLDS.TARGET (85)", () => {
    expect(build().productivity.targetRate).toBe(85)
  })
})

describe("buildEngagementsActivityAnalytics — fermetures clients (bloc 2)", () => {
  const closure = (o: Partial<ActivityClosureSource>): ActivityClosureSource => ({
    id: "x",
    companyId: "c1",
    companyName: "Client Alpha",
    label: "Fermeture",
    startDate: "2026-08-01",
    endDate: "2026-08-10",
    isRecurring: false,
    ...o,
  })

  it("place les fermetures à venir avant les passées, chacune en ordre chronologique", () => {
    const result = build({
      closures: [
        closure({ id: "past", startDate: "2026-05-14", endDate: "2026-05-15" }),
        closure({ id: "future", startDate: "2026-12-24", endDate: "2027-01-02" }),
        closure({ id: "soon", startDate: "2026-08-20", endDate: "2026-08-21" }),
      ],
    })

    expect(result.closures.map((c) => c.id)).toEqual(["soon", "future", "past"])
    expect(result.closures.find((c) => c.id === "past")?.isPast).toBe(true)
    expect(result.closures.find((c) => c.id === "future")?.isPast).toBe(false)
  })

  it("détecte une fermeture d’une seule journée", () => {
    const result = build({
      closures: [closure({ id: "d", startDate: "2026-05-14", endDate: "2026-05-14" })],
    })
    expect(result.closures[0].isSingleDay).toBe(true)
  })
})

describe("buildEngagementsActivityAnalytics — rentabilité théorique vs réelle (bloc 3)", () => {
  it("calcule la marge réelle sur les snapshots CRA, jamais sur le TJM/CJM courant de la mission", () => {
    const result = build({
      // Mission passée à 700/490 (marge théo 30 %) mais les CRA ont été signés
      // à 600/480 → marge réelle = (600-480)/600 = 20 %.
      missions: [mission({ tjm: 700, cjm: 490, grossMarginPct: 30 })],
      reports: [
        report({ id: "a", tjmSnapshot: 600, cjmSnapshot: 480, billableDays: 20 }),
        report({ id: "b", tjmSnapshot: 600, cjmSnapshot: 480, billableDays: 20 }),
      ],
    })

    expect(result.marginReality.items).toHaveLength(1)
    expect(result.marginReality.items[0].theoreticalPct).toBe(30)
    expect(result.marginReality.items[0].realPct).toBe(20)
    expect(result.marginReality.items[0].gapPoints).toBe(-10)
  })

  it("reporte le collaborateur de la mission sur l’item (ou null si absent)", () => {
    const result = build({
      missions: [
        mission({ id: "with", collaboratorName: "Sophie Martin" }),
        mission({ id: "without", collaboratorName: null }),
      ],
      reports: [
        report({ id: "a", missionId: "with" }),
        report({ id: "b", missionId: "without" }),
      ],
    })

    const byId = new Map(result.marginReality.items.map((item) => [item.missionId, item]))
    expect(byId.get("with")?.collaboratorName).toBe("Sophie Martin")
    expect(byId.get("without")?.collaboratorName).toBeNull()
  })

  it("trie par écart croissant (sous-performance d’abord) et calcule les moyennes", () => {
    const result = build({
      missions: [
        mission({ id: "under", title: "Under", grossMarginPct: 40 }),
        mission({ id: "over", title: "Over", grossMarginPct: 20 }),
      ],
      reports: [
        report({ id: "u", missionId: "under", tjmSnapshot: 600, cjmSnapshot: 420, billableDays: 10 }), // réel 30 → gap -10
        report({ id: "o", missionId: "over", tjmSnapshot: 600, cjmSnapshot: 420, billableDays: 10 }), // réel 30 → gap +10
      ],
    })

    expect(result.marginReality.items.map((i) => i.missionId)).toEqual(["under", "over"])
    expect(result.marginReality.gapAvg).toBe(0)
    expect(result.marginReality.realAvg).toBe(30)
  })

  it("écarte les missions sans CRA ou sans marge théorique exploitable", () => {
    const result = build({
      missions: [
        mission({ id: "nocra" }),
        mission({ id: "notheo", grossMarginPct: null, tjm: 0, cjm: 0 }),
      ],
      reports: [report({ id: "z", missionId: "notheo" })],
    })
    expect(result.marginReality.items).toHaveLength(0)
    expect(result.marginReality.gapAvg).toBeNull()
  })
})

describe("buildEngagementsActivityAnalytics — impact absences non prévues (bloc 4)", () => {
  it("estime l’impact CA et marge à partir des snapshots du CRA porteur des jours maladie", () => {
    const result = build({
      missions: [mission()],
      reports: [
        report({ id: "a", periodStart: "2026-02-01", sickDays: 3, tjmSnapshot: 500, cjmSnapshot: 300 }),
        report({ id: "b", periodStart: "2026-04-01", sickDays: 2, tjmSnapshot: 700, cjmSnapshot: 490 }),
      ],
    })

    expect(result.unplannedAbsences.totalDays).toBe(5)
    // 3×500 + 2×700 = 2900
    expect(result.unplannedAbsences.estimatedLostRevenue).toBe(2900)
    // 3×(500-300) + 2×(700-490) = 600 + 420 = 1020
    expect(result.unplannedAbsences.estimatedLostMargin).toBe(1020)

    const february = result.unplannedAbsences.monthly[1]
    expect(february.days).toBe(3)
    expect(february.lostRevenue).toBe(1500)
  })

  it("ne retient que les 3 missions les plus impactées, classées par marge non réalisée", () => {
    const result = build({
      missions: [
        mission({ id: "m1", title: "M1" }),
        mission({ id: "m2", title: "M2" }),
        mission({ id: "m3", title: "M3" }),
        mission({ id: "m4", title: "M4" }),
      ],
      reports: [
        report({ id: "a", missionId: "m1", sickDays: 1, tjmSnapshot: 400, cjmSnapshot: 300 }),
        report({ id: "b", missionId: "m2", sickDays: 5, tjmSnapshot: 800, cjmSnapshot: 400 }),
        report({ id: "c", missionId: "m3", sickDays: 2, tjmSnapshot: 600, cjmSnapshot: 300 }),
        report({ id: "d", missionId: "m4", sickDays: 3, tjmSnapshot: 500, cjmSnapshot: 350 }),
      ],
    })

    expect(result.unplannedAbsences.topMissions.map((m) => m.missionId)).toEqual([
      "m2",
      "m3",
      "m4",
    ])
  })

  it("reste neutre quand aucun jour maladie n’est déclaré", () => {
    const result = build({ missions: [mission()], reports: [report({ sickDays: 0 })] })
    expect(result.unplannedAbsences.totalDays).toBe(0)
    expect(result.unplannedAbsences.estimatedLostRevenue).toBe(0)
    expect(result.unplannedAbsences.topMissions).toHaveLength(0)
  })
})

describe("buildEngagementsActivityAnalytics — statut", () => {
  it("passe en 'partial' quand une source a échoué", () => {
    expect(build({ issues: ["Lecture des CRA indisponible"] }).status).toBe("partial")
    expect(build().status).toBe("complete")
  })
})

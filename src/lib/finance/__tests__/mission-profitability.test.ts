import { describe, expect, it } from "vitest"
import {
  buildMissionProfitability,
  realMarginPct,
  summarizeMissionProfitability,
  theoreticalMarginPct,
  type MissionProfitabilityMissionInput,
  type MissionProfitabilityReportInput,
} from "../mission-profitability"

// ─────────────────────────────────────────────────────────────────────────────
//  Contrat canonique de rentabilité mission — SHELL-0018 Lot 7.3A.
//  Couvre les cas §17 (1→7) + le test de non-divergence §18 du cadrage.
// ─────────────────────────────────────────────────────────────────────────────

const mission = (
  overrides: Partial<MissionProfitabilityMissionInput> = {},
): MissionProfitabilityMissionInput => ({
  id: "m1",
  tjm: 800,
  cjm: 500,
  grossMarginPct: 37.5, // round((800-500)/800*100, 2)
  ...overrides,
})

const report = (
  // `id` est ignoré (le contrat n'en a pas) — simple étiquette de lisibilité des fixtures.
  overrides: Partial<MissionProfitabilityReportInput> & { id?: string } = {},
): MissionProfitabilityReportInput => {
  const { id: _id, ...rest } = overrides
  void _id
  return {
    missionId: "m1",
    periodStart: "2026-03-01",
    billableDays: 10,
    tjmSnapshot: 800,
    cjmSnapshot: 500,
    ...rest,
  }
}

describe("theoreticalMarginPct", () => {
  it("privilégie gross_margin_pct quand il est renseigné", () => {
    expect(theoreticalMarginPct({ tjm: 800, cjm: 500, grossMarginPct: 41 })).toEqual({
      marginPct: 41,
      source: "gross_margin_pct",
    })
  })

  it("retombe sur (TJM − CJM) / TJM quand gross_margin_pct est null", () => {
    expect(theoreticalMarginPct({ tjm: 800, cjm: 500, grossMarginPct: null })).toEqual({
      marginPct: 37.5,
      source: "tjm_cjm",
    })
  })

  it("renvoie unavailable quand TJM = 0 et pas de gross_margin_pct", () => {
    expect(theoreticalMarginPct({ tjm: 0, cjm: 0, grossMarginPct: null })).toEqual({
      marginPct: null,
      source: "unavailable",
    })
  })
})

describe("Cas 1 — mission sans CRA", () => {
  it("expose la marge théorique mais AUCUNE marge réelle (pas de marge inventée)", () => {
    const [row] = buildMissionProfitability([mission()], [], {
      referenceYear: 2026,
    })

    expect(row.theoretical.marginPct).toBe(37.5)
    expect(row.real.available).toBe(false)
    expect(row.real.marginPct).toBeNull()
    expect(row.real.revenue).toBe(0)
    expect(row.real.cost).toBe(0)
    expect(row.real.billableDays).toBe(0)
    // La « marge affichable » retombe sur le théorique, explicitement.
    expect(row.effectiveMarginPct).toBe(37.5)
  })
})

describe("Cas 2 — CRA avec snapshots", () => {
  it("CA 8 000, coût 5 000, marge 3 000, marge réelle 37,5 %", () => {
    const [row] = buildMissionProfitability(
      [mission()],
      [report({ billableDays: 10, tjmSnapshot: 800, cjmSnapshot: 500 })],
      { referenceYear: 2026 },
    )

    expect(row.real.revenue).toBe(8_000)
    expect(row.real.cost).toBe(5_000)
    expect(row.real.marginValue).toBe(3_000)
    expect(row.real.marginPct).toBe(37.5)
    expect(row.real.billableDays).toBe(10)
    expect(row.real.available).toBe(true)
  })
})

describe("Cas 3 — plusieurs CRA : agrégation pondérée en valeur", () => {
  it("marge réelle mission = ΣmargeValeur / ΣCA, jamais moyenne des %", () => {
    const [row] = buildMissionProfitability(
      [mission()],
      [
        report({ id: "a", billableDays: 5, tjmSnapshot: 1_000, cjmSnapshot: 500 }), // CA 5000, marge 50 %
        report({ id: "b", billableDays: 20, tjmSnapshot: 400, cjmSnapshot: 380 }), // CA 8000, marge 5 %
      ],
      { referenceYear: 2026 },
    )

    // ΣCA = 13 000 ; Σcoût = 2 500 + 7 600 = 10 100 ; marge = 2 900 / 13 000
    expect(row.real.revenue).toBe(13_000)
    expect(row.real.cost).toBe(10_100)
    expect(row.real.marginPct).toBe(round(2_900 / 13_000 * 100))
    // La moyenne naïve (50 % + 5 %) / 2 = 27,5 % serait fausse.
    expect(row.real.marginPct).not.toBe(27.5)
  })

  it("le portefeuille pondère par le CA réel, pas par le nombre de missions", () => {
    const results = buildMissionProfitability(
      [
        mission({ id: "big", grossMarginPct: 20 }),
        mission({ id: "small", grossMarginPct: 20 }),
      ],
      [
        report({ missionId: "big", billableDays: 100, tjmSnapshot: 1_000, cjmSnapshot: 700 }), // CA 100k, marge 30 %
        report({ missionId: "small", billableDays: 1, tjmSnapshot: 1_000, cjmSnapshot: 900 }), // CA 1k, marge 10 %
      ],
      { referenceYear: 2026 },
    )
    const portfolio = summarizeMissionProfitability(results)

    // Moyenne naïve = (30 + 10) / 2 = 20 %.
    // Pondérée = marge 30 100 / CA 101 000 ≈ 29,8 % (tirée par la grosse mission).
    expect(portfolio.weightedRealMarginPct).toBe(round((30_100 / 101_000) * 100))
    expect(portfolio.weightedRealMarginPct).toBeGreaterThan(29)
  })
})

describe("Cas 4 — changement de TJM/CJM en cours de mission", () => {
  it("le réel suit les snapshots historiques des CRA, pas le TJM/CJM courant", () => {
    const [row] = buildMissionProfitability(
      // Mission renégociée à 900/450 (théo 50 %)…
      [mission({ tjm: 900, cjm: 450, grossMarginPct: 50 })],
      // …mais les CRA passés ont été signés à 700/560 → réel = 20 %.
      [
        report({ id: "a", periodStart: "2026-01-01", tjmSnapshot: 700, cjmSnapshot: 560, billableDays: 15 }),
        report({ id: "b", periodStart: "2026-02-01", tjmSnapshot: 700, cjmSnapshot: 560, billableDays: 15 }),
      ],
      { referenceYear: 2026 },
    )

    expect(row.theoretical.marginPct).toBe(50)
    expect(row.real.marginPct).toBe(20)
  })
})

describe("Cas 5 — marge théorique : gross_margin_pct puis fallback", () => {
  it("utilise gross_margin_pct généré quand présent", () => {
    const [row] = buildMissionProfitability(
      [mission({ tjm: 800, cjm: 500, grossMarginPct: 37.5 })],
      [],
      { referenceYear: 2026 },
    )
    expect(row.theoretical).toEqual({ marginPct: 37.5, source: "gross_margin_pct" })
  })

  it("bascule sur (TJM − CJM) / TJM quand gross_margin_pct est absent", () => {
    const [row] = buildMissionProfitability(
      [mission({ tjm: 1_000, cjm: 600, grossMarginPct: null })],
      [],
      { referenceYear: 2026 },
    )
    expect(row.theoretical).toEqual({ marginPct: 40, source: "tjm_cjm" })
  })
})

describe("Cas 6 — zéro CA : aucune division par zéro", () => {
  it("réel indisponible, pas de NaN / Infinity", () => {
    const [row] = buildMissionProfitability(
      [mission()],
      [report({ billableDays: 0, tjmSnapshot: 800, cjmSnapshot: 500 })],
      { referenceYear: 2026 },
    )
    expect(row.real.marginPct).toBeNull()
    expect(Number.isNaN(row.real.marginValue)).toBe(false)
    expect(row.real.revenue).toBe(0)
    expect(realMarginPct([{ billableDays: 0, tjmSnapshot: 0, cjmSnapshot: 0 }])).toBeNull()
  })

  it("un CRA à coût nul ne casse pas le calcul (marge 100 %)", () => {
    const [row] = buildMissionProfitability(
      [mission()],
      [report({ billableDays: 10, tjmSnapshot: 800, cjmSnapshot: 0 })],
      { referenceYear: 2026 },
    )
    expect(row.real.marginPct).toBe(100)
  })
})

describe("Cas 7 — période", () => {
  it("civil-year ne retient que les CRA de referenceYear", () => {
    const reports = [
      report({ id: "2025", periodStart: "2025-11-01", billableDays: 10 }),
      report({ id: "2026", periodStart: "2026-02-01", billableDays: 10 }),
    ]

    const [y2026] = buildMissionProfitability([mission()], reports, { referenceYear: 2026 })
    expect(y2026.real.billableDays).toBe(10)
    expect(y2026.real.revenue).toBe(8_000)

    const [y2025] = buildMissionProfitability([mission()], reports, { referenceYear: 2025 })
    expect(y2025.real.billableDays).toBe(10)
  })

  it("lifetime agrège tous les CRA fournis quel que soit l'exercice", () => {
    const [row] = buildMissionProfitability(
      [mission()],
      [
        report({ id: "2025", periodStart: "2025-11-01", billableDays: 10 }),
        report({ id: "2026", periodStart: "2026-02-01", billableDays: 10 }),
      ],
      { period: "lifetime", referenceYear: 2026 },
    )
    expect(row.period).toBe("lifetime")
    expect(row.real.billableDays).toBe(20)
    expect(row.real.revenue).toBe(16_000)
  })

  it("le résultat porte toujours la période et l'année de référence explicites", () => {
    const [row] = buildMissionProfitability([mission()], [], { referenceYear: 2026 })
    expect(row.period).toBe("civil-year")
    expect(row.referenceYear).toBe(2026)
  })
})

describe("§18 — test de non-divergence Finance ↔ Engagements", () => {
  // Un même jeu de missions + CRA, mappé selon les deux chaînes, doit produire
  // exactement la même vérité de rentabilité mission.
  const rawMissions = [
    { id: "m-alpha", tjm: 800, cjm: 520, gross_margin_pct: 35, status: "active" },
    { id: "m-beta", tjm: 650, cjm: 500, gross_margin_pct: 23.08, status: "ended" },
    { id: "m-gamma", tjm: 900, cjm: 540, gross_margin_pct: 40, status: "active" }, // sans CRA
  ]
  const rawReports = [
    { mission_id: "m-alpha", period_start: "2026-01-01", billable_days: 18, tjm_snapshot: 780, cjm_snapshot: 520 },
    { mission_id: "m-alpha", period_start: "2026-02-01", billable_days: 20, tjm_snapshot: 800, cjm_snapshot: 530 },
    { mission_id: "m-beta", period_start: "2026-03-01", billable_days: 15, tjm_snapshot: 650, cjm_snapshot: 505 },
    { mission_id: "m-beta", period_start: "2025-12-01", billable_days: 21, tjm_snapshot: 640, cjm_snapshot: 500 },
  ]

  // Projection « Finance » : rows bruts Supabase.
  const financeView = buildMissionProfitability(
    rawMissions.map((m) => ({
      id: m.id,
      tjm: Number(m.tjm),
      cjm: Number(m.cjm),
      grossMarginPct: m.gross_margin_pct == null ? null : Number(m.gross_margin_pct),
    })),
    rawReports.map((r) => ({
      missionId: r.mission_id,
      periodStart: r.period_start,
      billableDays: r.billable_days,
      tjmSnapshot: r.tjm_snapshot,
      cjmSnapshot: r.cjm_snapshot,
    })),
    { period: "civil-year", referenceYear: 2026 },
  )

  // Projection « Engagements » : sources déjà normalisées camelCase par le loader.
  const engagementsView = buildMissionProfitability(
    rawMissions.map((m) => ({
      id: m.id,
      tjm: m.tjm,
      cjm: m.cjm,
      grossMarginPct: m.gross_margin_pct,
    })),
    rawReports.map((r) => ({
      missionId: r.mission_id,
      periodStart: r.period_start.slice(0, 10),
      billableDays: r.billable_days,
      tjmSnapshot: r.tjm_snapshot,
      cjmSnapshot: r.cjm_snapshot,
    })),
    { period: "civil-year", referenceYear: 2026 },
  )

  it("mêmes inputs → même vérité métier, mission par mission", () => {
    const byId = (rows: typeof financeView) => new Map(rows.map((r) => [r.missionId, r]))
    const f = byId(financeView)
    const e = byId(engagementsView)

    for (const id of rawMissions.map((m) => m.id)) {
      expect(f.get(id)!.real).toEqual(e.get(id)!.real)
      expect(f.get(id)!.theoretical).toEqual(e.get(id)!.theoretical)
      expect(f.get(id)!.effectiveMarginPct).toBe(e.get(id)!.effectiveMarginPct)
    }
  })

  it("le CRA 2025 de m-beta est exclu des deux côtés (contrat de période)", () => {
    const beta = financeView.find((r) => r.missionId === "m-beta")!
    // Seul le CRA de mars 2026 compte : 15 j × 650.
    expect(beta.real.revenue).toBe(15 * 650)
    expect(beta.real.billableDays).toBe(15)
  })

  it("m-gamma (sans CRA) : réel indisponible des deux côtés, théorique disponible", () => {
    const fGamma = financeView.find((r) => r.missionId === "m-gamma")!
    const eGamma = engagementsView.find((r) => r.missionId === "m-gamma")!
    expect(fGamma.real.available).toBe(false)
    expect(eGamma.real.available).toBe(false)
    expect(fGamma.theoretical.marginPct).toBe(40)
    expect(fGamma.effectiveMarginPct).toBe(40)
  })

  it("le portefeuille pondéré est identique quelle que soit la projection", () => {
    expect(summarizeMissionProfitability(financeView)).toEqual(
      summarizeMissionProfitability(engagementsView),
    )
  })
})

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

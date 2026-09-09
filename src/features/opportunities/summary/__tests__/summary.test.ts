import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { buildOpportunitiesSynthese } from "../../data/build-opportunities-synthese"
import type { PipeBucket } from "../../data/opportunities-synthese.types"
import { RevenueStrata, PipeBreakdownChart } from "../PipeBreakdownChart"
import { SkillsComparisonChart } from "../SkillsComparisonChart"
import { ProcessFlowChart } from "../ProcessFlowChart"
import { DeadlinesTable } from "../DeadlinesTable"
import { SummaryDesktop } from "../SummaryDesktop"
import { alignSkillTopFives, buildRevenueStrata, scaleLength } from "../summary-geometry"
import { formatCompactEuros, formatDeadline, formatEuros, formatNumber } from "../summary-formatters"

const bucket = (key: string, weightedValue: number): PipeBucket => ({ key, label: key, weightedValue, opportunityCount: 1 })
const markup = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element).replace(/[\u00a0\u202f]/g, " ")
const emptyVm = () => buildOpportunitiesSynthese({
  referenceDate: new Date("2026-09-09T10:00:00Z"), sharedKpis: { openNeedsCount: 7, activePositioningsCount: 12 },
  opportunities: [], positionings: [], opportunitySkills: [], vivierPersonSkills: [], vivierPersonCount: 0, offerPractices: [],
})

describe("Revenue Strata geometry", () => {
  it("uses the canonical denominator, ranks without mutating, and preserves small segments", () => {
    const buckets = [bucket("small", 0.001), bucket("large", 999.999), bucket("zero", 0)]
    const segments = buildRevenueStrata(buckets, 1000)
    expect(segments.map((s) => s.bucket.key)).toEqual(["large", "small", "zero"])
    expect(segments[1].width).toBeCloseTo(0.0001, 8)
    expect(segments[2].width).toBe(0)
    expect(segments.reduce((sum, s) => sum + s.width, 0)).toBeCloseTo(100, 10)
    expect(segments[1].x).toBe(segments[0].width)
    expect(buckets[0].key).toBe("small")
    // A divergent VM must not be normalized back to 100% by the UI.
    expect(buildRevenueStrata([bucket("one", 50)], 100)[0].width).toBe(50)
  })
  it("handles zero, empty, single category and very large values", () => {
    expect(buildRevenueStrata([], 0)).toEqual([])
    expect(buildRevenueStrata([bucket("zero", 0)], 0)[0].width).toBe(0)
    expect(buildRevenueStrata([bucket("one", 1e15)], 1e15)[0].width).toBe(100)
    expect(scaleLength(0, 0)).toBe(0)
    expect(scaleLength(2, 4, 94)).toBe(47)
  })
  it("preserves the Lot 3 sum invariants through both displayed groupings", () => {
    const vm = buildOpportunitiesSynthese({
      referenceDate: new Date("2026-09-09T00:00:00Z"), sharedKpis: { openNeedsCount: 3, activePositioningsCount: 1 },
      opportunities: Array.from({ length: 7 }, (_, i) => ({ id: `o${i}`, title: `Opportunity ${i}`, stage: "qualification", conviction: 33,
        estimated_gain: 120.67 + i, acv: i % 2 ? null : 987.65, company_id: i % 3 ? `c${i}` : null, company_name: `Client ${i}`, practice: null,
        next_action_at: null, next_action_label: null, target_close_date: null })),
      positionings: [], opportunitySkills: [], vivierPersonSkills: [], vivierPersonCount: 0, offerPractices: [],
    })
    for (const buckets of [vm.pipeByClient, vm.pipeByPractice]) {
      expect(buckets.reduce((sum, b) => sum + b.weightedValue, 0)).toBeCloseTo(vm.kpis.pipeWeightedValue, 2)
      expect(buildRevenueStrata(buckets, vm.kpis.pipeWeightedValue).reduce((sum, s) => sum + s.width, 0)).toBeCloseTo(100, 6)
    }
  })
})

describe("French formatting", () => {
  it("formats exact and compact euros, huge and absent values", () => {
    expect(formatCompactEuros(425000)).toBe("425 k€")
    expect(formatCompactEuros(1200000)).toBe("1,2 M€")
    expect(formatEuros(1234.56).replace(/[\u00a0\u202f]/g, " ")).toBe("1 234,56 €")
    expect(formatCompactEuros(0).replace(/\u00a0/g, " ")).toBe("0 €")
    expect(formatCompactEuros(1e12)).not.toContain("e+")
    for (const value of [null, undefined, NaN, Infinity]) {
      expect(formatCompactEuros(value)).toBe("—")
      expect(formatEuros(value)).toBe("—")
      expect(formatNumber(value)).toBe("—")
    }
  })
  it("uses Paris calendar days and the snapshot, including midnight and DST", () => {
    expect(formatDeadline("2026-09-09", "2026-09-09T10:00:00Z").relative).toBe("Aujourd’hui")
    expect(formatDeadline("2026-09-09T22:30:00Z", "2026-09-09T10:00:00Z").relative).toBe("Demain")
    expect(formatDeadline("2026-09-13", "2026-09-09T10:00:00Z").relative).toBe("Dans 4 j")
    expect(formatDeadline("2026-03-30T00:00:00+02:00", "2026-03-29T00:00:00+01:00").relative).toBe("Demain")
    expect(formatDeadline("2026-10-26T00:00:00+01:00", "2026-10-25T00:00:00+02:00").relative).toBe("Demain")
    expect(formatDeadline("bad", "bad")).toEqual({ absolute: "Date non renseignée", relative: "" })
    expect(formatDeadline("2026-09-13", "bad").absolute).toContain("2026")
  })
})

describe("Top 5 mirror", () => {
  const demand = Array.from({ length: 5 }, (_, i) => ({ skillId: `s${i}`, name: `Demand ${i}`, score: 10 - i, opportunityCount: 2 }))
  const supply = Array.from({ length: 5 }, (_, i) => ({ skillId: `s${i + 4}`, name: `Supply ${i}`, personCount: 5 - i, levelSum: 15 - i }))
  it("aligns identities, retains both independent ranks and does not fabricate zeros", () => {
    const rows = alignSkillTopFives(demand, supply)
    expect(rows).toHaveLength(9)
    expect(rows.filter((r) => r.demand)).toHaveLength(5)
    expect(rows.filter((r) => r.supply)).toHaveLength(5)
    expect(rows[4]).toMatchObject({ demandRank: 5, supplyRank: 1 })
    expect(rows[0].supply).toBeUndefined()
    expect(rows[8].demand).toBeUndefined()
    expect(alignSkillTopFives([], [])).toEqual([])
  })
  it("shows values, independent scales, rank, absence caveat and SVG rails", () => {
    const html = markup(createElement(SkillsComparisonChart, { demand, supply }))
    for (const text of ["Compétences", "deux échelles indépendantes", "10 pts", "5 profil(s)", "Hors Top 5", "Σ niveaux", "ne signifie pas zéro", "<svg"]) expect(html).toContain(text)
    expect(html).not.toMatch(/NaN|Infinity/)
  })
  it("names each missing population while retaining the populated side", () => {
    const html = markup(createElement(SkillsComparisonChart, { demand: [], supply }))
    expect(html).toContain("Aucune compétence demandée renseignée")
    expect(html).toContain("5 profil(s)")
    expect(markup(createElement(SkillsComparisonChart, { demand, supply: [] }))).toContain("Aucune compétence renseignée dans le vivier")
  })
})

describe("Summary components — static evidence and accessibility", () => {
  it("renders client-first toggle, every exact contribution including tiny/zero, and neutral practices", () => {
    const buckets = [bucket("Alpha", 750), bucket("Beta", 200), bucket("Gamma", 49.99), bucket("Tiny", 0.01), bucket("Zero", 0)]
    const html = markup(createElement(PipeBreakdownChart, { pipeByClient: buckets, pipeByPractice: [], total: 1000 }))
    for (const text of ["Pipe commercial", "Clients", "Practices", "aria-pressed=\"true\"", "750 €", "Tiny", "0,01 €", "Zero", "Top 3", "<svg"]) expect(html).toContain(text)
    expect((html.match(/ · Top 3/g) ?? [])).toHaveLength(3)
    const practice = markup(createElement(RevenueStrata, { buckets, total: 1000, dimension: "practices" }))
    expect(practice).toContain('fill="var(--color-muted)"')
    expect(markup(createElement(RevenueStrata, { buckets: [], total: 0, dimension: "clients" }))).toContain("Aucune valeur de pipe")
  })
  it("renders five current-stock stations including zeros, commercial stage separately", () => {
    const vm = emptyVm()
    vm.staffingFunnel[4].count = 9 // deliberately not a decreasing cumulative funnel
    const html = markup(createElement(ProcessFlowChart, { steps: vm.staffingFunnel, opportunities: [{
      opportunityId: "o1", title: "Besoin Cloud", clientName: null, stage: "qualification", stageLabel: "Qualification",
      positioningsByBucket: { identifie: 0, propose: 0, envoye_client: 0, entretien: 0, retenu: 9 }, activePositioningsCount: 9, excludedPositioningsCount: 2,
    }] }))
    for (const text of ["Identifié", "Proposé", "Envoyé client", "Entretien", "Retenu", ">9<", ">0<", "Étape commerciale", "Qualification", "pas un flux mesuré", "<details", "2 positionnement(s) exclu(s)"]) expect(html).toContain(text)
    expect(html).not.toContain("<details open")
  })
  it("keeps relative and absolute dates, action/closing uncertainty and opportunity links", () => {
    const html = markup(createElement(DeadlinesTable, { referenceAt: "2026-09-09T10:00:00Z", deadlines: [
      { opportunityId: "o1", opportunityTitle: "Audit Cloud", clientName: "Acme", kind: "action", label: "Appeler", dueAt: "2026-09-10T10:00:00Z" },
      { opportunityId: "o2", opportunityTitle: "Mission", clientName: null, kind: "closing", label: "Date de closing visée", dueAt: "2026-09-13" },
    ] }))
    for (const text of ["Demain", "10 sept. 2026", "Dans 4 j", "Action", "Closing visé", "Date de closing visée", "Client non renseigné", 'href="/missions/opps/o1"', '<th scope="col"']) expect(html).toContain(text)
  })
  it("passes canonical KPIs through, renders every methodology note and all empty states", () => {
    const vm = emptyVm()
    vm.dataNotes = ["Réserve provisoire Lot 8.", "Vivier provisoire."]
    const html = markup(createElement(SummaryDesktop, { vm }))
    for (const text of ["Besoins ouverts", "Positionnements actifs", "CA du pipe", ">7<", ">12<", "Aucune valeur de pipe", "Aucune compétence demandée", "Aucun positionnement", "Aucune échéance", ...vm.dataNotes]) expect(html).toContain(text)
    expect(html).not.toMatch(/NaN|Infinity|<canvas/)
  })
})

import { describe, expect, it } from "vitest"
import type { MissionsListRow } from "@/components/missions/MissionsListView"
import type { NeedsCoverageSnapshot } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import { buildNeedsList, resolveSelectedNeedId } from "../build-needs-list"
import { parseNeedsSelection } from "../needs-selection"
import type { NeedsFilterState } from "../opportunities-needs.types"

const NO_FILTERS: NeedsFilterState = {
  stage: null,
  priority: null,
  practice: null,
  sort: null,
  direction: null,
}

function row(overrides: Partial<MissionsListRow> = {}): MissionsListRow {
  return {
    entityId: "o1",
    entityType: "opportunite",
    title: "Besoin 1",
    status: "active",
    client: "ACME",
    amount: "100 k€",
    stage: "recherche_profil",
    priority: "normale",
    practice: "Data",
    acv: 100_000,
    estimatedGain: 90_000,
    conviction: 60,
    requiredHeadcount: 2,
    ...overrides,
  } as MissionsListRow
}

const coverage = (
  requiredHeadcount: number,
  covering: number,
): NeedsCoverageSnapshot => ({
  requiredHeadcount,
  coveringCount: covering,
  cappedCoveringCount: Math.min(covering, requiredHeadcount),
})

describe("buildNeedsList", () => {
  it("ne garde que les besoins ouverts (étape non terminale)", () => {
    const items = buildNeedsList(
      [
        row({ entityId: "open", stage: "qualification" }),
        row({ entityId: "won", stage: "gagne" }),
        row({ entityId: "lost", stage: "perdu" }),
        row({ entityId: "untreated", stage: "non_traitee" }),
      ],
      NO_FILTERS,
      {},
    )
    expect(items.map((item) => item.id)).toEqual(["open"])
  })

  it("applique les filtres partagés (stage / priority / practice) via model.ts", () => {
    const rows = [
      row({ entityId: "a", stage: "qualification", priority: "haute", practice: "Data" }),
      row({ entityId: "b", stage: "cv_envoyes", priority: "haute", practice: "Data" }),
      row({ entityId: "c", stage: "qualification", priority: "basse", practice: "Cloud" }),
    ]
    expect(
      buildNeedsList(rows, { ...NO_FILTERS, stage: "qualification" }, {}).map((i) => i.id),
    ).toEqual(["a", "c"])
    expect(
      buildNeedsList(rows, { ...NO_FILTERS, priority: "haute", practice: "Data" }, {}).map((i) => i.id),
    ).toEqual(["a", "b"])
  })

  it("applique le tri ACV (fallback estimatedGain) via model.ts", () => {
    const rows = [
      row({ entityId: "mid", acv: 50, estimatedGain: null }),
      row({ entityId: "high", acv: 200, estimatedGain: null }),
      row({ entityId: "low", acv: null, estimatedGain: 10 }),
    ]
    expect(
      buildNeedsList(rows, { ...NO_FILTERS, sort: "acv", direction: "asc" }, {}).map((i) => i.id),
    ).toEqual(["low", "mid", "high"])
    expect(
      buildNeedsList(rows, { ...NO_FILTERS, sort: "acv", direction: "desc" }, {}).map((i) => i.id),
    ).toEqual(["high", "mid", "low"])
  })

  it("attache le snapshot de couverture et le ratio plafonné", () => {
    const [item] = buildNeedsList([row({ entityId: "o1", requiredHeadcount: 2 })], NO_FILTERS, {
      o1: coverage(2, 3),
    })
    expect(item.coverage).toEqual({ requiredHeadcount: 2, coveringCount: 3, cappedCoveringCount: 2 })
    expect(item.coverageRatio).toBe(1)

    const [none] = buildNeedsList([row({ entityId: "o1" })], NO_FILTERS, {})
    expect(none.coverage).toBeNull()
    expect(none.coverageRatio).toBeNull()
  })

  it("projette proprement les champs absents de MissionsListRow", () => {
    const [item] = buildNeedsList(
      [{ entityId: "x", entityType: "opportunite", title: "T", status: "pending" } as MissionsListRow],
      NO_FILTERS,
      {},
    )
    expect(item).toMatchObject({
      id: "x",
      clientName: "Client non renseigné",
      clientLogoPath: null,
      stage: "",
      amount: "—",
      requiredHeadcount: 0,
    })
  })
})

describe("resolveSelectedNeedId", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }]

  it("garde l'id demandé s'il est dans la liste", () => {
    expect(resolveSelectedNeedId(items, "b")).toBe("b")
  })
  it("replie sur le premier si l'id demandé est absent", () => {
    expect(resolveSelectedNeedId(items, "zzz")).toBe("a")
  })
  it("replie sur le premier si aucun id demandé", () => {
    expect(resolveSelectedNeedId(items, null)).toBe("a")
  })
  it("renvoie null si la liste est vide", () => {
    expect(resolveSelectedNeedId([], "b")).toBeNull()
    expect(resolveSelectedNeedId([], null)).toBeNull()
  })
})

describe("parseNeedsSelection", () => {
  it("lit ?opp= et les filtres partagés", () => {
    const state = parseNeedsSelection({
      opp: "need-123",
      stage: "cv_envoyes",
      priority: "haute",
      practice: "Data",
      sort: "acv",
      direction: "asc",
    })
    expect(state).toEqual({
      requestedNeedId: "need-123",
      filters: {
        stage: "cv_envoyes",
        priority: "haute",
        practice: "Data",
        sort: "acv",
        direction: "asc",
      },
    })
  })

  it("renvoie des valeurs nulles quand rien n'est passé, et ignore un ?opp vide", () => {
    expect(parseNeedsSelection({})).toEqual({
      requestedNeedId: null,
      filters: { stage: null, priority: null, practice: null, sort: null, direction: null },
    })
    expect(parseNeedsSelection({ opp: "  " }).requestedNeedId).toBeNull()
    expect(parseNeedsSelection(new URLSearchParams("opp=abc&stage=qualification")).requestedNeedId).toBe("abc")
  })
})

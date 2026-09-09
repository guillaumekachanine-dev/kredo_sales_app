import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  shared: vi.fn(),
  detail: vi.fn(),
  staffing: vi.fn(),
}))

vi.mock("@/app/(app)/missions/_data/get-opportunities-list", () => ({ getOpportunitiesList: mocks.list }))
vi.mock("@/app/(app)/missions/_data/get-needs-staffing-shared", () => ({ getNeedsStaffingSharedData: mocks.shared }))
vi.mock("@/app/(app)/missions/_data/get-opportunity-detail", () => ({ getOpportunityDetail: mocks.detail }))
vi.mock("@/app/(app)/staffing/_data/get-staffings-list", () => ({ getStaffingsList: mocks.staffing }))

import { getNeedsChapterData } from "../get-needs-chapter-data"
import type { NeedsSelectionState } from "../opportunities-needs.types"

const NO_SELECTION: NeedsSelectionState = {
  requestedNeedId: null,
  filters: { stage: null, priority: null, practice: null, sort: null, direction: null },
}

const listRow = (id: string, extra: Record<string, unknown> = {}) => ({
  entityId: id, entityType: "opportunite", title: `Besoin ${id}`, status: "active",
  client: "ACME", amount: "10 k€", stage: "recherche_profil", priority: "normale",
  practice: "Data", acv: 10_000, estimatedGain: null, conviction: 50, requiredHeadcount: 1, ...extra,
})

const staffingRow = (id: string, opportunityId: string, status: string) => ({
  id, opportunityId, status, opportunityTitle: "x", opportunityPriority: "normale",
  practice: null, profilePractice: null, clientName: "ACME", personId: `p-${id}`, fullName: "N",
} as unknown)

beforeEach(() => {
  vi.resetAllMocks()
  mocks.list.mockResolvedValue([listRow("a"), listRow("b"), listRow("gagne", { stage: "gagne" })])
  mocks.shared.mockResolvedValue({
    kpis: { openNeedsCount: 2, activePositioningsCount: 0, coverageRate: 0 },
    openNeeds: [],
    coverageByOpportunityId: { a: { requiredHeadcount: 1, coveringCount: 1, cappedCoveringCount: 1 } },
  })
  mocks.detail.mockResolvedValue({ data: { opportunity: { id: "a" } } })
  mocks.staffing.mockResolvedValue([
    staffingRow("s1", "a", "envoye_client"), // actif
    staffingRow("s2", "a", "abandonne"), // terminal négatif → exclu
    staffingRow("s3", "b", "identifie"), // autre besoin
  ])
})

describe("getNeedsChapterData", () => {
  it("ne charge le détail QUE du besoin sélectionné, une seule fois", async () => {
    const data = await getNeedsChapterData(NO_SELECTION)
    expect(data.selectedNeedId).toBe("a") // premier besoin ouvert
    expect(mocks.detail).toHaveBeenCalledTimes(1)
    expect(mocks.detail).toHaveBeenCalledWith("a")
    expect(data.selectedNeedDetail).toEqual({ opportunity: { id: "a" } })
  })

  it("exclut les besoins terminaux de la liste et attache la couverture", async () => {
    const data = await getNeedsChapterData(NO_SELECTION)
    expect(data.items.map((i) => i.id)).toEqual(["a", "b"])
    expect(data.items[0].coverageRatio).toBe(1)
    expect(data.items[1].coverage).toBeNull()
  })

  it("ne remonte que les positionnements ACTIFS du besoin sélectionné", async () => {
    const data = await getNeedsChapterData({ ...NO_SELECTION, requestedNeedId: "a" })
    expect(data.activeStaffing.map((s) => (s as { id: string }).id)).toEqual(["s1"])
  })

  it("respecte l'?opp= demandé s'il est dans la liste", async () => {
    const data = await getNeedsChapterData({ ...NO_SELECTION, requestedNeedId: "b" })
    expect(data.selectedNeedId).toBe("b")
    expect(mocks.detail).toHaveBeenCalledWith("b")
    expect(data.dataNotes).toEqual([])
  })

  it("replie la sélection + pose une dataNote quand l'?opp= est introuvable", async () => {
    const data = await getNeedsChapterData({ ...NO_SELECTION, requestedNeedId: "gagne" })
    expect(data.selectedNeedId).toBe("a")
    expect(data.dataNotes[0]).toContain("repliée sur le premier")
  })

  it("ne charge aucun détail et signale l'absence de résultat sous filtre", async () => {
    const data = await getNeedsChapterData({
      ...NO_SELECTION,
      filters: { ...NO_SELECTION.filters, practice: "Cybersecurity" },
    })
    expect(data.items).toEqual([])
    expect(data.selectedNeedId).toBeNull()
    expect(mocks.detail).not.toHaveBeenCalled()
    expect(data.dataNotes).toContain("Aucun besoin ouvert ne correspond aux filtres actifs.")
  })

  it("propage l'erreur de détail en dataNote", async () => {
    mocks.detail.mockResolvedValue({ error: "Opportunité introuvable." })
    const data = await getNeedsChapterData(NO_SELECTION)
    expect(data.selectedNeedDetail).toBeNull()
    expect(data.selectedNeedDetailError).toBe("Opportunité introuvable.")
    expect(data.dataNotes.some((note) => note.includes("Opportunité introuvable."))).toBe(true)
  })
})

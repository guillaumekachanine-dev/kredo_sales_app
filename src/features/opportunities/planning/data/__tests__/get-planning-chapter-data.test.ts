import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  deadlines: vi.fn(),
  detail: vi.fn(),
}))

vi.mock("@/app/(app)/missions/_data/get-opportunities-list", () => ({
  getOpportunitiesList: mocks.list,
}))
vi.mock("../get-opportunity-deadlines", () => ({
  getOpportunityDeadlines: mocks.deadlines,
}))
vi.mock("@/app/(app)/missions/_data/get-opportunity-detail", () => ({
  getOpportunityDetail: mocks.detail,
}))

import { getPlanningChapterData } from "../get-planning-chapter-data"

beforeEach(() => {
  vi.resetAllMocks()
  mocks.list.mockResolvedValue([
    {
      entityId: "o1",
      entityType: "opportunite",
      title: "Migration cloud",
      client: "ACME",
      stage: "qualification",
      priority: "haute",
      status: "active",
    },
  ])
  mocks.deadlines.mockResolvedValue([])
  mocks.detail.mockResolvedValue({ data: { opportunity: { id: "o1" } } })
})
describe("getPlanningChapterData", () => {
  it("compose les loaders existants puis ne charge que le détail sélectionné", async () => {
    const reference = new Date("2026-09-09T12:00:00Z")
    const data = await getPlanningChapterData("o1", reference)

    expect(mocks.deadlines).toHaveBeenCalledWith(reference)
    expect(mocks.detail).toHaveBeenCalledTimes(1)
    expect(mocks.detail).toHaveBeenCalledWith("o1")
    expect(data.selectedOpportunityId).toBe("o1")
    expect(data.referenceDateIso).toBe(reference.toISOString())
  })

  it("ne charge aucun détail quand la liste ouverte est vide", async () => {
    mocks.list.mockResolvedValue([])
    const data = await getPlanningChapterData("invalide", new Date("2026-09-09T12:00:00Z"))
    expect(data.selectedOpportunityId).toBeNull()
    expect(mocks.detail).not.toHaveBeenCalled()
  })
})

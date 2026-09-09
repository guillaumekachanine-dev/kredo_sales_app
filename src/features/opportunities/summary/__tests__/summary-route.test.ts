import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactElement } from "react"
import { buildOpportunitiesSynthese } from "../../data/build-opportunities-synthese"

const mocks = vi.hoisted(() => ({
  device: vi.fn(),
  synthese: vi.fn(),
  shared: vi.fn(),
  needs: vi.fn(),
  mobileStaffing: vi.fn(),
  needsChapter: vi.fn(),
  planningChapter: vi.fn(),
}))

vi.mock("@/lib/dashboard/dashboard-device", () => ({ getDashboardDevice: mocks.device }))
vi.mock("@/features/opportunities/data/get-opportunities-synthese", () => ({ getOpportunitiesSynthese: mocks.synthese }))
vi.mock("@/app/(app)/missions/_data/get-needs-staffing-shared", () => ({ getNeedsStaffingSharedData: mocks.shared }))
vi.mock("@/app/(app)/missions/_data/get-opportunities-list", () => ({ getOpportunitiesList: mocks.needs }))
vi.mock("@/app/(app)/staffing/_data/get-staffings-list", () => ({ getMobileStaffingsList: mocks.mobileStaffing }))
vi.mock("@/features/opportunities/needs/data/get-needs-chapter-data", () => ({ getNeedsChapterData: mocks.needsChapter }))
vi.mock("@/features/opportunities/planning/data/get-planning-chapter-data", () => ({ getPlanningChapterData: mocks.planningChapter }))
vi.mock("@/components/needs-staffing/NeedsStaffingWorkspace", () => ({ NeedsStaffingWorkspace: () => null }))
vi.mock("@/features/opportunities/desktop/OpportunitiesDesktopShell", () => ({ OpportunitiesDesktopShell: () => null }))
vi.mock("@/features/opportunities/needs/NeedsDesktop", () => ({ NeedsDesktop: () => null }))
vi.mock("@/features/opportunities/planning/PlanningDesktop", () => ({ PlanningDesktop: () => null }))
vi.mock("@/features/opportunities/modules/OpportunitiesModulesHost", () => ({
  OpportunitiesModulesHost: () => null,
}))

import Page from "@/app/(app)/missions/opps/page"
import { SummaryDesktop } from "../SummaryDesktop"
import { NeedsStaffingWorkspace } from "@/components/needs-staffing/NeedsStaffingWorkspace"
import { NeedsDesktop } from "@/features/opportunities/needs/NeedsDesktop"
import { PlanningDesktop } from "@/features/opportunities/planning/PlanningDesktop"
import { OpportunitiesModulesHost } from "@/features/opportunities/modules/OpportunitiesModulesHost"

/**
 * Depuis le Lot 10 le shell reçoit `[contenuChapitre, <OpportunitiesModulesHost>?]`.
 * Le premier enfant est toujours le contenu du chapitre actif.
 */
function chapterChild(page: { props: { children: unknown } }): ReactElement {
  const { children } = page.props
  return (Array.isArray(children) ? children[0] : children) as ReactElement
}

const vm = buildOpportunitiesSynthese({
  referenceDate: new Date("2026-09-09T00:00:00Z"),
  sharedKpis: { openNeedsCount: 0, activePositioningsCount: 0 },
  opportunities: [],
  positionings: [],
  opportunitySkills: [],
  vivierPersonSkills: [],
  vivierPersonCount: 0,
  offerPractices: [],
})

const needsData = {
  items: [],
  openNeeds: [],
  selectedNeedId: null,
  selectedNeedDetail: null,
  selectedNeedDetailError: null,
  activeStaffing: [],
  filters: { stage: null, priority: null, practice: null, sort: null, direction: null },
  dataNotes: [],
}

const planningData = {
  items: [],
  selectedOpportunityId: null,
  selectedOpportunityDetail: null,
  selectedOpportunityDetailError: null,
  referenceDateIso: "2026-09-09T12:00:00.000Z",
  dataNotes: [],
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.device.mockResolvedValue("desktop")
  mocks.synthese.mockResolvedValue(vm)
  mocks.needsChapter.mockResolvedValue(needsData)
  mocks.planningChapter.mockResolvedValue(planningData)
  mocks.shared.mockResolvedValue({ kpis: {} })
  mocks.needs.mockResolvedValue([])
  mocks.mobileStaffing.mockResolvedValue([])
})

describe("Synthèse route device and section isolation", () => {
  it.each([{}, { section: "synthese" }])("loads the canonical VM once for desktop %j", async (query) => {
    const page = await Page({ searchParams: Promise.resolve(query) })
    const child = chapterChild(page) as ReactElement<{ vm: typeof vm }>
    expect(child.type).toBe(SummaryDesktop)
    expect(child.props.vm).toBe(vm)
    expect(mocks.synthese).toHaveBeenCalledTimes(1)
    expect(mocks.needsChapter).not.toHaveBeenCalled()
    expect(mocks.shared).not.toHaveBeenCalled()
  })

  it.each([{}, { section: "synthese" }, { scope: "staffing" }])(
    "keeps mobile on the legacy view without loading Synthèse %j",
    async (query) => {
      mocks.device.mockResolvedValue("mobile")
      const page = await Page({ searchParams: Promise.resolve(query) })
      expect(page.type).toBe(NeedsStaffingWorkspace)
      expect(mocks.synthese).not.toHaveBeenCalled()
      expect(mocks.needsChapter).not.toHaveBeenCalled()
      expect(mocks.mobileStaffing).toHaveBeenCalledTimes(1)
      expect(mocks.needs).toHaveBeenCalledWith({ onlyStaffingNeeds: true })
    },
  )

  it("mounts NeedsDesktop for ?section=besoins (desktop) and loads only the chapter data", async () => {
    const page = await Page({ searchParams: Promise.resolve({ section: "besoins", opp: "n1" }) })
    expect(chapterChild(page).type).toBe(NeedsDesktop)
    expect(mocks.needsChapter).toHaveBeenCalledTimes(1)
    expect(mocks.needsChapter).toHaveBeenCalledWith(
      expect.objectContaining({ requestedNeedId: "n1" }),
    )
    expect(mocks.synthese).not.toHaveBeenCalled()
  })

  it("?scope=needs (desktop) resolves to the Besoins chapter", async () => {
    await Page({ searchParams: Promise.resolve({ scope: "needs" }) })
    expect(mocks.needsChapter).toHaveBeenCalledTimes(1)
    expect(mocks.synthese).not.toHaveBeenCalled()
  })

  it("renders the structural avant-vente chapter without loading anything", async () => {
    await Page({ searchParams: Promise.resolve({ section: "avant-vente" }) })
    expect(mocks.synthese).not.toHaveBeenCalled()
    expect(mocks.needsChapter).not.toHaveBeenCalled()
    expect(mocks.planningChapter).not.toHaveBeenCalled()
  })

  it("mounts PlanningDesktop and restores ?opp= through the planning loader", async () => {
    const page = await Page({ searchParams: Promise.resolve({ section: "planning", opp: "o1" }) })
    expect(chapterChild(page).type).toBe(PlanningDesktop)
    expect(mocks.planningChapter).toHaveBeenCalledWith("o1")
    expect(mocks.synthese).not.toHaveBeenCalled()
    expect(mocks.needsChapter).not.toHaveBeenCalled()
  })

  it("no ?module= → no modules host mounted", async () => {
    const page = await Page({ searchParams: Promise.resolve({ section: "planning" }) })
    const children = page.props.children as unknown[]
    expect(Array.isArray(children) ? children[1] : null).toBeNull()
  })

  it("?module=simulation → mounts OpportunitiesModulesHost as a sibling of the chapter", async () => {
    const page = await Page({
      searchParams: Promise.resolve({ section: "planning", opp: "o1", module: "simulation" }),
    })
    const [chapter, host] = page.props.children as [
      ReactElement,
      ReactElement<{ activeModule: string; closeHref: string }>,
    ]
    expect(chapter.type).toBe(PlanningDesktop)
    expect(host.type).toBe(OpportunitiesModulesHost)
    expect(host.props.activeModule).toBe("simulation")
    expect(host.props.closeHref).toBe("/missions/opps?section=planning&opp=o1")
  })

  it("?module=matching on synthèse is ignored (not applicable) — no host", async () => {
    const page = await Page({
      searchParams: Promise.resolve({ section: "synthese", module: "matching" }),
    })
    const children = page.props.children as unknown[]
    expect(Array.isArray(children) ? children[1] : null).toBeNull()
  })
})

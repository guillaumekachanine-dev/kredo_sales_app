import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactElement } from "react"
import { buildOpportunitiesSynthese } from "../../data/build-opportunities-synthese"

const mocks = vi.hoisted(() => ({
  device: vi.fn(), synthese: vi.fn(), shared: vi.fn(), needs: vi.fn(), needsPlanning: vi.fn(),
  staffing: vi.fn(), mobileStaffing: vi.fn(), staffingPlanning: vi.fn(),
}))
vi.mock("@/lib/dashboard/dashboard-device", () => ({ getDashboardDevice: mocks.device }))
vi.mock("@/features/opportunities/data/get-opportunities-synthese", () => ({ getOpportunitiesSynthese: mocks.synthese }))
vi.mock("@/app/(app)/missions/_data/get-needs-staffing-shared", () => ({ getNeedsStaffingSharedData: mocks.shared }))
vi.mock("@/app/(app)/missions/_data/get-opportunities-list", () => ({ getOpportunitiesList: mocks.needs }))
vi.mock("@/app/(app)/missions/_data/get-opportunities-planning", () => ({ getOpportunitiesPlanning: mocks.needsPlanning }))
vi.mock("@/app/(app)/staffing/_data/get-staffings-list", () => ({ getStaffingsList: mocks.staffing, getMobileStaffingsList: mocks.mobileStaffing }))
vi.mock("@/app/(app)/staffing/_data/get-staffings-planning", () => ({ getStaffingsPlanning: mocks.staffingPlanning }))
vi.mock("@/components/needs-staffing/NeedsStaffingWorkspace", () => ({ NeedsStaffingWorkspace: () => null }))
vi.mock("@/features/opportunities/desktop/OpportunitiesDesktopShell", () => ({ OpportunitiesDesktopShell: () => null }))

import Page from "@/app/(app)/missions/opps/page"
import { SummaryDesktop } from "../SummaryDesktop"
import { NeedsStaffingWorkspace } from "@/components/needs-staffing/NeedsStaffingWorkspace"

const vm = buildOpportunitiesSynthese({ referenceDate: new Date("2026-09-09T00:00:00Z"),
  sharedKpis: { openNeedsCount: 0, activePositioningsCount: 0 }, opportunities: [], positionings: [],
  opportunitySkills: [], vivierPersonSkills: [], vivierPersonCount: 0, offerPractices: [],
})

beforeEach(() => {
  vi.resetAllMocks()
  mocks.device.mockResolvedValue("desktop")
  mocks.synthese.mockResolvedValue(vm)
  mocks.shared.mockResolvedValue({ kpis: {} })
  for (const mock of [mocks.needs, mocks.needsPlanning, mocks.staffing, mocks.mobileStaffing, mocks.staffingPlanning]) mock.mockResolvedValue([])
})

describe("Synthèse route device and section isolation", () => {
  it.each([{}, { section: "synthese" }])("loads the canonical VM once for desktop %j", async (query) => {
    const page = await Page({ searchParams: Promise.resolve(query) })
    const child = page.props.children as ReactElement<{ vm: typeof vm }>
    expect(child.type).toBe(SummaryDesktop)
    expect(child.props.vm).toBe(vm)
    expect(mocks.synthese).toHaveBeenCalledTimes(1)
    expect(mocks.shared).not.toHaveBeenCalled()
    expect(mocks.needs).not.toHaveBeenCalled()
  })
  it.each([{}, { section: "synthese" }, { scope: "staffing" }])("keeps mobile on the legacy view without loading Synthèse %j", async (query) => {
    mocks.device.mockResolvedValue("mobile")
    const page = await Page({ searchParams: Promise.resolve(query) })
    expect(page.type).toBe(NeedsStaffingWorkspace)
    expect(mocks.synthese).not.toHaveBeenCalled()
    expect(mocks.mobileStaffing).toHaveBeenCalledTimes(1)
    expect(mocks.needs).toHaveBeenCalledWith({ onlyStaffingNeeds: true })
    expect(mocks.staffingPlanning).not.toHaveBeenCalled()
  })
  it.each(["besoins", "avant-vente", "planning"])("does not load Synthèse for %s", async (section) => {
    await Page({ searchParams: Promise.resolve({ section }) })
    expect(mocks.synthese).not.toHaveBeenCalled()
    if (section === "besoins") {
      expect(mocks.needsPlanning).toHaveBeenCalledTimes(1)
      expect(mocks.staffing).toHaveBeenCalledTimes(1)
    }
  })
})

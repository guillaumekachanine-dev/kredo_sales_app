import { beforeEach, describe, expect, it } from "vitest"
import { useStaffingDrawerStore } from "./use-staffing-drawer-store"

const INITIAL_STATE = {
  isOpen: false,
  staffingId: null,
  opportunityId: null,
  candidateId: null,
  perspective: "candidate" as const,
  activeTab: "subject" as const,
}

describe("useStaffingDrawerStore", () => {
  beforeEach(() => {
    useStaffingDrawerStore.setState(INITIAL_STATE)
  })

  it("maps legacy candidate tabs to the shared assistance case tabs", () => {
    useStaffingDrawerStore.getState().openStaffingDrawer("positioning-1", "recrutement")

    expect(useStaffingDrawerStore.getState()).toMatchObject({
      isOpen: true,
      staffingId: "positioning-1",
      perspective: "candidate",
      activeTab: "recruitment",
    })
  })

  it("opens an opportunity on the need perspective", () => {
    useStaffingDrawerStore.getState().openOpportunityDrawer("opportunity-1", "besoin")

    expect(useStaffingDrawerStore.getState()).toMatchObject({
      isOpen: true,
      opportunityId: "opportunity-1",
      staffingId: null,
      candidateId: null,
      perspective: "opportunity",
      activeTab: "subject",
    })
  })

  it("keeps the active tab while switching perspective and positioning", () => {
    const store = useStaffingDrawerStore.getState()
    store.openOpportunityDrawer("opportunity-1", "staffing")
    useStaffingDrawerStore.getState().selectPositioning("positioning-2", "candidate-2")
    useStaffingDrawerStore.getState().setPerspective("candidate")

    expect(useStaffingDrawerStore.getState()).toMatchObject({
      opportunityId: "opportunity-1",
      staffingId: "positioning-2",
      candidateId: "candidate-2",
      perspective: "candidate",
      activeTab: "staffing",
    })

    useStaffingDrawerStore.getState().setPerspective("opportunity")

    expect(useStaffingDrawerStore.getState().activeTab).toBe("staffing")
  })

  it("resets the complete case context when closing", () => {
    useStaffingDrawerStore.getState().openOpportunityDrawer("opportunity-1", "recrutement")
    useStaffingDrawerStore.getState().selectPositioning("positioning-1", "candidate-1")
    useStaffingDrawerStore.getState().closeStaffingDrawer()

    expect(useStaffingDrawerStore.getState()).toMatchObject(INITIAL_STATE)
  })
})

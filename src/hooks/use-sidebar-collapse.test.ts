import { beforeEach, describe, expect, it } from "vitest"
import { useSidebarCollapse } from "./use-sidebar-collapse"

describe("useSidebarCollapse", () => {
  beforeEach(() => {
    useSidebarCollapse.setState({
      isCollapsed: false,
      pendingRequest: null,
      wasExpandedBeforePanel: false,
      collapseRequestCount: 0,
    })
  })

  it("restaure une sidebar initialement développée après le dernier verrou", () => {
    const store = useSidebarCollapse.getState()

    store.requestCollapse()
    expect(useSidebarCollapse.getState()).toMatchObject({
      collapseRequestCount: 1,
      pendingRequest: true,
      wasExpandedBeforePanel: true,
    })

    store.consumeRequest()
    store.reportState(true)
    store.requestCollapse()
    expect(useSidebarCollapse.getState()).toMatchObject({
      collapseRequestCount: 2,
      pendingRequest: null,
      wasExpandedBeforePanel: true,
    })

    store.requestRestore()
    expect(useSidebarCollapse.getState()).toMatchObject({
      collapseRequestCount: 1,
      pendingRequest: null,
    })

    store.requestRestore()
    expect(useSidebarCollapse.getState()).toMatchObject({
      collapseRequestCount: 0,
      pendingRequest: false,
      wasExpandedBeforePanel: false,
    })
  })

  it("ne développe pas une sidebar déjà repliée avant le cockpit", () => {
    const store = useSidebarCollapse.getState()
    store.reportState(true)

    store.requestCollapse()
    store.requestRestore()

    expect(useSidebarCollapse.getState()).toMatchObject({
      collapseRequestCount: 0,
      pendingRequest: null,
      wasExpandedBeforePanel: false,
    })
  })

  it("ignore une restauration sans verrou actif", () => {
    useSidebarCollapse.getState().requestRestore()
    expect(useSidebarCollapse.getState().collapseRequestCount).toBe(0)
  })
})

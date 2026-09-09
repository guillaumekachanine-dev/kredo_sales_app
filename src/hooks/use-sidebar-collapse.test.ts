import { beforeEach, describe, expect, it } from "vitest"
import { useSidebarCollapse } from "./use-sidebar-collapse"

describe("useSidebarCollapse — registre de verrous externes (SHELL 6.5)", () => {
  beforeEach(() => {
    useSidebarCollapse.setState({ collapseRequestCount: 0 })
  })

  it("un verrou : requestCollapse incrémente, requestRestore décrémente", () => {
    const store = useSidebarCollapse.getState()

    store.requestCollapse()
    expect(useSidebarCollapse.getState().collapseRequestCount).toBe(1)

    store.requestRestore()
    expect(useSidebarCollapse.getState().collapseRequestCount).toBe(0)
  })

  it("deux verrous concurrents restent composables", () => {
    const store = useSidebarCollapse.getState()

    store.requestCollapse()
    store.requestCollapse()
    expect(useSidebarCollapse.getState().collapseRequestCount).toBe(2)

    store.requestRestore()
    expect(useSidebarCollapse.getState().collapseRequestCount).toBe(1)

    store.requestRestore()
    expect(useSidebarCollapse.getState().collapseRequestCount).toBe(0)
  })

  it("protège contre l'underflow (restore sans verrou actif)", () => {
    useSidebarCollapse.getState().requestRestore()
    expect(useSidebarCollapse.getState().collapseRequestCount).toBe(0)

    useSidebarCollapse.getState().requestRestore()
    useSidebarCollapse.getState().requestRestore()
    expect(useSidebarCollapse.getState().collapseRequestCount).toBe(0)
  })

  it("n'expose plus l'ancien bus d'ordre de repli/dépli", () => {
    const state = useSidebarCollapse.getState() as unknown as Record<string, unknown>
    expect("isCollapsed" in state).toBe(false)
    expect("pendingRequest" in state).toBe(false)
    expect("wasExpandedBeforePanel" in state).toBe(false)
    expect("reportState" in state).toBe(false)
    expect("consumeRequest" in state).toBe(false)
  })
})

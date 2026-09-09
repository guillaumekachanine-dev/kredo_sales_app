import { describe, expect, it, vi } from "vitest"
import { isValidElement } from "react"

// Panneaux mockés : leurs imports transitifs (next/navigation, financial-modeling,
// drawers de création) n'ont pas à se charger pour tester la composition.
vi.mock("../NeedsListPanel", () => ({ NeedsListPanel: () => null }))
vi.mock("../NeedsDetailPanel", () => ({ NeedsDetailPanel: () => null }))
vi.mock("../StaffingInProgressRail", () => ({ StaffingInProgressRail: () => null }))

import { NeedsDesktop } from "../NeedsDesktop"
import type { NeedsChapterData } from "../data/opportunities-needs.types"

const baseData: NeedsChapterData = {
  items: [],
  openNeeds: [],
  selectedNeedId: null,
  selectedNeedDetail: null,
  selectedNeedDetailError: null,
  activeStaffing: [],
  filters: { stage: null, priority: null, practice: null, sort: null, direction: null },
  dataNotes: [],
}

function triPanelProps(data: NeedsChapterData) {
  const element = NeedsDesktop({ data, searchParamsString: "" }) as {
    props: { list: unknown; main: unknown; details: unknown; ariaLabel: string }
  }
  return element.props
}

describe("NeedsDesktop", () => {
  it("rend toujours les slots list + main et nomme le chapitre", () => {
    const props = triPanelProps(baseData)
    expect(isValidElement(props.list)).toBe(true)
    expect(isValidElement(props.main)).toBe(true)
    expect(props.ariaLabel).toBe("Besoins & staffing")
  })

  it("ne passe pas de rail droit quand aucun besoin n'est sélectionné (→ aside vide)", () => {
    expect(triPanelProps(baseData).details).toBeUndefined()
  })

  it("passe le rail « Staffing en cours » dès qu'un besoin est sélectionné", () => {
    const props = triPanelProps({
      ...baseData,
      selectedNeedId: "n1",
      items: [{ id: "n1", title: "Besoin A" } as NeedsChapterData["items"][number]],
    })
    expect(isValidElement(props.details)).toBe(true)
  })
})

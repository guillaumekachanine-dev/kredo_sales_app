import { isValidElement } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("../PlanningListPanel", () => ({ PlanningListPanel: () => null }))
vi.mock("../PlanningTimeline", () => ({ PlanningTimeline: () => null }))
vi.mock("../PlanningDetailsPanel", () => ({ PlanningDetailsPanel: () => null }))

import { PlanningDesktop } from "../PlanningDesktop"
import type { PlanningChapterData } from "../data/opportunities-planning.types"

const baseData: PlanningChapterData = {
  items: [],
  selectedOpportunityId: null,
  selectedOpportunityDetail: null,
  selectedOpportunityDetailError: null,
  referenceDateIso: "2026-09-09T12:00:00.000Z",
  dataNotes: [],
}

function triPanelProps(data: PlanningChapterData) {
  const element = PlanningDesktop({ data, searchParamsString: "section=planning" }) as {
    props: { list: unknown; main: unknown; details: unknown; ariaLabel: string }
  }
  return element.props
}

describe("PlanningDesktop", () => {
  it("compose les trois zones obligatoires sur OpportunitiesTriPanel", () => {
    const props = triPanelProps(baseData)
    expect(isValidElement(props.list)).toBe(true)
    expect(isValidElement(props.main)).toBe(true)
    expect(props.details).toBeUndefined()
    expect(props.ariaLabel).toBe("Planning des opportunités")
  })

  it("alimente le rail détail dès qu'une opportunité est sélectionnée", () => {
    const props = triPanelProps({
      ...baseData,
      selectedOpportunityId: "o1",
      items: [{ id: "o1", title: "Opp" } as PlanningChapterData["items"][number]],
    })
    expect(isValidElement(props.details)).toBe(true)
  })
})

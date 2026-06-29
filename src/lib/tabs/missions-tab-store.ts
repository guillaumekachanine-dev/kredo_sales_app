import { usePathname } from "next/navigation"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { createTabStore } from "./create-tab-store"
import type { SectionTab } from "./tab-types"

export type MissionsTabScope = "engagements" | "opportunities"

export const useEngagementsTabStore = createTabStore("engagements")
export const useOpportunitiesTabStore = createTabStore("opportunities")

export function getMissionsTabScope(pathname: string | null | undefined): MissionsTabScope {
  if (pathname?.startsWith("/missions/opps")) {
    return "opportunities"
  }

  return "engagements"
}

export function useMissionsTabStore() {
  const pathname = usePathname()
  const engagementsTabStore = useEngagementsTabStore()
  const opportunitiesTabStore = useOpportunitiesTabStore()
  const assistanceCaseOpen = useStaffingDrawerStore((state) => state.isOpen)
  const assistanceCasePerspective = useStaffingDrawerStore(
    (state) => state.perspective,
  )
  const assistanceCaseOpportunityId = useStaffingDrawerStore(
    (state) => state.opportunityId,
  )
  const openOpportunityDrawer = useStaffingDrawerStore(
    (state) => state.openOpportunityDrawer,
  )

  if (getMissionsTabScope(pathname) !== "opportunities") {
    return engagementsTabStore
  }

  return {
    ...opportunitiesTabStore,
    openTab: (tab: Omit<SectionTab, "id">) => {
      if (tab.entityType === "opportunite") {
        const explicitFullNavigation =
          assistanceCaseOpen &&
          assistanceCasePerspective === "opportunity" &&
          assistanceCaseOpportunityId === tab.entityId

        if (!explicitFullNavigation) {
          openOpportunityDrawer(tab.entityId)
          return
        }
      }
      opportunitiesTabStore.openTab(tab)
    },
  }
}

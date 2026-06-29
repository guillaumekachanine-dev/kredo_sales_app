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
  const assistanceCase = useStaffingDrawerStore((state) => ({
    isOpen: state.isOpen,
    perspective: state.perspective,
    opportunityId: state.opportunityId,
    openOpportunityDrawer: state.openOpportunityDrawer,
  }))

  if (getMissionsTabScope(pathname) !== "opportunities") {
    return engagementsTabStore
  }

  return {
    ...opportunitiesTabStore,
    openTab: (tab: Omit<SectionTab, "id">) => {
      if (tab.entityType === "opportunite") {
        const explicitFullNavigation =
          assistanceCase.isOpen &&
          assistanceCase.perspective === "opportunity" &&
          assistanceCase.opportunityId === tab.entityId

        if (!explicitFullNavigation) {
          assistanceCase.openOpportunityDrawer(tab.entityId)
          return
        }
      }
      opportunitiesTabStore.openTab(tab)
    },
  }
}

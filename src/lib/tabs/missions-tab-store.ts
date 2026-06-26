import { usePathname } from "next/navigation"
import { createTabStore } from "./create-tab-store"

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

  return getMissionsTabScope(pathname) === "opportunities"
    ? opportunitiesTabStore
    : engagementsTabStore
}

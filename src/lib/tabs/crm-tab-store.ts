import { createTabStore } from "./create-tab-store"
import { recordCrmLauncherVisit } from "@/lib/crm/account-launcher-preferences"

export const useCrmTabStore = createTabStore("crm", (tab) => {
  if (tab.entityType === "company-intelligence") {
    recordCrmLauncherVisit(tab.entityId)
  }
})

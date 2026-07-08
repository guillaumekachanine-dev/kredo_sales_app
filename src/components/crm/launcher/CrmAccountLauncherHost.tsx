"use client"

import { useCrmAccountLauncherStore } from "@/hooks/use-crm-account-launcher"
import { CrmAccountLauncher } from "./CrmAccountLauncher"
import { useOpenCrmAccount } from "@/hooks/use-open-crm-account"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"

/**
 * Host global léger pour monter le CrmAccountLauncher dans l'AppOverlayHosts.
 * Évite les imports lourds et synchronise l'ouverture avec le store global.
 */
export function CrmAccountLauncherHost({ device }: { device: DashboardDevice }) {
  const { isOpen, close } = useCrmAccountLauncherStore()
  const openCrmAccount = useOpenCrmAccount()

  return (
    <CrmAccountLauncher
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      device={device}
      onSelectAccount={openCrmAccount}
    />
  )
}

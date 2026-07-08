"use client"

import dynamic from "next/dynamic"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"

const EventDrawer = dynamic(
  () => import("@/components/events/EventDrawer").then((mod) => mod.EventDrawer),
  { ssr: false },
)

const StaffingDrawer = dynamic(
  () => import("@/components/staffing").then((mod) => mod.StaffingDrawer),
  { ssr: false },
)

const CrmIdentityDrawerHost = dynamic(
  () =>
    import("@/components/accounts-contacts/CrmIdentityDrawerHost").then(
      (mod) => mod.CrmIdentityDrawerHost,
    ),
  { ssr: false },
)

const CommunicationComposerHost = dynamic(
  () =>
    import("@/components/communication/CommunicationComposerHost").then(
      (mod) => mod.CommunicationComposerHost,
    ),
  { ssr: false },
)

const ReportGenerationHost = dynamic(
  () => import("@/components/reports/ReportGenerationHost").then((mod) => mod.ReportGenerationHost),
  { ssr: false },
)

const CrmAccountLauncherHost = dynamic(
  () =>
    import("@/components/crm/launcher/CrmAccountLauncherHost").then(
      (mod) => mod.CrmAccountLauncherHost,
    ),
  { ssr: false },
)

interface AppOverlayHostsProps {
  device: DashboardDevice
}

export function AppOverlayHosts({ device }: AppOverlayHostsProps) {
  return (
    <>
      <EventDrawer />
      <StaffingDrawer />
      <CrmIdentityDrawerHost />
      <CommunicationComposerHost device={device} />
      <ReportGenerationHost />
      <CrmAccountLauncherHost device={device} />
    </>
  )
}

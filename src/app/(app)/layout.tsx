import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { AppShell } from "@/components/layout/AppShell"
import { EventDrawer } from "@/components/events/EventDrawer"
import { StaffingDrawer } from "@/components/staffing"
import { CrmIdentityDrawerHost } from "@/components/accounts-contacts/CrmIdentityDrawerHost"
import { CommunicationComposerHost } from "@/components/communication/CommunicationComposerHost"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const device = await getDashboardDevice()

  return (
    <AppShell device={device}>
      {children}
      <EventDrawer />
      <StaffingDrawer />
      <CrmIdentityDrawerHost />
      <CommunicationComposerHost device={device} />
    </AppShell>
  )
}

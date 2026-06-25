import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { AppShell } from "@/components/layout/AppShell"
import { EventDrawer } from "@/components/events/EventDrawer"

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
    </AppShell>
  )
}

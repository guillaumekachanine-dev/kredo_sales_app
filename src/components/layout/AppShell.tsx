import { cookies } from "next/headers"
import { DesktopSidebar } from "./DesktopSidebar"
import { AppHeader } from "./AppHeader"
import { MobileNav } from "./MobileNav"
import { IntelligencePanel } from "@/components/intelligence/IntelligencePanel"
import { IntelligenceFAB } from "@/components/intelligence/IntelligenceFAB"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"

interface AppShellProps {
  device: DashboardDevice
  children: React.ReactNode
}

export async function AppShell({ device, children }: AppShellProps) {
  const isMobile = device === "mobile"

  if (isMobile) {
    return (
      <div className="flex min-h-[100dvh] min-w-0 max-w-full flex-col overflow-x-clip bg-canvas">
        <main
          className="flex-1 overflow-y-auto overflow-x-clip pt-[max(var(--space-3),var(--safe-area-top))] pb-[var(--layout-mobile-content-bottom-offset)] min-w-0 max-w-full"
        >
          {children}
        </main>

        <IntelligenceFAB />
        <MobileNav />
      </div>
    )
  }

  const cookieStore = await cookies()
  const defaultCollapsed = cookieStore.get("kredo_sidebar_collapsed")?.value === "true"

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      <DesktopSidebar defaultCollapsed={defaultCollapsed} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader />

        <div className="flex-1 flex min-h-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto min-w-0">
            {children}
          </main>

          <IntelligencePanel />
        </div>
      </div>
    </div>
  )
}

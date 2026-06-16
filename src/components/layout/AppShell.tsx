import { cookies } from "next/headers"
import { DesktopSidebar } from "./DesktopSidebar"
import { AppHeader } from "./AppHeader"
import { MobileNav } from "./MobileNav"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"

interface AppShellProps {
  device: DashboardDevice
  children: React.ReactNode
}

export async function AppShell({ device, children }: AppShellProps) {
  const isMobile = device === "mobile"

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        <main
          className="flex-1 overflow-y-auto pt-[max(var(--space-3),var(--safe-area-top))] pb-[var(--layout-mobile-content-bottom-offset)]"
        >
          {children}
        </main>

        <MobileNav />
      </div>
    )
  }

  const cookieStore = await cookies()
  const defaultCollapsed = cookieStore.get("kredo_sidebar_collapsed")?.value === "true"

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-canvas">
      <DesktopSidebar defaultCollapsed={defaultCollapsed} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

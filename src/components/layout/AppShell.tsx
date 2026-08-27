import { cookies } from "next/headers"
import { DesktopSidebar } from "./DesktopSidebar"
import { MobileNav } from "./MobileNav"
import { IntelligencePanel } from "@/components/intelligence/IntelligencePanel"
import { IntelligenceFAB } from "@/components/intelligence/IntelligenceFAB"
import { IntelligenceToggle } from "@/components/intelligence/IntelligenceToggle"
import { MobileAccountQuickSearchHost } from "@/components/accounts-contacts/MobileAccountQuickSearchHost"
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
          data-kredo-mobile-scroll-root="true"
          className="flex-1 flex flex-col overflow-y-auto overflow-x-clip pt-[var(--space-3)] pb-[var(--layout-mobile-content-bottom-offset)] min-w-0 max-w-full"
        >
          {children}
        </main>

        <IntelligenceFAB />
        <MobileNav />
        <MobileAccountQuickSearchHost />
      </div>
    )
  }

  const cookieStore = await cookies()
  const defaultCollapsed = cookieStore.get("kredo_sidebar_collapsed")?.value === "true"

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      <DesktopSidebar defaultCollapsed={defaultCollapsed} />

      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        {/* Main scrollable content with top-right floating Intelligence button */}
        <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
            {children}
          </main>

          {/* Absolute floating Intelligence toggle */}
          <div className="pointer-events-none absolute right-4 top-3 z-30">
            <div className="pointer-events-auto">
              <IntelligenceToggle />
            </div>
          </div>
        </div>

        <IntelligencePanel />
      </div>
    </div>
  )
}

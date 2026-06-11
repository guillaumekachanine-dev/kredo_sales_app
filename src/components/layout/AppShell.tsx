import { DesktopSidebar } from "./DesktopSidebar"
import { AppHeader } from "./AppHeader"
import { MobileNav } from "./MobileNav"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"

interface AppShellProps {
  device: DashboardDevice
  children: React.ReactNode
}

export function AppShell({ device, children }: AppShellProps) {
  const isMobile = device === "mobile"

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        {/* Main Content Area */}
        <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-y-auto">
          {children}
        </main>

        {/* Mobile Navigation — bottom nav bleue + rail d'onglets contextuel */}
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-canvas">
      {/* Desktop Sidebar (Left) */}
      <DesktopSidebar />

      {/* Main Container (Right) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <AppHeader />
        
        {/* Scrollable Work Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

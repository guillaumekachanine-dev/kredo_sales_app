import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getCockpitDesktopSnapshot } from "@/lib/cockpit/cockpit-desktop-data"
import { getStaffingDashboardData } from "@/lib/staffing/staffing-data"
import { getSyntheseData } from "@/lib/prospection/synthese-data"
import { getAgendaEvents } from "@/lib/agenda/agenda-actions"
import { CockpitDesktopDashboard } from "./CockpitDesktopDashboard"
import { CockpitMobileDashboard } from "./CockpitMobileDashboard"
import { getWorkspaceDiagnostic } from "@/lib/intelligence/diagnostic/get-workspace-diagnostic"

// Server Component: selects the device branch before loading branch-specific data (ADR-0006).
export async function SyntheseCockpitSection() {
  const device = await getDashboardDevice()

  if (device === "desktop") {
    const [data, diagnostic] = await Promise.all([
      getCockpitDesktopSnapshot(),
      getWorkspaceDiagnostic(),
    ])
    return <CockpitDesktopDashboard data={data} diagnostic={diagnostic} />
  }

  // Mobile layout loads extra contextual data
  const monday = new Date()
  const currentDay = monday.getDay()
  const diff = monday.getDate() - currentDay + (currentDay === 0 ? -6 : 1) // Get Monday of this week
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)

  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(23, 59, 59, 999)

  const [staffingData, syntheseData, calendarEvents, diagnostic] = await Promise.all([
    getStaffingDashboardData(),
    getSyntheseData(),
    getAgendaEvents(monday.toISOString(), friday.toISOString()),
    getWorkspaceDiagnostic(),
  ])

  return (
    <CockpitMobileDashboard
      staffingData={staffingData}
      syntheseData={syntheseData}
      calendarEvents={calendarEvents}
      diagnostic={diagnostic}
    />
  )
}

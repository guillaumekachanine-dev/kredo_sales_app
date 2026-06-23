import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getCockpitDashboardData } from "@/lib/cockpit/cockpit-data"
import { getStaffingDashboardData } from "@/lib/staffing/staffing-data"
import { getSyntheseData } from "@/lib/prospection/synthese-data"
import { getAgendaEvents } from "@/lib/agenda/agenda-actions"
import { CockpitDesktopDashboard } from "./CockpitDesktopDashboard"
import { CockpitMobileDashboard } from "./CockpitMobileDashboard"

// Server Component: sniffs device and loads dataset in parallel (ADR-0006)
export async function SyntheseCockpitSection() {
  const [device, data] = await Promise.all([
    getDashboardDevice(),
    getCockpitDashboardData(),
  ])

  if (device === "desktop") {
    return <CockpitDesktopDashboard data={data} />
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

  const [staffingData, syntheseData, calendarEvents] = await Promise.all([
    getStaffingDashboardData(),
    getSyntheseData(),
    getAgendaEvents(monday.toISOString(), friday.toISOString()),
  ])

  return (
    <CockpitMobileDashboard
      data={data}
      staffingData={staffingData}
      syntheseData={syntheseData}
      calendarEvents={calendarEvents}
    />
  )
}

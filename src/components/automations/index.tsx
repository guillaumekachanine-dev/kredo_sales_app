import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getAutomationsDashboardData } from "@/lib/automations/automations-data"
import { AutomationsDesktopDashboard } from "./AutomationsDesktopDashboard"
import { AutomationsMobileDashboard } from "./AutomationsMobileDashboard"

// Server Component : détecte l'appareil et charge les données en parallèle (ADR-0006).
// Remplace l'ancien SectionDashboardTemplate + mockAutomationsDashboardData
// (Monitoring IA Lot 1) — plus aucune donnée fictive affichée sur cette page.
export async function AutomationsSection() {
  const [device, data] = await Promise.all([
    getDashboardDevice(),
    getAutomationsDashboardData(),
  ])

  return device === "desktop" ? (
    <AutomationsDesktopDashboard data={data} />
  ) : (
    <AutomationsMobileDashboard data={data} />
  )
}

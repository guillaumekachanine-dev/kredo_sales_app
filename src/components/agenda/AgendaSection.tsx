import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { AgendaDesktopPage } from "./AgendaDesktopPage"
import { AgendaMobilePage } from "./AgendaMobilePage"

export async function AgendaSection() {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    return <AgendaMobilePage />
  }

  return <AgendaDesktopPage />
}


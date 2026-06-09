import { headers } from "next/headers"
import { DashboardDevice } from "./dashboard-types"

export async function getDashboardDevice(): Promise<DashboardDevice> {
  const headersList = await headers()
  const userAgent = headersList.get("user-agent") || ""

  // Regular expression to check for common mobile device keywords
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

  return isMobile ? "mobile" : "desktop"
}

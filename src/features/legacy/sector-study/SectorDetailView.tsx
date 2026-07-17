import React from "react"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectorDetailDesktop } from "./desktop/SectorDetailDesktop"
import { SectorDetailMobile } from "./mobile/SectorDetailMobile"
import type { SectorWithRelations } from "@/types/sector"

export async function SectorDetailView({ sector }: { sector: SectorWithRelations }) {
  const device = await getDashboardDevice()
  
  if (device === "desktop") {
    return <SectorDetailDesktop sector={sector} />
  }

  return <SectorDetailMobile sector={sector} />
}

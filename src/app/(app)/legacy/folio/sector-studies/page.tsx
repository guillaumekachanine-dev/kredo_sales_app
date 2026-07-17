import React from "react"
import { getFolioSectorStudies } from "@/features/legacy/folio/folio-loader"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { FolioSectorStudiesCatalogue } from "@/features/legacy/folio/FolioSectorStudiesCatalogue"

export default async function FolioSectorStudiesPage() {
  const [studiesResponse, device] = await Promise.all([
    getFolioSectorStudies(),
    getDashboardDevice(),
  ])

  return (
    <FolioSectorStudiesCatalogue
      initialStudies={studiesResponse.success ? studiesResponse.data : []}
      device={device}
    />
  )
}

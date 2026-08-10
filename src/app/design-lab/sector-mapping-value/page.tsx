import type { Metadata } from "next"
import { SECTOR_MAP_FIXTURES } from "@/features/sector-mapping/fixtures"
import { SectorMapMobile } from "@/features/sector-mapping/mobile/SectorMapMobile"
import { SectorValueDesktop } from "@/features/sector-mapping/value-desktop/SectorValueDesktop"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export const metadata: Metadata = {
  title: "Design Lab · Cartographie sectorielle",
  description: "Projections VALEUR et ÉCOSYSTÈME adaptatives testées sur les fixtures sectorielles KREDO.",
}

export default async function SectorMappingValueLabPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string; view?: string; mode?: string }>
}) {
  const { fixture, view, mode } = await searchParams
  const device = await getDashboardDevice()
  const sectorMap = SECTOR_MAP_FIXTURES.find((item) => item.sector.slug === fixture)
    ?? SECTOR_MAP_FIXTURES[0]

  const commonProps = {
    sectorMap,
    initialView: view === "ecosystem" ? "ecosystem" as const : "value" as const,
    initialEcosystemMode: mode === "influences" ? "influences" as const : "main" as const,
  }

  if (device === "mobile") {
    return <SectorMapMobile {...commonProps} />
  }

  return <SectorValueDesktop {...commonProps} />
}

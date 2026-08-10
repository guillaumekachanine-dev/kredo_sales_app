import type { Metadata } from "next"
import { SECTOR_MAP_FIXTURES } from "@/features/sector-mapping/fixtures"
import { SectorValueDesktop } from "@/features/sector-mapping/value-desktop/SectorValueDesktop"

export const metadata: Metadata = {
  title: "Design Lab · Cartographie sectorielle",
  description: "Projections VALEUR et ÉCOSYSTÈME desktop testées sur les fixtures sectorielles KREDO.",
}

export default async function SectorMappingValueLabPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string; view?: string; mode?: string }>
}) {
  const { fixture, view, mode } = await searchParams
  const sectorMap = SECTOR_MAP_FIXTURES.find((item) => item.sector.slug === fixture)
    ?? SECTOR_MAP_FIXTURES[0]

  return (
    <SectorValueDesktop
      sectorMap={sectorMap}
      initialView={view === "ecosystem" ? "ecosystem" : "value"}
      initialEcosystemMode={mode === "influences" ? "influences" : "main"}
    />
  )
}

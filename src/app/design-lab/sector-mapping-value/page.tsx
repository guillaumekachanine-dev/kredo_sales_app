import type { Metadata } from "next"
import { SECTOR_MAP_FIXTURES } from "@/features/sector-mapping/fixtures"
import { SectorValueDesktop } from "@/features/sector-mapping/value-desktop/SectorValueDesktop"

export const metadata: Metadata = {
  title: "Design Lab · Cartographie sectorielle VALEUR",
  description: "Projection VALEUR desktop testée sur les fixtures sectorielles KREDO.",
}

export default async function SectorMappingValueLabPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>
}) {
  const { fixture } = await searchParams
  const sectorMap = SECTOR_MAP_FIXTURES.find((item) => item.sector.slug === fixture)
    ?? SECTOR_MAP_FIXTURES[0]

  return <SectorValueDesktop sectorMap={sectorMap} />
}

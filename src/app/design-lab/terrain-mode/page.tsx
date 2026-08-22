import { TerrainModeLab } from "./TerrainModeLab"

export const metadata = {
  title: "KREDO Design Lab — Mode Terrain",
  description: "Prototype mobile isolé du Mode Terrain Business Intelligence.",
}

type TerrainModePageProps = {
  searchParams: Promise<{
    angle?: string
    regulatory?: string
    source?: string
    top?: string
  }>
}

export default async function TerrainModePage({ searchParams }: TerrainModePageProps) {
  const query = await searchParams
  const regulatory = query.regulatory === "window" || query.regulatory === "unavailable" ? query.regulatory : "exact"
  const angle = query.angle === "risk" || query.angle === "unavailable" ? query.angle : "market"
  const sourceId = query.source ? Number(query.source) : null

  return (
    <TerrainModeLab
      key={`${regulatory}:${angle}:${sourceId ?? "none"}:${query.top ?? "default"}`}
      regulatoryVariant={regulatory}
      angleVariant={angle}
      initialSourceId={Number.isInteger(sourceId) ? sourceId : null}
      topVariant={query.top === "stress" ? "stress" : "default"}
    />
  )
}

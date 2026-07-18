import type { SectorMarketView } from "@/lib/intelligence/client-intelligence-sector"
import { SectionBlock } from "./intelligence-parts"

type SectorMarketSectionProps = {
  market: SectorMarketView
  compact?: boolean
}

const MARKET_MARKERS = [
  ["Volume global", "globalVolume"],
  ["Marché France", "franceVolume"],
  ["Marché Europe", "europeVolume"],
  ["Dynamique", "growth"],
] as const

export function SectorMarketSection({ market, compact = false }: SectorMarketSectionProps) {
  const markers = MARKET_MARKERS.flatMap(([label, key]) => market[key] ? [{ label, value: market[key] }] : [])
  const hasEditorialContent = market.trends.length > 0 || market.growthDrivers.length > 0 || market.threats.length > 0

  return (
    <SectionBlock title="Marché" className="h-full">
      {markers.length > 0 ? (
        <dl className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"}>
          {markers.map((marker) => (
            <div key={marker.label} className="border-l-2 border-brand-brass bg-canvas/50 px-3 py-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{marker.label}</dt>
              <dd className="mt-1 text-sm font-bold leading-snug text-heading">{marker.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs italic text-muted">Aucun repère de marché FOLIO exploitable pour ce compte.</p>
      )}

      {hasEditorialContent ? (
        <div className={compact ? "mt-4 flex flex-col gap-4" : "mt-5 grid gap-5 lg:grid-cols-3"}>
          <EditorialList title="Tendances" items={market.trends} />
          <EditorialList title="Moteurs de croissance" items={market.growthDrivers} />
          <EditorialList title="Menaces & freins" items={market.threats} />
        </div>
      ) : null}
    </SectionBlock>
  )
}

function EditorialList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="min-w-0">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-heading">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-xs leading-relaxed text-body">
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-brass" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs italic text-muted">Non documenté.</p>
      )}
    </div>
  )
}

import Link from "next/link"
import type { CompetitiveMapCatalogItem } from "../data/competitive-map-workspace-types"

type CompetitiveMapToolbarProps = {
  catalog: CompetitiveMapCatalogItem[]
  selectedSegmentId: string
  snapshotDate: string
  actorCount: number
  isPending: boolean
  onSelectSegment: (segmentId: string) => void
}

function formatSnapshotDate(value: string): string {
  const [year, month, day] = value.split("-")
  return day && month && year ? `${day}/${month}/${year}` : value
}

export function CompetitiveMapToolbar({
  catalog,
  selectedSegmentId,
  snapshotDate,
  actorCount,
  isPending,
  onSelectSegment,
}: CompetitiveMapToolbarProps) {
  return (
    <div className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-3 border-b border-edito-border bg-edito-surface px-5 py-3">
      <label className="flex min-w-80 flex-1 items-center gap-3 text-xs font-semibold text-edito-muted">
        <span className="shrink-0 uppercase tracking-[0.1em]">Secteur / segment</span>
        <select
          aria-label="Secteur et segment de la cartographie"
          className="min-h-9 min-w-0 flex-1 rounded-md border border-edito-border bg-edito-surface px-3 text-sm font-semibold text-edito-navy outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/25"
          value={selectedSegmentId}
          disabled={isPending}
          onChange={(event) => onSelectSegment(event.target.value)}
        >
          {catalog.map((item) => (
            <option key={item.segmentId} value={item.segmentId}>{item.label}</option>
          ))}
        </select>
      </label>

      <dl className="flex items-center gap-5 text-xs">
        <div>
          <dt className="text-edito-muted">Snapshot</dt>
          <dd className="mt-0.5 font-mono font-semibold text-edito-ink">{formatSnapshotDate(snapshotDate)}</dd>
        </div>
        <div>
          <dt className="text-edito-muted">Acteurs</dt>
          <dd className="mt-0.5 font-mono font-semibold text-edito-ink">{actorCount}</dd>
        </div>
      </dl>

      <Link
        href="/prospection/cartographies/import"
        className="inline-flex min-h-9 items-center rounded-md border border-edito-navy px-3 text-xs font-bold text-edito-navy transition-colors hover:bg-edito-navy hover:text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/25"
      >
        Importer / mettre à jour
      </Link>
    </div>
  )
}

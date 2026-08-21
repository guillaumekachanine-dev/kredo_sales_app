import type { CompetitiveMapCatalogItem } from "../data/competitive-map-workspace-types"

type CompetitiveMapToolbarProps = {
  catalog: CompetitiveMapCatalogItem[]
  selectedSegmentId: string
  snapshotDate: string
  actorCount: number
  isPending: boolean
  onOpenImport: () => void
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
  onOpenImport,
}: CompetitiveMapToolbarProps) {
  const activeItem = catalog.find((item) => item.segmentId === selectedSegmentId)
  const segmentLabel = activeItem?.label ?? "Cartographie segment"

  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-edito-border bg-edito-surface px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-edito-muted">Segment actif</span>
        <span className="text-sm font-bold text-edito-navy">{segmentLabel}</span>
      </div>

      <div className="flex items-center gap-6">
        <dl className="flex items-center gap-5 text-xs">
          <div>
            <dt className="text-edito-muted">Snapshot</dt>
            <dd className="mt-0.5 font-mono font-semibold text-edito-ink">{formatSnapshotDate(snapshotDate)}</dd>
          </div>
          <div>
            <dt className="text-edito-muted">Acteurs positionnés</dt>
            <dd className="mt-0.5 font-mono font-semibold text-edito-ink">{actorCount}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onOpenImport}
          className="inline-flex min-h-9 items-center rounded-md border border-edito-navy px-3 text-xs font-bold text-edito-navy transition-colors hover:bg-edito-navy hover:text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/25"
        >
          Importer / mettre à jour
        </button>
      </div>
    </div>
  )
}

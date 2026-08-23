"use client"

import { useMemo, useState } from "react"
import type { CompetitiveMapActor, CompetitiveMapWorkspace } from "../../data/competitive-map-workspace-types"
import { resolveCompetitiveMapSelection } from "../../domain/competitive-map-selection"
import { CompetitiveMobileActorCard } from "./CompetitiveMobileActorCard"
import { CompetitiveMobileActorList } from "./CompetitiveMobileActorList"
import { CompetitiveMobileMatrix } from "./CompetitiveMobileMatrix"
import { CompetitiveMapImportDialog } from "../CompetitiveMapImportWizard"

const EMPTY_ACTORS: CompetitiveMapActor[] = []

function formatSnapshotDate(value: string): string {
  const [year, month, day] = value.split("-")
  return day && month && year ? `${day}/${month}/${year}` : value
}

export function CompetitiveEnvironmentMobile({ workspace }: { workspace: CompetitiveMapWorkspace }) {
  const [requestedActorId, setRequestedActorId] = useState<string | null>(null)
  const actors = workspace.snapshot?.actors ?? EMPTY_ACTORS
  const selectedActorId = useMemo(() => resolveCompetitiveMapSelection(actors, requestedActorId), [actors, requestedActorId])
  const selectedActor = useMemo(() => actors.find((actor) => actor.id === selectedActorId) ?? null, [actors, selectedActorId])
  const [isImportOpen, setIsImportOpen] = useState(false)

  if (workspace.state === "error") {
    return <section className="px-4 py-10 text-center"><h2 className="font-heading text-lg font-bold text-edito-navy">Cartographie indisponible</h2><p className="mt-2 text-sm text-edito-muted">{workspace.error}</p></section>
  }

  if (workspace.state === "empty" || !workspace.snapshot || !workspace.selectedSegmentId) {
    return (
      <section className="px-4 py-10 text-center">
        <h2 className="font-heading text-lg font-bold text-edito-navy">Aucune cartographie importée</h2>
        <p className="mt-2 text-sm text-edito-muted">Importez une étude pour alimenter cette vue.</p>
        <button type="button" onClick={() => setIsImportOpen(true)} className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-brand-brass px-4 text-xs font-bold text-brand-brass">Importer une cartographie</button>
        <CompetitiveMapImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          segments={workspace.allSegments}
          initialSegmentSlug={workspace.catalog.find(c => c.segmentId === workspace.selectedSegmentId)?.segmentSlug ?? null}
          isMobile={true}
        />
      </section>
    )
  }

  const activeItem = workspace.catalog.find((c) => c.segmentId === workspace.selectedSegmentId)
  const segmentLabel = activeItem?.label ?? "Cartographie segment"

  return (
    <div>
      <section className="space-y-3 px-4 py-4" aria-label="Informations cartographie concurrentielle">
        <div className="rounded-lg border border-edito-border bg-edito-surface p-3">
          <span className="block text-[10px] font-bold uppercase tracking-[0.09em] text-edito-muted">Segment actif</span>
          <span className="mt-0.5 block text-sm font-bold text-edito-navy">{segmentLabel}</span>
          <div className="mt-3 flex items-center justify-between border-t border-edito-border/60 pt-2.5">
            <dl className="flex items-center gap-4 text-xs">
              <div><dt className="text-[10px] text-edito-muted">Snapshot</dt><dd className="font-mono font-semibold text-edito-navy">{formatSnapshotDate(workspace.snapshot.snapshotDate)}</dd></div>
              <div><dt className="text-[10px] text-edito-muted">Acteurs</dt><dd className="font-mono font-semibold text-edito-navy">{actors.length}</dd></div>
            </dl>
            <button type="button" onClick={() => setIsImportOpen(true)} className="inline-flex min-h-9 items-center rounded-md border border-edito-border bg-edito-chip px-3 text-xs font-bold text-edito-navy transition-colors hover:bg-edito-border/50">Importer</button>
          </div>
        </div>
      </section>

      <CompetitiveMobileMatrix actors={actors} selectedActorId={selectedActorId} onSelectActor={setRequestedActorId} />
      <CompetitiveMobileActorCard actor={selectedActor} />
      <CompetitiveMobileActorList actors={actors} selectedActorId={selectedActorId} onSelectActor={setRequestedActorId} />
      <CompetitiveMapImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        segments={workspace.allSegments}
        initialSegmentSlug={workspace.catalog.find(c => c.segmentId === workspace.selectedSegmentId)?.segmentSlug ?? null}
        isMobile={true}
      />
    </div>
  )
}

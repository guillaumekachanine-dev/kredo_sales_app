"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { CompetitiveMapActor, CompetitiveMapWorkspace } from "../../data/competitive-map-workspace-types"
import { buildCompetitiveMapUrl } from "../../domain/competitive-map-navigation"
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [requestedActorId, setRequestedActorId] = useState<string | null>(null)
  const actors = workspace.snapshot?.actors ?? EMPTY_ACTORS
  const selectedActorId = useMemo(() => resolveCompetitiveMapSelection(actors, requestedActorId), [actors, requestedActorId])
  const selectedActor = useMemo(() => actors.find((actor) => actor.id === selectedActorId) ?? null, [actors, selectedActorId])
  const [isImportOpen, setIsImportOpen] = useState(false)
  if (workspace.state === "error") {
    return <section className="px-4 py-10 text-center"><h2 className="font-heading text-lg font-bold text-white">Cartographie indisponible</h2><p className="mt-2 text-sm text-white/55">{workspace.error}</p></section>
  }

  if (workspace.state === "empty" || !workspace.snapshot || !workspace.selectedSegmentId) {
    return (
      <section className="px-4 py-10 text-center">
        <h2 className="font-heading text-lg font-bold text-white">Aucune cartographie importée</h2>
        <p className="mt-2 text-sm text-white/55">Importez une étude pour alimenter cette vue.</p>
        <button onClick={() => setIsImportOpen(true)} className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-brand-brass px-4 text-xs font-bold text-brand-brass">Importer une cartographie</button>
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

  const handleSelectSegment = (segmentId: string) => {
    startTransition(() => router.replace(buildCompetitiveMapUrl(segmentId), { scroll: false }))
  }

  return (
    <div className={isPending ? "opacity-70 transition-opacity motion-reduce:transition-none" : "transition-opacity motion-reduce:transition-none"} aria-busy={isPending}>
      <section className="space-y-3 px-4 py-4" aria-label="Choisir une cartographie concurrentielle">
        <label htmlFor="competitive-mobile-segment" className="block text-[10px] font-bold uppercase tracking-[0.09em] text-white/45">Secteur / segment</label>
        <select id="competitive-mobile-segment" value={workspace.selectedSegmentId} disabled={isPending || workspace.catalog.length <= 1} onChange={(event) => handleSelectSegment(event.target.value)} className="min-h-11 w-full rounded-lg border border-white/15 bg-surface px-3 text-sm font-semibold text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass">
          {workspace.catalog.map((item) => <option key={item.segmentId} value={item.segmentId}>{item.label}</option>)}
        </select>
        <div className="flex items-center justify-between">
          <dl className="flex items-center gap-5 text-xs">
            <div><dt className="text-white/40">Snapshot</dt><dd className="mt-0.5 font-mono font-semibold text-white/80">{formatSnapshotDate(workspace.snapshot.snapshotDate)}</dd></div>
            <div><dt className="text-white/40">Acteurs</dt><dd className="mt-0.5 font-mono font-semibold text-white/80">{actors.length}</dd></div>
          </dl>
          <button onClick={() => setIsImportOpen(true)} className="inline-flex min-h-9 items-center rounded-md border border-white/20 px-3 text-xs font-bold text-white transition-colors hover:bg-white/10">Importer</button>
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

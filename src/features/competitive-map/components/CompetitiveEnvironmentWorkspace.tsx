"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { CompetitiveMapActor, CompetitiveMapWorkspace } from "../data/competitive-map-workspace-types"
import { resolveCompetitiveMapSelection } from "../domain/competitive-map-selection"
import { buildCompetitiveMapUrl } from "../domain/competitive-map-navigation"
import { CompetitiveMapToolbar } from "./CompetitiveMapToolbar"
import { CompetitiveMatrix } from "./CompetitiveMatrix"
import { CompetitiveActorSummary } from "./CompetitiveActorSummary"
import { CompetitiveActorProfiles } from "./CompetitiveActorProfiles"

const EMPTY_ACTORS: CompetitiveMapActor[] = []

export function CompetitiveEnvironmentWorkspace({ workspace }: { workspace: CompetitiveMapWorkspace }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [requestedActorId, setRequestedActorId] = useState<string | null>(null)
  const actors = workspace.snapshot?.actors ?? EMPTY_ACTORS
  const selectedActorId = useMemo(
    () => resolveCompetitiveMapSelection(actors, requestedActorId),
    [actors, requestedActorId],
  )
  const selectedActor = useMemo(
    () => actors.find((actor) => actor.id === selectedActorId) ?? null,
    [actors, selectedActorId],
  )

  if (workspace.state === "error") {
    return (
      <section className="flex min-h-[32rem] items-center justify-center bg-edito-surface px-6 text-center">
        <div>
          <h2 className="font-heading text-lg font-bold text-edito-navy">Cartographie indisponible</h2>
          <p className="mt-2 text-sm text-edito-muted">{workspace.error}</p>
        </div>
      </section>
    )
  }

  if (workspace.state === "empty" || !workspace.snapshot || !workspace.selectedSegmentId) {
    return (
      <section className="flex min-h-[32rem] items-center justify-center bg-edito-surface px-6 text-center">
        <div>
          <h2 className="font-heading text-lg font-bold text-edito-navy">Aucune cartographie importée</h2>
          <p className="mt-2 text-sm text-edito-muted">Importez une étude pour faire apparaître son segment dans le catalogue.</p>
          <Link href="/prospection/cartographies/import" className="mt-5 inline-flex min-h-9 items-center rounded-md bg-edito-navy px-3 text-xs font-bold text-text-inverse">Importer une cartographie</Link>
        </div>
      </section>
    )
  }

  const handleSelectSegment = (segmentId: string) => {
    startTransition(() => {
      router.replace(buildCompetitiveMapUrl(segmentId), { scroll: false })
    })
  }

  return (
    <div className={isPending ? "opacity-70 transition-opacity" : "transition-opacity"} aria-busy={isPending}>
      <CompetitiveMapToolbar
        catalog={workspace.catalog}
        selectedSegmentId={workspace.selectedSegmentId}
        snapshotDate={workspace.snapshot.snapshotDate}
        actorCount={workspace.snapshot.actors.length}
        isPending={isPending}
        onSelectSegment={handleSelectSegment}
      />

      <div className="grid min-h-[34rem] grid-cols-[minmax(0,1fr)_20rem]">
        <CompetitiveMatrix actors={actors} selectedActorId={selectedActorId} onSelectActor={setRequestedActorId} />
        <CompetitiveActorSummary actor={selectedActor} />
      </div>

      <CompetitiveActorProfiles actors={actors} selectedActorId={selectedActorId} onSelectActor={setRequestedActorId} />
    </div>
  )
}

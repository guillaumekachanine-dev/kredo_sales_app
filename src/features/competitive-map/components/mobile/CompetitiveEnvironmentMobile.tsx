"use client"

import { useMemo, useState } from "react"
import type { CompetitiveMapActor, CompetitiveMapWorkspace } from "../../data/competitive-map-workspace-types"
import { resolveCompetitiveMapSelection } from "../../domain/competitive-map-selection"
import { CompetitiveMobileActorCard } from "./CompetitiveMobileActorCard"
import { CompetitiveMobileActorList } from "./CompetitiveMobileActorList"
import { CompetitiveMobileMatrix } from "./CompetitiveMobileMatrix"
import { CompetitiveMapImportDialog } from "../CompetitiveMapImportWizard"
import { Select } from "@/components/ui/Select"

const EMPTY_ACTORS: CompetitiveMapActor[] = []

export function CompetitiveEnvironmentMobile({ workspace }: { workspace: CompetitiveMapWorkspace }) {
  const [requestedActorId, setRequestedActorId] = useState<string | null>(null)
  const [isCardExpanded, setIsCardExpanded] = useState(false)
  const actors = workspace.snapshot?.actors ?? EMPTY_ACTORS
  const selectedActorId = useMemo(() => resolveCompetitiveMapSelection(actors, requestedActorId), [actors, requestedActorId])
  const selectedActor = useMemo(() => actors.find((actor) => actor.id === selectedActorId) ?? null, [actors, selectedActorId])
  const [isImportOpen, setIsImportOpen] = useState(false)

  const handleSelectAccount = (actorId: string) => {
    if (!actorId) return
    setRequestedActorId(actorId)
    setIsCardExpanded(true)
    const cardEl = document.getElementById("competitive-mobile-actor-card")
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "instant", block: "start" })
    }
  }

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

  return (
    <div className="pt-2">
      <CompetitiveMobileMatrix
        actors={actors}
        selectedActorId={selectedActorId}
        onSelectActor={setRequestedActorId}
        onImport={() => setIsImportOpen(true)}
      />
      <div className="px-4 pt-3">
        <Select
          id="competitive-account-select"
          value={selectedActorId ?? ""}
          onChange={(e) => handleSelectAccount(e.target.value)}
          fullWidth
          size="sm"
          aria-label="Sélectionner un compte"
        >
          <option value="" disabled>
            Sélectionner un compte…
          </option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.name} — {actor.categoryLabel}
            </option>
          ))}
        </Select>
      </div>
      <CompetitiveMobileActorCard
        actor={selectedActor}
        isExpanded={isCardExpanded}
        onToggleExpanded={setIsCardExpanded}
      />
      <CompetitiveMobileActorList
        actors={actors}
        selectedActorId={selectedActorId}
        onSelectActor={setRequestedActorId}
      />
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

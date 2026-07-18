"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { SectorActorStatus, SectorActorView } from "@/lib/intelligence/client-intelligence-sector"
import { SectionBlock } from "./intelligence-parts"

type ActorFilter = "all" | "kredo" | SectorActorStatus

type SectorActorMapProps = {
  actors: SectorActorView[]
  displayedKredoAccountsCount: number
  unclassifiedKredoAccountsCount: number
}

const STATUS_LABELS: Record<SectorActorStatus, string> = {
  leader: "Leader",
  challenger: "Challenger",
  specialist: "Spécialiste",
  outsider: "Outsider",
  unclassified: "Non classé",
}

const FILTERS: Array<{ value: ActorFilter; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "kredo", label: "KREDO" },
  { value: "leader", label: "Leaders" },
  { value: "challenger", label: "Challengers" },
  { value: "specialist", label: "Spécialistes" },
  { value: "outsider", label: "Outsiders" },
]

const BANDS: Array<{ status: SectorActorStatus; top: string; height: string }> = [
  { status: "leader", top: "0%", height: "20%" },
  { status: "challenger", top: "20%", height: "20%" },
  { status: "specialist", top: "40%", height: "20%" },
  { status: "outsider", top: "60%", height: "18%" },
  { status: "unclassified", top: "78%", height: "22%" },
]

const STATUS_CLASSES: Record<SectorActorStatus, string> = {
  leader: "border-primary/35 bg-primary/10 text-primary-deep",
  challenger: "border-info/35 bg-info/10 text-heading",
  specialist: "border-brand-brass/45 bg-brand-brass/10 text-heading",
  outsider: "border-border bg-surface text-body",
  unclassified: "border-dashed border-muted/60 bg-canvas text-body",
}

const BAND_CLASSES: Record<SectorActorStatus, string> = {
  leader: "bg-primary/[0.045]",
  challenger: "bg-info/[0.035]",
  specialist: "bg-brand-brass/[0.045]",
  outsider: "bg-canvas/45",
  unclassified: "bg-surface-hover/55",
}

function applyFilter(actors: SectorActorView[], filter: ActorFilter): SectorActorView[] {
  if (filter === "all") return actors
  if (filter === "kredo") return actors.filter((actor) => actor.isKredoAccount)
  return actors.filter((actor) => actor.status === filter)
}

export function SectorActorMap({ actors, displayedKredoAccountsCount, unclassifiedKredoAccountsCount }: SectorActorMapProps) {
  const [filter, setFilter] = useState<ActorFilter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filteredActors = useMemo(() => applyFilter(actors, filter), [actors, filter])
  const selectedActor = actors.find((actor) => actor.id === selectedId) ?? null

  return (
    <SectionBlock
      title="Cartographie des acteurs"
      action={<span className="text-[10px] font-semibold text-white/75">{actors.length} acteurs · {displayedKredoAccountsCount} comptes KREDO</span>}
    >
      <ActorFilters value={filter} onChange={setFilter} />
      <ActorLegend unclassifiedKredoAccountsCount={unclassifiedKredoAccountsCount} />

      <div className="relative mt-4 h-[36rem] min-w-0 overflow-hidden rounded-lg border border-border bg-surface" aria-label="Matrice concurrentielle du secteur">
        <p className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-bold uppercase tracking-wider text-muted">
          Influence marché
        </p>
        <div className="absolute left-12 right-4 top-4 bottom-12">
          {BANDS.map((band) => (
            <div
              key={band.status}
              className={cn("absolute inset-x-0 border-b border-border/70", BAND_CLASSES[band.status])}
              style={{ top: band.top, height: band.height }}
            >
              <span className="absolute left-2 top-2 text-[9px] font-black uppercase tracking-wider text-muted">
                {band.status === "unclassified" ? "Comptes KREDO non classés / non classé" : STATUS_LABELS[band.status]}
              </span>
            </div>
          ))}

          {filteredActors.map((actor) => (
            <button
              key={actor.id}
              type="button"
              onClick={() => setSelectedId(actor.id)}
              aria-label={`${actor.name}, ${STATUS_LABELS[actor.status]}${actor.segment ? `, ${actor.segment}` : ""}`}
              title={`${actor.name} · ${STATUS_LABELS[actor.status]}${actor.segment ? ` · ${actor.segment}` : ""}`}
              className={cn(
                "group absolute z-[1] max-w-36 -translate-x-1/2 -translate-y-1/2 rounded border px-2 py-1 text-left text-[10px] font-bold leading-tight shadow-none",
                "transition-[background-color,border-color,color,transform] duration-200 motion-reduce:transition-none",
                "hover:z-[2] hover:-translate-y-[55%] focus-visible:z-[3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                STATUS_CLASSES[actor.status],
                actor.isKredoAccount && "ring-2 ring-[var(--color-cockpit-cobalt)] ring-offset-1 ring-offset-surface",
                actor.isCurrentAccount && "ring-[3px] ring-brand-brass",
              )}
              style={{ left: `${actor.x}%`, top: `${actor.y}%` }}
            >
              <span className="flex items-center gap-1.5">
                {actor.isKredoAccount ? <span aria-hidden="true" className="size-1.5 shrink-0 rotate-45 bg-[var(--color-cockpit-cobalt)]" /> : null}
                <span className="truncate">{actor.name}</span>
              </span>
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-48 -translate-x-1/2 rounded border border-border bg-heading px-2.5 py-2 text-left text-[10px] font-medium leading-relaxed text-white group-hover:block group-focus-visible:block">
                {actor.name}<br />{STATUS_LABELS[actor.status]}{actor.segment ? ` · ${actor.segment}` : ""}
              </span>
            </button>
          ))}
        </div>
        <div className="absolute bottom-2 left-16 right-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted">
          <span>Spécialiste / niche</span>
          <span>Généraliste / couverture large</span>
        </div>
      </div>

      {filteredActors.length === 0 ? (
        <p className="mt-3 text-xs italic text-muted">Aucun acteur ne correspond à ce filtre.</p>
      ) : null}
      {selectedActor ? <ActorDetails actor={selectedActor} /> : null}
    </SectionBlock>
  )
}

export function SectorActorMobileList({ actors, displayedKredoAccountsCount, unclassifiedKredoAccountsCount }: SectorActorMapProps) {
  const [filter, setFilter] = useState<ActorFilter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filteredActors = useMemo(() => applyFilter(actors, filter), [actors, filter])

  return (
    <SectionBlock title="Acteurs" action={<span className="text-[10px] font-semibold text-white/75">{displayedKredoAccountsCount} KREDO</span>}>
      <ActorFilters value={filter} onChange={setFilter} />
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        {unclassifiedKredoAccountsCount} compte{unclassifiedKredoAccountsCount > 1 ? "s" : ""} KREDO sans statut concurrentiel documenté.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {filteredActors.map((actor) => (
          <li key={actor.id}>
            <button
              type="button"
              onClick={() => setSelectedId(selectedId === actor.id ? null : actor.id)}
              className={cn(
                "min-h-11 w-full rounded border px-3 py-2 text-left transition-colors duration-200 motion-reduce:transition-none",
                STATUS_CLASSES[actor.status],
                actor.isKredoAccount && "border-[var(--color-cockpit-cobalt)]",
                actor.isCurrentAccount && "ring-2 ring-brand-brass ring-offset-1",
              )}
              aria-expanded={selectedId === actor.id}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold">{actor.name}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider">{STATUS_LABELS[actor.status]}</span>
              </span>
              {actor.segment ? <span className="mt-0.5 block text-[10px] opacity-80">{actor.segment}</span> : null}
            </button>
            {selectedId === actor.id ? <ActorDetails actor={actor} compact /> : null}
          </li>
        ))}
      </ul>
    </SectionBlock>
  )
}

function ActorFilters({ value, onChange }: { value: ActorFilter; onChange: (value: ActorFilter) => void }) {
  return (
    <div role="group" aria-label="Filtrer les acteurs" className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <Button
          key={filter.value}
          size="sm"
          variant={value === filter.value ? "primary" : "secondary"}
          aria-pressed={value === filter.value}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  )
}

function ActorLegend({ unclassifiedKredoAccountsCount }: { unclassifiedKredoAccountsCount: number }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Légende de la cartographie">
      <Badge variant="neutral" dot>Acteur sectoriel</Badge>
      <Badge variant="brand" dot>Compte KREDO</Badge>
      <Badge variant="brass" dot>Compte consulté</Badge>
      <span className="text-[10px] text-muted">{unclassifiedKredoAccountsCount} KREDO non classé{unclassifiedKredoAccountsCount > 1 ? "s" : ""}</span>
    </div>
  )
}

function ActorDetails({ actor, compact = false }: { actor: SectorActorView; compact?: boolean }) {
  return (
    <aside className={cn("mt-3 border-l-2 border-brand-brass bg-canvas/60 px-4 py-3", compact && "ml-2")} aria-label={`Fiche de ${actor.name}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-bold text-heading">{actor.name}</h4>
        <Badge variant={actor.isKredoAccount ? "brand" : "neutral"}>{STATUS_LABELS[actor.status]}</Badge>
        {actor.isKredoAccount ? <Badge variant="brass">Compte KREDO</Badge> : null}
      </div>
      {actor.description ? <p className="mt-2 text-xs leading-relaxed text-body">{actor.description}</p> : null}
      <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
        {actor.role ? <div><dt className="font-bold text-muted">Rôle</dt><dd className="text-body">{actor.role}</dd></div> : null}
        {actor.coverage ? <div><dt className="font-bold text-muted">Couverture</dt><dd className="text-body">{actor.coverage}</dd></div> : null}
        {actor.segment ? <div><dt className="font-bold text-muted">Segment</dt><dd className="text-body">{actor.segment}</dd></div> : null}
      </dl>
    </aside>
  )
}

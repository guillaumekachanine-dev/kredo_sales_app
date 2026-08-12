import { cn } from "@/lib/utils"
import type { CompetitiveMapActor } from "../data/competitive-map-workspace-types"

type DetailBlockProps = {
  title: string
  value?: string | null
  items?: string[]
  tone?: "default" | "warning"
}

function DetailBlock({ title, value, items = [], tone = "default" }: DetailBlockProps) {
  const visibleItems = items.filter((item) => item.trim().length > 0)
  if (!value && visibleItems.length === 0) return null

  return (
    <div>
      <h4 className={cn("text-[10px] font-bold uppercase tracking-[0.1em]", tone === "warning" ? "text-status-warning-ink" : "text-edito-muted")}>{title}</h4>
      {value ? <p className="mt-1.5 text-xs leading-relaxed text-edito-body">{value}</p> : null}
      {visibleItems.length > 0 ? (
        <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-edito-body">
          {visibleItems.map((item, index) => <li key={`${item}-${index}`} className="border-l border-edito-border pl-2.5">{item}</li>)}
        </ul>
      ) : null}
    </div>
  )
}

function ActorProfile({ actor, selected, onSelect }: { actor: CompetitiveMapActor; selected: boolean; onSelect: () => void }) {
  return (
    <article className={cn("border-t border-edito-border py-5 first:border-t-0", selected && "bg-edito-chip/60")}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="flex w-full items-start justify-between gap-4 px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edito-navy/25"
      >
        <span>
          <span className="font-heading text-base font-bold text-edito-navy">{actor.name}{actor.isBenchmarkAccount ? " ★" : ""}</span>
          <span className="mt-1 block text-xs text-edito-muted">Confiance {actor.confidence}</span>
        </span>
        <span className="shrink-0 text-right font-mono text-xs font-bold text-edito-ink">
          {actor.appetenceScore === null ? "—" : `${actor.appetenceScore}/35`}
          <span className="mt-1 block font-sans font-medium text-edito-muted">{actor.accessibilityScore === null ? "Non positionnée" : `Accès ${actor.accessibilityScore}/5`}</span>
        </span>
      </button>

      <div className="mt-5 grid gap-x-6 gap-y-5 px-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailBlock title="Positionnement" value={actor.positioning} />
        <DetailBlock title="Proposition de valeur" value={actor.details.propositionValeur} />
        <DetailBlock title="Différenciateurs" items={actor.details.differenciateurs} />
        <DetailBlock title="Dépendances" items={actor.details.dependances} />
        <DetailBlock title="Chaîne de valeur" items={actor.details.chaineValeur} />
        <DetailBlock title="Forces" value={actor.forces} />
        <DetailBlock title="Vulnérabilité" value={actor.vulnerability} />
        <DetailBlock title="Chantiers technologiques" items={actor.details.chantiersTechnologiques} />
        <DetailBlock title="Angle d’entrée" value={actor.angleEntree} />
        <DetailBlock title="Triggers" items={actor.details.triggers} />
        <DetailBlock title="Lignes rouges" items={actor.details.lignesRouges} tone="warning" />
        <DetailBlock title="Trous déclarés" items={actor.details.trous} tone="warning" />
      </div>
    </article>
  )
}

export function CompetitiveActorProfiles({ actors, selectedActorId, onSelectActor }: {
  actors: CompetitiveMapActor[]
  selectedActorId: string | null
  onSelectActor: (actorId: string) => void
}) {
  const categories = Array.from(new Set(actors.map((actor) => actor.category)))

  return (
    <section aria-labelledby="actor-profiles-title" className="border-t border-edito-border bg-edito-surface px-5 py-6">
      <div className="mb-5">
        <h2 id="actor-profiles-title" className="font-heading text-lg font-bold text-edito-navy">Fiches des acteurs</h2>
        <p className="mt-1 text-xs text-edito-muted">Rubriques renseignées dans le dernier snapshot, regroupées par catégorie.</p>
      </div>

      <div className="space-y-7">
        {categories.map((category) => {
          const categoryActors = actors.filter((actor) => actor.category === category)
          return (
            <section key={category} aria-labelledby={`category-${category}`}>
              <div className="flex items-center gap-3 border-b border-edito-navy pb-2">
                <h3 id={`category-${category}`} className="text-xs font-bold uppercase tracking-[0.12em] text-edito-navy">{categoryActors[0]?.categoryLabel}</h3>
                <span className="font-mono text-[11px] text-edito-muted">{categoryActors.length}</span>
              </div>
              {categoryActors.map((actor) => (
                <ActorProfile
                  key={actor.id}
                  actor={actor}
                  selected={selectedActorId === actor.id}
                  onSelect={() => onSelectActor(actor.id)}
                />
              ))}
            </section>
          )
        })}
      </div>
    </section>
  )
}

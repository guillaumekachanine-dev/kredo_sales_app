"use client"

import type { CompetitiveMapActor } from "../../data/competitive-map-workspace-types"

export function CompetitiveMobileActorList({ actors, selectedActorId, onSelectActor }: {
  actors: CompetitiveMapActor[]
  selectedActorId: string | null
  onSelectActor: (actorId: string) => void
}) {
  const categories = Array.from(new Set(actors.map((actor) => actor.category)))

  return (
    <section aria-labelledby="competitive-mobile-actors-title" className="border-t border-white/10 px-4 py-5">
      <h2 id="competitive-mobile-actors-title" className="font-heading text-base font-bold text-white">Acteurs par catégorie</h2>
      <div className="mt-4 space-y-5">
        {categories.map((category) => {
          const categoryActors = actors.filter((actor) => actor.category === category)
          return (
            <section key={category} aria-labelledby={`competitive-mobile-category-${category}`}>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 id={`competitive-mobile-category-${category}`} className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">{categoryActors[0]?.categoryLabel}</h3>
                <span className="font-mono text-[10px] text-white/35">{categoryActors.length}</span>
              </div>
              <div className="divide-y divide-white/10">
                {categoryActors.map((actor) => (
                  <button key={actor.id} type="button" aria-pressed={actor.id === selectedActorId} onClick={() => onSelectActor(actor.id)} className="flex min-h-14 w-full items-center justify-between gap-3 px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brass aria-pressed:text-brand-brass">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{actor.name}{actor.isBenchmarkAccount ? " ★" : ""}</span>
                      <span className="mt-0.5 block text-[10px] text-white/45">{actor.accessibilityScore === null ? "Non positionnée" : `Accessibilité ${actor.accessibilityScore}/5`}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs font-bold">{actor.appetenceScore === null ? "—" : `${actor.appetenceScore}/35`}</span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

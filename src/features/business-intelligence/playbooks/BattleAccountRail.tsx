"use client"

import { cn } from "@/lib/utils"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"

type BattleAccountRailProps = {
  actors: CompetitiveMapActor[]
  selectedActorId: string
  onSelectActor: (actorId: string) => void
}

/**
 * Rail des comptes du mode Battle (Desktop).
 *
 * Purement présentationnel : la sélection vit dans `SectorPlaybooksModal`,
 * au-dessus du retournement, pour survivre à un aller-retour (critère L1).
 * Aucune requête : les acteurs viennent de `workspace.competitiveMap.actors`,
 * déjà chargés côté serveur par Business Intelligence.
 */
export function BattleAccountRail({ actors, selectedActorId, onSelectActor }: BattleAccountRailProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-brand-brass">
          Comptes cartographiés
        </span>
        <p className="mt-0.5 text-[11px] text-white/45">
          {actors.length} acteur{actors.length > 1 ? "s" : ""} du segment
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {actors.map((actor) => {
            const isSelected = actor.id === selectedActorId
            return (
              <li key={actor.id}>
                <button
                  type="button"
                  onClick={() => onSelectActor(actor.id)}
                  aria-current={isSelected ? "true" : undefined}
                  className={cn(
                    "relative w-full rounded-xl border p-3 pl-4 text-left outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none",
                    isSelected
                      ? "border-brand-brass/40 bg-brand-brass/10 text-white"
                      : "border-white/5 bg-slate-900/30 text-white/70 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  {/* Repère de sélection : lisible d'un coup d'œil dans une liste dense. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-2 left-1.5 w-0.5 rounded-full transition-colors motion-reduce:transition-none",
                      isSelected ? "bg-brand-brass" : "bg-transparent",
                    )}
                  />
                  <span className="flex items-start justify-between gap-2">
                    <span className="block min-w-0 flex-1 truncate text-xs font-semibold leading-tight">
                      {actor.name}
                      {actor.isBenchmarkAccount ? " ★" : ""}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] font-bold tabular-nums text-brand-brass">
                      {actor.appetenceScore !== null ? `${actor.appetenceScore}/35` : "—"}
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-white/40">
                    <span className="truncate">{actor.categoryLabel}</span>
                    <span className="shrink-0 tabular-nums">
                      {actor.accessibilityScore !== null ? `Accès ${actor.accessibilityScore}/5` : "—"}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import type { CompetitiveMapActor } from "../../data/competitive-map-workspace-types"

function DetailList({ title, items }: { title: string; items: string[] }) {
  const visibleItems = items.filter(Boolean)
  if (visibleItems.length === 0) return null

  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">{title}</dt>
      <dd className="mt-1 text-xs leading-relaxed text-white/70">{visibleItems.slice(0, 3).join(" · ")}</dd>
    </div>
  )
}

export function CompetitiveMobileActorCard({ actor }: { actor: CompetitiveMapActor | null }) {
  const [expandedActorId, setExpandedActorId] = useState<string | null>(null)
  const expanded = actor !== null && expandedActorId === actor.id

  if (!actor) {
    return <section className="px-4 py-5 text-sm text-white/55">Aucun acteur sélectionné.</section>
  }

  const mainDependency = actor.details.dependances.find(Boolean) ?? null
  const mainTrigger = actor.details.triggers.find(Boolean) ?? null

  return (
    <section aria-labelledby="competitive-mobile-selected-title" className="px-4 py-5">
      <article className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-brass">{actor.categoryLabel}{actor.isBenchmarkAccount ? " · Étalon" : ""}</p>
            <h2 id="competitive-mobile-selected-title" className="mt-1.5 font-heading text-lg font-bold text-white">{actor.name}</h2>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-base font-bold text-white">{actor.appetenceScore === null ? "—" : `${actor.appetenceScore}/35`}</p>
            <p className="mt-0.5 text-[10px] text-white/45">{actor.accessibilityScore === null ? "Non positionnée" : `Accès ${actor.accessibilityScore}/5`}</p>
          </div>
        </div>

        <dl className="mt-4 space-y-3 border-t border-white/10 pt-4">
          {actor.positioning ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">Positionnement</dt><dd className="mt-1 text-xs leading-relaxed text-white/75">{actor.positioning}</dd></div> : null}
          <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">Dépendance principale</dt><dd className="mt-1 text-xs leading-relaxed text-white/75">{mainDependency ?? "Non renseignée"}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">Angle d’entrée</dt><dd className="mt-1 border-l-2 border-brand-brass pl-2.5 text-xs leading-relaxed text-white/85">{actor.angleEntree ?? "Non renseigné"}</dd></div>
          {mainTrigger ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">Trigger principal</dt><dd className="mt-1 text-xs leading-relaxed text-white/75">{mainTrigger}</dd></div> : null}
        </dl>

        <button type="button" aria-expanded={expanded} aria-controls="competitive-mobile-actor-detail" onClick={() => setExpandedActorId(expanded ? null : actor.id)} className="mt-4 min-h-11 w-full rounded-lg border border-white/15 px-3 text-xs font-bold text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass">
          {expanded ? "Réduire le détail" : "Développer le détail"}
        </button>

        {expanded ? (
          <dl id="competitive-mobile-actor-detail" className="mt-4 space-y-3 border-t border-white/10 pt-4">
            {actor.details.propositionValeur ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">Proposition de valeur</dt><dd className="mt-1 text-xs leading-relaxed text-white/70">{actor.details.propositionValeur}</dd></div> : null}
            <DetailList title="Différenciateurs" items={actor.details.differenciateurs} />
            {actor.forces ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">Forces</dt><dd className="mt-1 text-xs leading-relaxed text-white/70">{actor.forces}</dd></div> : null}
            {actor.vulnerability ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">Vulnérabilité</dt><dd className="mt-1 text-xs leading-relaxed text-white/70">{actor.vulnerability}</dd></div> : null}
            <DetailList title="Chantiers technologiques" items={actor.details.chantiersTechnologiques} />
            <DetailList title="Lignes rouges" items={actor.details.lignesRouges} />
            <DetailList title="Trous" items={actor.details.trous} />
          </dl>
        ) : null}
      </article>
    </section>
  )
}

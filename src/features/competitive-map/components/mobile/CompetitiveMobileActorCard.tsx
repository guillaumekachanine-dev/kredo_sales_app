"use client"

import { useState } from "react"
import type { CompetitiveMapActor } from "../../data/competitive-map-workspace-types"

function DetailList({ title, items }: { title: string; items: string[] }) {
  const visibleItems = items.filter(Boolean)
  if (visibleItems.length === 0) return null

  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">{title}</dt>
      <dd className="mt-1 text-xs leading-relaxed text-edito-body">{visibleItems.slice(0, 3).join(" · ")}</dd>
    </div>
  )
}

export function CompetitiveMobileActorCard({
  actor,
  isExpanded: controlledExpanded,
  onToggleExpanded,
}: {
  actor: CompetitiveMapActor | null
  isExpanded?: boolean
  onToggleExpanded?: (expanded: boolean) => void
}) {
  const [internalExpandedActorId, setInternalExpandedActorId] = useState<string | null>(null)
  const isControlled = controlledExpanded !== undefined
  const expanded = actor !== null && (isControlled ? controlledExpanded : internalExpandedActorId === actor.id)

  if (!actor) {
    return <section className="px-4 py-5 text-sm text-edito-muted">Aucun acteur sélectionné.</section>
  }

  const handleToggle = () => {
    if (isControlled) {
      onToggleExpanded?.(!expanded)
    } else {
      setInternalExpandedActorId(expanded ? null : actor.id)
    }
  }

  const mainDependency = actor.details.dependances.find(Boolean) ?? null
  const mainTrigger = actor.details.triggers.find(Boolean) ?? null

  return (
    <section id="competitive-mobile-actor-card" aria-labelledby="competitive-mobile-selected-title" className="scroll-mt-14 px-4 py-5">
      <article className="rounded-xl border border-edito-border bg-edito-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-brass">{actor.categoryLabel}{actor.isBenchmarkAccount ? " · Étalon" : ""}</p>
            <h2 id="competitive-mobile-selected-title" className="mt-1.5 font-heading text-lg font-bold text-edito-navy">{actor.name}</h2>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-base font-bold text-edito-navy">{actor.appetenceScore === null ? "—" : `${actor.appetenceScore}/35`}</p>
            <p className="mt-0.5 text-[10px] text-edito-muted">{actor.accessibilityScore === null ? "Non positionnée" : `Accès ${actor.accessibilityScore}/5`}</p>
          </div>
        </div>

        <dl className="mt-4 space-y-3 border-t border-edito-border pt-4">
          {actor.positioning ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">Positionnement</dt><dd className="mt-1 text-xs leading-relaxed text-edito-body">{actor.positioning}</dd></div> : null}
          <DetailList title="Couche ESN" items={actor.details.coucheEsn} />
          {actor.details.iaAnnonceVsDeploye ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">IA (Annoncé vs Déployé)</dt><dd className="mt-1 text-xs leading-relaxed text-edito-body">{actor.details.iaAnnonceVsDeploye}</dd></div> : null}
          <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">Dépendance principale</dt><dd className="mt-1 text-xs leading-relaxed text-edito-body">{mainDependency ?? "Non renseignée"}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">Angle d’entrée</dt><dd className="mt-1 border-l-2 border-brand-brass pl-2.5 text-xs leading-relaxed text-edito-ink">{actor.angleEntree ?? "Non renseigné"}</dd></div>
          {mainTrigger ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">Trigger principal</dt><dd className="mt-1 text-xs leading-relaxed text-edito-body">{mainTrigger}</dd></div> : null}
        </dl>

        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="competitive-mobile-actor-detail"
          onClick={handleToggle}
          className="mt-4 min-h-11 w-full rounded-lg border border-edito-border bg-edito-chip px-3 text-xs font-bold text-edito-navy transition-colors hover:bg-edito-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass"
        >
          {expanded ? "Réduire le détail" : "Développer le détail"}
        </button>

        {expanded ? (
          <dl id="competitive-mobile-actor-detail" className="mt-4 space-y-3 border-t border-edito-border pt-4">
            {actor.details.propositionValeur ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">Proposition de valeur</dt><dd className="mt-1 text-xs leading-relaxed text-edito-body">{actor.details.propositionValeur}</dd></div> : null}
            <DetailList title="Différenciateurs" items={actor.details.differenciateurs} />
            {actor.details.metierChaineValeur ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">Métier & chaîne de valeur</dt><dd className="mt-1 text-xs leading-relaxed text-edito-body">{actor.details.metierChaineValeur}</dd></div> : null}
            {actor.details.maillon ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">Maillon</dt><dd className="mt-1 text-xs leading-relaxed text-edito-body">{actor.details.maillon}</dd></div> : null}
            <DetailList title="Contrats majeurs" items={actor.details.contratsMajeurs} />
            {actor.forces ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">Forces</dt><dd className="mt-1 text-xs leading-relaxed text-edito-body">{actor.forces}</dd></div> : null}
            {actor.vulnerability ? <div><dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">Vulnérabilité</dt><dd className="mt-1 text-xs leading-relaxed text-edito-body">{actor.vulnerability}</dd></div> : null}
            <DetailList title="Chantiers technologiques" items={actor.details.chantiersTechnologiques} />
            <DetailList title="Grilles" items={actor.details.grilles} />
            <DetailList title="Traduction commerciale" items={actor.details.traductionCommerciale} />
            <DetailList title="Lignes rouges" items={actor.details.lignesRouges} />
            <DetailList title="Trous" items={actor.details.trous} />
          </dl>
        ) : null}
      </article>
    </section>
  )
}

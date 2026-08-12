import type { CompetitiveMapActor } from "../data/competitive-map-workspace-types"

function formatRevenue(actor: CompetitiveMapActor): string {
  if (actor.revenueEstimateMeur === null) return "Non disponible"
  const value = actor.revenueEstimateMeur >= 1_000
    ? `${(actor.revenueEstimateMeur / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md€`
    : `${actor.revenueEstimateMeur.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} M€`
  return actor.revenueExercice ? `${value} · ${actor.revenueExercice}` : value
}

export function CompetitiveActorSummary({ actor }: { actor: CompetitiveMapActor | null }) {
  if (!actor) {
    return <aside className="min-h-full bg-edito-canvas p-5 text-sm text-edito-muted">Aucun acteur sélectionné.</aside>
  }

  return (
    <aside aria-labelledby="selected-actor-title" className="min-h-full bg-edito-canvas p-5">
      <div className="border-b border-edito-border pb-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-muted">
          <span>{actor.categoryLabel}</span>
          {actor.isBenchmarkAccount ? <span>· Compte étalon</span> : null}
        </div>
        <h2 id="selected-actor-title" className="mt-2 font-heading text-xl font-bold text-edito-navy">{actor.name}</h2>
        <p className="mt-1 text-xs text-edito-muted">Confiance {actor.confidence}</p>
      </div>

      <dl className="grid grid-cols-2 border-b border-edito-border py-4 text-xs">
        <div>
          <dt className="text-edito-muted">Appétence</dt>
          <dd className="mt-1 font-mono text-lg font-bold text-edito-ink">{actor.appetenceScore === null ? "—" : `${actor.appetenceScore}/35`}</dd>
        </div>
        <div>
          <dt className="text-edito-muted">Accessibilité</dt>
          <dd className="mt-1 font-mono text-lg font-bold text-edito-ink">{actor.accessibilityScore === null ? "Non positionnée" : `${actor.accessibilityScore}/5`}</dd>
        </div>
      </dl>

      {actor.appetenceProvisoire ? (
        <p className="border-b border-edito-border py-3 text-xs font-semibold text-status-warning-ink">Score provisoire : accessibilité à consolider avant citation.</p>
      ) : null}

      <dl className="space-y-4 py-4 text-xs">
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-edito-muted">CA disponible</dt>
          <dd className="mt-1 text-sm font-semibold text-edito-ink">{formatRevenue(actor)}</dd>
          {actor.revenuePerimetre ? <dd className="mt-0.5 text-edito-muted">{actor.revenuePerimetre}</dd> : null}
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-edito-muted">Effectif France</dt>
          <dd className="mt-1 text-sm font-semibold text-edito-ink">{actor.headcountFrance ?? "Non disponible"}</dd>
        </div>
        {actor.positioning ? (
          <div>
            <dt className="font-bold uppercase tracking-[0.08em] text-edito-muted">Positionnement</dt>
            <dd className="mt-1 leading-relaxed text-edito-body">{actor.positioning}</dd>
          </div>
        ) : null}
        {actor.angleEntree ? (
          <div>
            <dt className="font-bold uppercase tracking-[0.08em] text-edito-muted">Angle d’entrée</dt>
            <dd className="mt-1 border-l-2 border-edito-brass pl-3 leading-relaxed text-edito-ink">{actor.angleEntree}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  )
}

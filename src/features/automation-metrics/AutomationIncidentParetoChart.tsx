"use client"

import type { AutomationIncidentCategory } from "./automation-metrics-types"

function rounded(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)
}

function delta(value: number): { text: string; color: string } {
  if (value === 0) return { text: "0 incident", color: "text-white/55" }
  return value > 0
    ? { text: `+${value} incident${value > 1 ? "s" : ""}`, color: "text-danger" }
    : { text: `${value} incident${value < -1 ? "s" : ""}`, color: "text-success" }
}

export function AutomationIncidentParetoChart({ categories }: { categories: AutomationIncidentCategory[] }) {
  if (categories.length === 0) {
    return <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs text-white/50">Aucun run en échec sur la période sélectionnée.</p>
  }
  const maximum = Math.max(...categories.map((category) => category.incidents))

  return (
    <section className="space-y-3" aria-label="Pareto des causes d’incident">
      <div>
        <h4 className="text-xs font-semibold text-white">Pareto des causes d’incident</h4>
        <p className="mt-1 text-[10px] text-white/45">Classement par volume d’incidents ; le cumul indique la concentration des causes.</p>
      </div>
      <div className="space-y-3" role="list" aria-label="Causes d’incident classées par volume">
        {categories.map((category, index) => {
          const width = maximum > 0 ? (category.incidents / maximum) * 100 : 0
          const opacity = Math.max(0.42, 0.9 - index * 0.1)
          const movement = delta(category.incidentsDelta)
          return (
            <article key={category.id} role="listitem" className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">{category.label}</p>
                  <p className="mt-0.5 text-[10px] text-white/45">{category.description}</p>
                </div>
                <div className="w-full text-left min-[520px]:w-auto min-[520px]:text-right">
                  <strong className="font-heading text-lg tabular-nums text-white">{category.incidents}</strong>
                  <p className={`text-[10px] font-semibold ${movement.color}`}>{movement.text} vs période précédente</p>
                </div>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/[0.08]" aria-label={`${category.incidents} incidents, ${rounded(category.sharePct)} % du total, cumul ${rounded(category.cumulativeSharePct)} %`}>
                <span className="block h-full rounded-full bg-danger" style={{ width: `${width}%`, opacity }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[10px] text-white/50">
                <span>{rounded(category.sharePct)} % du total</span>
                <span>Cumul : {rounded(category.cumulativeSharePct)} %</span>
              </div>
            </article>
          )
        })}
      </div>
      <table className="sr-only">
        <caption>Données détaillées du Pareto des causes d’incident</caption>
        <thead><tr><th>Catégorie</th><th>Description</th><th>Incidents</th><th>Part</th><th>Part cumulée</th><th>Incidents période précédente</th><th>Évolution</th></tr></thead>
        <tbody>{categories.map((category) => <tr key={`${category.id}-row`}><td>{category.label}</td><td>{category.description}</td><td>{category.incidents}</td><td>{rounded(category.sharePct)} %</td><td>{rounded(category.cumulativeSharePct)} %</td><td>{category.previousIncidents}</td><td>{delta(category.incidentsDelta).text}</td></tr>)}</tbody>
      </table>
    </section>
  )
}

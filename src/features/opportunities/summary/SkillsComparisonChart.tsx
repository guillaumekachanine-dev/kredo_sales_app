import type { SkillDemandRow, SkillSupplyRow } from "../data/opportunities-synthese.types"
import { alignSkillTopFives, scaleLength } from "./summary-geometry"
import { formatNumber } from "./summary-formatters"

function SkillRail({ value, max, side }: { value: number; max: number; side: "demand" | "supply" }) {
  const length = scaleLength(value, max, 94)
  const end = side === "demand" ? 97 - length : 3 + length
  return <svg aria-hidden="true" viewBox="0 0 100 12" preserveAspectRatio="none" className="my-1 h-3 w-full overflow-hidden">
    <line x1="3" x2="97" y1="6" y2="6" stroke="var(--color-border)" vectorEffect="non-scaling-stroke" />
    <line x1={side === "demand" ? 97 : 3} x2={end} y1="6" y2="6"
      stroke={side === "demand" ? "var(--color-primary)" : "var(--color-heading)"}
      strokeWidth="2" strokeDasharray={side === "supply" ? "3 2" : undefined} vectorEffect="non-scaling-stroke" />
    <line x1={end} x2={end} y1="2" y2="10"
      stroke={side === "demand" ? "var(--color-primary)" : "var(--color-heading)"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
  </svg>
}

export function SkillsComparisonChart({ demand, supply }: {
  demand: readonly SkillDemandRow[]
  supply: readonly SkillSupplyRow[]
}) {
  const rows = alignSkillTopFives(demand, supply)
  const maxDemand = Math.max(0, ...demand.map((row) => row.score))
  const maxSupply = Math.max(0, ...supply.map((row) => row.personCount))
  return (
    <section aria-label="Compétences" className="min-w-0 py-7">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">02 / Demande & vivier</p>
      <h2 className="font-heading text-xl font-bold text-heading">Compétences</h2>
      <p className="mt-1 text-sm leading-5 text-body">Top 5 de chaque population · deux échelles indépendantes</p>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(100px,1.15fr)_minmax(0,1fr)] gap-3 border-b border-border pb-3 text-xs text-body">
        <p><strong className="block text-primary">← Demande</strong>Score pondéré<br />{demand.length ? `0 → ${formatNumber(maxDemand)}` : "Non renseigné"}</p>
        <p className="self-end text-center">Compétence<br />Rangs propres à chaque Top 5</p>
        <p className="text-right"><strong className="block text-heading">Vivier →</strong>Profils distincts<br />{supply.length ? `0 → ${formatNumber(maxSupply)}` : "Non renseigné"}</p>
      </div>
      {demand.length === 0 && <p className="mt-3 text-sm text-body">Aucune compétence demandée renseignée.</p>}
      {supply.length === 0 && <p className="mt-3 text-sm text-body">Aucune compétence renseignée dans le vivier.</p>}
      <ul aria-label="Comparaison des Top 5 compétences" className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.skillId} className="grid grid-cols-[minmax(0,1fr)_minmax(100px,1.15fr)_minmax(0,1fr)] items-center gap-3 py-3">
            <div className="min-w-0">
              {row.demand ? <>
                <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-body"><span>#{row.demandRank}</span><strong className="text-sm tabular-nums text-primary">{formatNumber(row.demand.score)} pts</strong></p>
                <SkillRail value={row.demand.score} max={maxDemand} side="demand" />
                <p className="text-xs text-body">{formatNumber(row.demand.opportunityCount)} opportunité(s)</p>
              </> : <p className="text-xs text-body">{demand.length ? "Hors Top 5" : "Non renseigné"}</p>}
            </div>
            <p className="break-words text-center text-sm font-semibold leading-5 text-heading">{row.name}</p>
            <div className="min-w-0 text-right">
              {row.supply ? <>
                <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-body"><strong className="text-sm tabular-nums text-heading">{formatNumber(row.supply.personCount)} profil(s)</strong><span>#{row.supplyRank}</span></p>
                <SkillRail value={row.supply.personCount} max={maxSupply} side="supply" />
                <p className="text-xs text-body">Σ niveaux : {formatNumber(row.supply.levelSum)}</p>
              </> : <p className="text-xs text-body">{supply.length ? "Hors Top 5" : "Non renseigné"}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-body">Les longueurs se lisent uniquement au sein de chaque côté. Une absence du Top 5 ne signifie pas zéro ; ce miroir ne mesure pas une couverture du besoin.</p>
    </section>
  )
}

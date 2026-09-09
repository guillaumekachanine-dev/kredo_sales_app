import Link from "next/link"
import type { OpportunityProcessRow, StaffingFunnelStep, StaffingProgressionBucket } from "../data/opportunities-synthese.types"
import { formatNumber } from "./summary-formatters"

const STATION_LABELS: Record<StaffingProgressionBucket, string> = {
  identifie: "Identifié", propose: "Proposé", envoye_client: "Envoyé client", entretien: "Entretien", retenu: "Retenu",
}

export function ProcessFlowChart({ steps, opportunities }: {
  steps: readonly StaffingFunnelStep[]
  opportunities: readonly OpportunityProcessRow[]
}) {
  const max = Math.max(0, ...steps.map((step) => step.count))
  return (
    <section aria-label="Processus" className="min-w-0 py-7">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">03 / Avancement des profils</p>
      <h2 className="font-heading text-xl font-bold text-heading">Processus</h2>
      <p className="mt-1 text-sm leading-5 text-body">Positionnements des opportunités ouvertes · statuts actuels</p>
      {steps.length > 0 && <>
        <ol className="mt-7 grid grid-cols-5 gap-2" aria-label="Stations de progression staffing">
          {steps.map((step) => <li key={step.bucket} className="min-w-0 text-center">
            <p className="font-heading text-2xl font-bold tabular-nums text-heading">{formatNumber(step.count)}</p>
            <p className="mt-1 min-h-10 break-words text-xs font-semibold text-body">{STATION_LABELS[step.bucket]}</p>
            <span className="sr-only">{step.label}</span>
          </li>)}
        </ol>
        <svg aria-hidden="true" viewBox="0 0 500 56" className="h-auto w-full overflow-hidden">
          {steps.map((step, index) => {
            const x = (index + 0.5) * 500 / steps.length
            // Area is proportional to current stock. Empty station remains an open point.
            const radius = max > 0 ? Math.sqrt(step.count / max) * 17 : 0
            return <g key={step.bucket}>
              {index < steps.length - 1 && <>
                <line x1={x + 21} x2={x + 500 / steps.length - 21} y1="28" y2="28" stroke="var(--color-border-strong)" vectorEffect="non-scaling-stroke" />
                <path d={`M ${x + 500 / steps.length / 2 - 3} 25 l 4 3 l -4 3`} fill="none" stroke="var(--color-body)" vectorEffect="non-scaling-stroke" />
              </>}
              <circle cx={x} cy="28" r={radius || 3} fill={step.count > 0 ? "var(--color-primary)" : "var(--color-surface)"}
                stroke={step.count > 0 ? "var(--color-primary)" : "var(--color-body)"} vectorEffect="non-scaling-stroke" />
            </g>
          })}
        </svg>
      </>}
      {max === 0 && <p className="mt-3 text-sm text-body">Aucun positionnement dans ces étapes.</p>}
      <p className="mt-4 text-xs leading-5 text-body">Le rail indique l’ordre des étapes, pas un flux mesuré ni un taux de conversion. Proposé inclut les présélections ; retenu inclut les gagnés. Les statuts terminaux négatifs sont exclus.</p>
      {opportunities.length > 0 && <details className="mt-5 border-t border-border pt-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-heading focus-visible:outline-2 focus-visible:outline-primary">Lire par opportunité <span className="font-normal text-body">({formatNumber(opportunities.length)})</span></summary>
        <ul className="divide-y divide-border">
          {opportunities.map((opportunity) => <li key={opportunity.opportunityId} className="py-3 text-xs text-body">
            <Link href={`/missions/opps/${encodeURIComponent(opportunity.opportunityId)}`} className="inline-block py-1 text-sm font-semibold text-heading hover:underline focus-visible:outline-2 focus-visible:outline-primary">{opportunity.title}</Link>
            <p>{opportunity.clientName ?? "Client non renseigné"} · Étape commerciale : <strong className="text-heading">{opportunity.stageLabel}</strong></p>
            <dl className="mt-2 grid grid-cols-5 gap-2">
              {steps.map((step) => <div key={step.bucket} className="min-w-0"><dt className="break-words">{STATION_LABELS[step.bucket]}</dt><dd className="mt-1 font-semibold tabular-nums text-heading">{formatNumber(opportunity.positioningsByBucket[step.bucket])}</dd></div>)}
            </dl>
            <p className="mt-2">{formatNumber(opportunity.excludedPositioningsCount)} positionnement(s) exclu(s) du rail</p>
          </li>)}
        </ul>
      </details>}
    </section>
  )
}

import { useId } from "react"
import type { ConsultantsPracticeBucket } from "@/features/consultants/data/consultants-synthese.types"

interface DoubleTrackPracticeChartProps {
  buckets: readonly ConsultantsPracticeBucket[]
  referenceYear: number
}

function trackWidth(value: number, max: number): string {
  if (value <= 0 || max <= 0) return "0%"
  return `${(value / max) * 100}%`
}

export function DoubleTrackPracticeChart({
  buckets,
  referenceYear,
}: DoubleTrackPracticeChartProps) {
  const titleId = useId()
  const maxPopulation = Math.max(
    1,
    ...buckets.flatMap((bucket) => [bucket.collaborators, bucket.candidates]),
  )

  return (
    <section
      aria-labelledby={titleId}
      className="flex h-full flex-col rounded-lg border border-edito-border bg-edito-surface"
    >
      <header className="border-b border-edito-border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-edito-navy">
              Double voie
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-bold tracking-tight text-edito-heading">
              Collaborateurs et candidats rattachés par practice
            </h2>
            <p className="mt-1 text-xs text-edito-body">
              Deux dynamiques complémentaires pour soutenir la croissance.
            </p>
          </div>
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[11px] font-medium text-edito-body"
            aria-label="Légende de la visualisation"
          >
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-primary" />
              Collaborateurs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm border border-primary bg-edito-surface" />
              Candidats rattachés
            </span>
          </div>
        </div>
      </header>

      {buckets.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-5 py-12 text-center text-sm text-edito-muted">
          Aucun collaborateur, candidat ou recrutement rattaché à une practice.
        </p>
      ) : (
        <div className="flex-1 px-5 pb-4 pt-3">
          <div className="grid grid-cols-[minmax(9rem,0.78fr)_minmax(0,1fr)_3.5rem] gap-x-4 border-b border-edito-border pb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-edito-muted">
            <span>Practice</span>
            <span>Capacité interne et candidats rattachés</span>
            <span className="text-right">Recrutés</span>
          </div>
          <ul className="divide-y divide-edito-border">
            {buckets.map((bucket) => (
              <li
                key={bucket.key ?? "__other__"}
                className="grid grid-cols-[minmax(9rem,0.78fr)_minmax(0,1fr)_3.5rem] items-center gap-x-4 py-3"
                aria-label={`${bucket.label} : ${bucket.collaborators} collaborateurs, ${bucket.candidates} candidats rattachés, ${bucket.hiresYearToDate} recrutés en ${referenceYear}`}
              >
                <span className="pr-1 text-xs font-semibold leading-snug text-edito-heading">
                  {bucket.label}
                </span>
                <div className="grid gap-1.5">
                  <div className="grid grid-cols-[4.8rem_minmax(0,1fr)_1.75rem] items-center gap-2">
                    <span className="text-[10px] font-semibold text-edito-body">Collaborateurs</span>
                    <span className="h-2.5 overflow-hidden rounded-sm bg-edito-chip">
                      <span
                        aria-hidden
                        className="block h-full min-w-0 rounded-sm bg-primary"
                        style={{ width: trackWidth(bucket.collaborators, maxPopulation) }}
                      />
                    </span>
                    <span className="text-right text-xs font-bold tabular-nums text-edito-ink">
                      {bucket.collaborators}
                    </span>
                  </div>
                  <div className="grid grid-cols-[4.8rem_minmax(0,1fr)_1.75rem] items-center gap-2">
                    <span className="text-[10px] font-semibold text-edito-muted">Candidats</span>
                    <span className="h-2.5 overflow-hidden rounded-sm bg-edito-chip">
                      <span
                        aria-hidden
                        className="block h-full rounded-sm border border-primary bg-edito-surface"
                        style={{ width: trackWidth(bucket.candidates, maxPopulation) }}
                      />
                    </span>
                    <span className="text-right text-xs font-bold tabular-nums text-edito-ink">
                      {bucket.candidates}
                    </span>
                  </div>
                </div>
                <span className="text-right text-base font-bold tabular-nums text-edito-brass">
                  {bucket.hiresYearToDate}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-edito-muted">
            Recrutés : processus clôturés « hired » en {referenceYear}, rattachés au profil de poste
            puis au candidat quand nécessaire.
          </p>
        </div>
      )}
    </section>
  )
}

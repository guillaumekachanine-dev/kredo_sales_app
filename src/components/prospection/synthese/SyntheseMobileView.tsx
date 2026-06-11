import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { SyntheseData } from "@/lib/prospection/synthese-data"
import { STATUS_TEXT, StatusDot, ProgressBar, CompanyLink } from "../prospection-parts"

// Synthèse — vue mobile : l'essentiel décisionnel, synthétique et tappable.
export function SyntheseMobileView({ data }: { data: SyntheseData }) {
  const { kpis, lifecycle, sectorHeat, pipeline, accountsToActivate, signalRadar } = data
  const maxLife = Math.max(1, ...lifecycle.map((l) => l.count))

  return (
    <div className="flex flex-col gap-5 bg-canvas px-4 py-5 pb-24">
      <header>
        <h1 className="text-lg font-semibold text-heading">Synthèse</h1>
        <p className="mt-0.5 text-sm text-body">Votre portefeuille de prospection en un coup d&apos;œil.</p>
      </header>

      {/* KPI — défilement horizontal compact */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {kpis.map((kpi) => (
          <SurfaceCard key={kpi.id} className="w-36 shrink-0 p-3">
            <div className={cn("text-xl font-semibold tabular-nums", STATUS_TEXT[kpi.status])}>{kpi.value}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-muted">{kpi.label}</div>
          </SurfaceCard>
        ))}
      </div>

      {/* Radar de signaux */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Radar de signaux</h2>
        <div className="flex flex-col gap-2">
          {signalRadar.map((s) => (
            <SurfaceCard key={s.id} className="flex items-center gap-3 p-3.5">
              <StatusDot status={s.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-heading">
                  <CompanyLink company={s.company} companyId={s.companyId} />
                  <span className="font-normal text-muted"> · {s.kind}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-body">{s.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-muted">{s.dateLabel}</span>
            </SurfaceCard>
          ))}
        </div>
      </section>

      {/* Comptes à activer */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Comptes à activer</h2>
        <div className="flex flex-col gap-2">
          {accountsToActivate.map((a) => (
            <Link key={a.id} href={`/prospection/accounts/${a.id}`}>
              <SurfaceCard className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-heading">{a.name}</p>
                  <p className="text-xs text-muted">{a.sector} · {a.lifecycleLabel}</p>
                </div>
                <ScoreBadge score={a.score} />
              </SurfaceCard>
            </Link>
          ))}
        </div>
      </section>

      {/* Pipeline pondéré */}
      <SurfaceCard className="p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Pipeline pondéré</h2>
          <span className="text-xs text-muted">{pipeline.openCount} ouvertes</span>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-success">{formatEuro(pipeline.totalWeighted)}</p>
      </SurfaceCard>

      {/* Répartition portefeuille */}
      <SurfaceCard className="p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Répartition</h2>
        <ul className="flex flex-col gap-2.5">
          {lifecycle.map((l) => (
            <li key={l.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-body">{l.label}</span>
                <span className="font-medium tabular-nums text-heading">{l.count}</span>
              </div>
              <ProgressBar value={(l.count / maxLife) * 100} status={l.status} />
            </li>
          ))}
        </ul>
      </SurfaceCard>

      {/* Secteurs chauds */}
      <SurfaceCard className="p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Secteurs chauds</h2>
        <ul className="flex flex-col divide-y divide-border">
          {sectorHeat.map((s) => (
            <li key={s.sector} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="min-w-0 truncate text-sm text-body">{s.sector}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted tabular-nums">{s.count}</span>
                <ScoreBadge score={s.avgScore} />
              </div>
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </div>
  )
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-muted">—</span>
  }
  const tone = score >= 3.5 ? "text-success" : score >= 2 ? "text-warning" : "text-muted"
  return <span className={cn("rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold tabular-nums", tone)}>{score}/5</span>
}

function formatEuro(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)} k€`
  return `${Math.round(value)} €`
}

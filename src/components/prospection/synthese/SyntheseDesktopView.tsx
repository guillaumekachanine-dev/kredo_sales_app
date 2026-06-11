import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { SyntheseData } from "@/lib/prospection/synthese-data"
import { STATUS_TEXT, StatusDot, ProgressBar, CompanyLink } from "../prospection-parts"

// Synthèse — vue desktop, DÉCISIONNELLE : où regarder à l'échelle du portefeuille.
export function SyntheseDesktopView({ data }: { data: SyntheseData }) {
  const { kpis, lifecycle, sectorHeat, pipeline, accountsToActivate, signalRadar } = data
  const maxLife = Math.max(1, ...lifecycle.map((l) => l.count))
  const maxStage = Math.max(1, ...pipeline.stages.map((s) => s.weighted))

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 bg-canvas px-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-heading">Synthèse</h1>
          <p className="mt-1 max-w-2xl text-sm text-body">
            Vue décisionnelle du portefeuille de prospection : signaux, secteurs chauds, pipeline
            et comptes à activer. L&apos;exécution se pilote dans <span className="font-medium">Suivi</span>.
          </p>
        </div>
        <Link
          href="/prospection/accounts"
          className="shrink-0 rounded-md border border-border px-4 py-2 text-sm font-medium text-body transition-colors hover:bg-surface-hover"
        >
          Tous les comptes
        </Link>
      </header>

      {/* KPI portefeuille */}
      <div className="grid grid-cols-5 gap-5">
        {kpis.map((kpi) => (
          <SurfaceCard key={kpi.id} className="p-4">
            <div className="flex items-center gap-2">
              <StatusDot status={kpi.status} />
              <span className="text-xs text-muted">{kpi.label}</span>
            </div>
            <div className={cn("mt-2 text-2xl font-semibold tabular-nums", STATUS_TEXT[kpi.status])}>{kpi.value}</div>
            {kpi.hint && <div className="mt-0.5 text-[11px] text-muted">{kpi.hint}</div>}
          </SurfaceCard>
        ))}
      </div>

      {/* Radar de signaux (7) + Comptes à activer (5) */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <SurfaceCard className="col-span-7 p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-heading">Radar de signaux</h2>
            <span className="text-xs text-muted">Ce qui bouge sur le portefeuille</span>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {signalRadar.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <StatusDot status={s.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-heading">
                    <span className="font-medium">
                      <CompanyLink company={s.company} companyId={s.companyId} />
                    </span>
                    <span className="text-muted"> · {s.kind}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-body">{s.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{s.dateLabel}</span>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard className="col-span-5 p-5">
          <h2 className="mb-4 text-sm font-semibold text-heading">Comptes à activer</h2>
          {accountsToActivate.length === 0 ? (
            <p className="text-sm text-muted">Aucune cible ou prospect en attente.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {accountsToActivate.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-heading">
                      <CompanyLink company={a.name} companyId={a.id} />
                    </p>
                    <p className="text-xs text-muted">{a.sector} · {a.lifecycleLabel}</p>
                  </div>
                  <ScoreBadge score={a.score} />
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      </div>

      {/* Répartition (4) + Secteurs chauds (4) + Pipeline (4) */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <SurfaceCard className="col-span-4 p-5">
          <h2 className="mb-4 text-sm font-semibold text-heading">Répartition du portefeuille</h2>
          <ul className="flex flex-col gap-3">
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

        <SurfaceCard className="col-span-4 p-5">
          <h2 className="mb-4 text-sm font-semibold text-heading">Secteurs chauds</h2>
          <ul className="flex flex-col divide-y divide-border">
            {sectorHeat.map((s) => (
              <li key={s.sector} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0 truncate text-sm text-body">{s.sector}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted tabular-nums">{s.count} cpt</span>
                  <ScoreBadge score={s.avgScore} />
                </div>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard className="col-span-4 p-5">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-heading">Pipeline pondéré</h2>
            <span className="text-xs text-muted">{pipeline.openCount} ouvertes</span>
          </div>
          <p className="mb-4 text-2xl font-semibold tabular-nums text-success">{formatEuro(pipeline.totalWeighted)}</p>
          <ul className="flex flex-col gap-3">
            {pipeline.stages.map((st) => (
              <li key={st.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-body">{st.label}</span>
                  <span className="font-medium tabular-nums text-heading">{formatEuro(st.weighted)}</span>
                </div>
                <ProgressBar value={(st.weighted / maxStage) * 100} status="success" />
              </li>
            ))}
            {pipeline.stages.length === 0 && <li className="text-sm text-muted">Aucune opportunité ouverte.</li>}
          </ul>
        </SurfaceCard>
      </div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-muted">non scoré</span>
  }
  const tone = score >= 3.5 ? "text-success" : score >= 2 ? "text-warning" : "text-muted"
  return <span className={cn("rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold tabular-nums", tone)}>{score}/5</span>
}

function formatEuro(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)} k€`
  return `${Math.round(value)} €`
}

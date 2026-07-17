import { formatEuroCompact } from "@/lib/formatters"
import { ActivityWatchModule } from "./ActivityWatchModule"
import { RevenueBreakdownChart } from "./RevenueBreakdownChart"
import { RevenueOverviewChart } from "./RevenueOverviewChart"
import { UpcomingMilestonesModule } from "./UpcomingMilestonesModule"
import type { EngagementsOverviewViewModel } from "./engagements-overview-types"

interface EngagementsOverviewDesktopProps {
  overview: EngagementsOverviewViewModel
}

export function EngagementsOverviewDesktop({ overview }: EngagementsOverviewDesktopProps) {
  return (
    <div className="flex h-full min-h-[620px] flex-col gap-3 overflow-hidden p-4 xl:p-5">
      <header className="flex shrink-0 items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl font-black tracking-tight text-heading">Synthèse des engagements</h1>
            {overview.status === "partial" && (
              <span
                className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-bold text-[var(--color-status-warning-ink)]"
                title={overview.issues.join(" · ")}
              >
                Données partielles
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            {overview.portfolio.activeMissions} mission{overview.portfolio.activeMissions > 1 ? "s" : ""} AT active{overview.portfolio.activeMissions > 1 ? "s" : ""}
            {" · "}{overview.portfolio.activeProjects} projet{overview.portfolio.activeProjects > 1 ? "s" : ""} actif{overview.portfolio.activeProjects > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold text-body">
          Année {overview.year} · réalisé uniquement
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-2 gap-3">
        <section className="col-span-7 flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface p-4" aria-label="Chiffre d’affaires réalisé">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-sm font-bold text-heading">CA réalisé — {overview.year}</h2>
              <p className="mt-0.5 text-[10px] text-muted">CRA validés et jalons facturés · aucun forecast</p>
            </div>
            <div className="flex items-end gap-5 text-right">
              <div>
                <p className="font-heading text-2xl font-black leading-none text-heading">{formatEuroCompact(overview.revenue.total)}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted">Total YTD</p>
              </div>
              <div className="space-y-1 text-[10px]">
                <p className="flex items-center justify-end gap-1.5 font-semibold text-body"><span className="h-2 w-2 bg-primary" />AT <strong className="font-mono text-heading">{formatEuroCompact(overview.revenue.assistanceTechnique)}</strong></p>
                <p className="flex items-center justify-end gap-1.5 font-semibold text-body"><span className="h-2 w-2 border border-[var(--color-dataviz-2)] bg-[var(--color-dataviz-2)]" />Projets <strong className="font-mono text-heading">{formatEuroCompact(overview.revenue.projects)}</strong></p>
              </div>
            </div>
          </div>
          {overview.revenue.total > 0 ? (
            <div className="mt-1 min-h-0 flex-1"><RevenueOverviewChart monthly={overview.revenue.monthly} /></div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-xs text-muted">
              Aucun CA réalisé selon les conventions de validation et de facturation.
            </div>
          )}
        </section>

        <RevenueBreakdownChart byPractice={overview.revenue.byPractice} byClient={overview.revenue.byClient} />
        <ActivityWatchModule activity={overview.activity} />
        <UpcomingMilestonesModule milestones={overview.milestones} />
      </div>
    </div>
  )
}

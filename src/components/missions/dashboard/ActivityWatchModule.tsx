import { formatDateShort, formatPct } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { ActivityTrendChart } from "./ActivityTrendChart"
import { MarginGapChart } from "./MarginGapChart"
import type { EngagementsPortfolioViewModel } from "./engagements-portfolio-types"

interface ActivityWatchModuleProps {
  activity: EngagementsPortfolioViewModel["activity"]
  embedded?: boolean
}

export function ActivityWatchModule({ activity, embedded = false }: ActivityWatchModuleProps) {
  const monthLabel = activity.latestValidatedMonth
    ? formatDateShort(`${activity.latestValidatedMonth}-01`)
    : null
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-sm font-bold text-heading">Taux d’activité et points de vigilance</h2>
          <p className="mt-0.5 text-[10px] text-muted">CRA validés · moyenne pondérée depuis janvier</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-heading text-2xl font-black leading-none text-primary">
            {formatPct(activity.weightedYtdRate)}
          </p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted">Taux moyen</p>
        </div>
      </div>

      {activity.weightedYtdRate === null ? (
        <div className="flex flex-1 items-center justify-center py-8 text-center text-xs text-muted">
          Activité non encore validée pour l’année en cours.
        </div>
      ) : (
        <div className="mt-1 grid min-h-0 flex-1 grid-cols-[minmax(150px,0.9fr)_minmax(0,1.5fr)] gap-4 max-md:grid-cols-1">
          <div className="min-w-0 self-end">
            <ActivityTrendChart trend={activity.monthlyTrend} />
          </div>
          <div className="min-h-0 border-l border-border pl-4 max-md:border-l-0 max-md:border-t max-md:pl-0 max-md:pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-heading">Points de vigilance</h3>
              {monthLabel && <span className="text-[9px] text-muted">{monthLabel}</span>}
            </div>
            {activity.watchlist.length === 0 ? (
              <p className="py-5 text-center text-[11px] text-muted">Aucun écart négatif sur le dernier mois validé.</p>
            ) : (
              <ol className="space-y-1">
                {activity.watchlist.map((item) => (
                  <li key={item.collaboratorId} className="grid grid-cols-[minmax(0,1fr)_58px_48px] items-center gap-2 text-[10px] max-xl:leading-none">
                    <div className="min-w-0">
                      <p className={cn("font-semibold text-heading", embedded ? "break-words" : "truncate")} title={item.name}>{item.name}</p>
                      <p className={cn("text-[9px] text-muted", embedded ? "break-words" : "truncate")} title={item.companyName}>{item.companyName}</p>
                    </div>
                    <div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-border/70" aria-hidden="true">
                        <div className="h-full rounded-full bg-warning" style={{ width: `${Math.min(100, Math.max(0, item.rate))}%` }} />
                      </div>
                      <p className="mt-0.5 text-[8px] text-muted">{item.rate}% / {item.targetRate}%</p>
                    </div>
                    <span className="text-right font-mono font-bold text-danger">{item.gapPoints.toFixed(1)} pts</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-2 border-t border-border pt-2">
              <div className="mb-1 flex items-center justify-between"><h3 className="text-[9px] font-bold uppercase tracking-[0.12em] text-heading">Marge réelle vs cible</h3><span className="text-[8px] text-muted">● réelle · ○ cible</span></div>
              <MarginGapChart items={activity.marginGaps} />
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (embedded) return <div className="flex min-h-0 flex-col">{content}</div>
  return (
    <section className="col-span-7 flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface p-4 max-xl:p-3" aria-label="Taux d’activité et points de vigilance">
      {content}
    </section>
  )
}

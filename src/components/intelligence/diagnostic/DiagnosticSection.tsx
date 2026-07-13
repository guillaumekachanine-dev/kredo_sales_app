"use client"

import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { DiagnosticCorrelationCard } from "./DiagnosticCorrelationCard"
import { DiagnosticPriorityCallout } from "./DiagnosticPriorityCallout"
import { DiagnosticRefreshButton } from "./DiagnosticRefreshButton"
import { useWorkspaceDiagnostic } from "./use-workspace-diagnostic"
import type { WorkspaceDiagnosticSnapshot } from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

interface DiagnosticSectionProps {
  initialSnapshot: WorkspaceDiagnosticSnapshot | null
}

function freshnessLabel(generatedAt: string): string {
  const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(generatedAt).getTime()) / 86_400_000))
  if (elapsedDays === 0) return "Généré aujourd’hui"
  if (elapsedDays === 1) return "Généré hier"
  return `Généré il y a ${elapsedDays} jours`
}

export function DiagnosticSection({ initialSnapshot }: DiagnosticSectionProps) {
  const { diagnostic, error, isRefreshing, refresh } = useWorkspaceDiagnostic(initialSnapshot)

  return (
    <SurfaceCard accent="primary" className="overflow-visible">
      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Diagnostic macro IA
              </p>
              <h2 className="mt-1 text-lg font-semibold text-heading">
                Lecture du centre de profit
              </h2>
            </div>
            <DiagnosticRefreshButton isRefreshing={isRefreshing} onRefresh={refresh} />
          </div>

          {diagnostic ? (
            <>
              <p className="mt-4 max-w-4xl text-[15px] leading-7 text-heading">
                {diagnostic.executiveSummary}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span>{diagnostic.periodLabel}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={diagnostic.generatedAt} suppressHydrationWarning>
                  {freshnessLabel(diagnostic.generatedAt)}
                </time>
              </div>

              {diagnostic.correlations.length > 0 ? (
                <div className="mt-5 border-t border-border/70 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Corrélations
                  </p>
                  {diagnostic.correlations.map((correlation) => (
                    <DiagnosticCorrelationCard key={correlation.id} correlation={correlation} />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-5 border-t border-border/70 pt-4">
              <p className="text-sm leading-6 text-body">
                Aucun diagnostic n’a encore été généré pour ce workspace. Les données du cockpit restent disponibles pendant l’analyse.
              </p>
            </div>
          )}

          {error ? <p className="mt-3 text-sm text-danger" role="status">{error}</p> : null}
        </div>

        <aside className="border-t border-border/70 pt-4 xl:border-t-0 xl:border-l xl:pl-5 xl:pt-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Priorités
          </p>
          {diagnostic?.priorities.length ? (
            <ol className="mt-3">
              {diagnostic.priorities.map((priority) => (
                <DiagnosticPriorityCallout key={priority.rank} priority={priority} />
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted">En attente du premier diagnostic.</p>
          )}

          {diagnostic?.watchList.length ? (
            <div className="mt-5 border-t border-border/70 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                À surveiller
              </p>
              <ul className="mt-2 space-y-2">
                {diagnostic.watchList.map((item) => (
                  <li key={item.signal} className="text-xs leading-5 text-body">
                    <span className="font-semibold text-heading">{item.signal}</span>
                    <span> · {item.horizon}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {diagnostic?.strengths.length ? (
            <div className="mt-5 border-t border-border/70 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Points d’appui
              </p>
              <ul className="mt-2 space-y-2">
                {diagnostic.strengths.map((item) => (
                  <li key={item.observation} className="text-xs leading-5 text-body">
                    {item.observation}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </SurfaceCard>
  )
}

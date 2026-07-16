"use client"

import { DiagnosticCorrelationCard } from "@/components/intelligence/diagnostic/DiagnosticCorrelationCard"
import { DiagnosticPriorityCallout } from "@/components/intelligence/diagnostic/DiagnosticPriorityCallout"
import { DiagnosticRefreshButton } from "@/components/intelligence/diagnostic/DiagnosticRefreshButton"
import { useWorkspaceDiagnostic } from "@/components/intelligence/diagnostic/use-workspace-diagnostic"
import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import { COCKPIT_DIAGNOSTIC_ARBITRATIONS_LABEL } from "./cockpit-mobile-module-presenters"

function freshnessLabel(generatedAt: string) {
  const elapsedDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(generatedAt).getTime()) / 86_400_000),
  )
  if (elapsedDays === 0) return "Généré aujourd’hui"
  if (elapsedDays === 1) return "Généré hier"
  return `Généré il y a ${elapsedDays} jours`
}

export function CockpitDiagnosticModule({ snapshot }: { snapshot: CockpitMobileSnapshot }) {
  const { diagnostic, error, isRefreshing, refresh } = useWorkspaceDiagnostic(snapshot.diagnostic)

  return (
    <div className="cockpit-diagnostic-module">
      <DiagnosticRefreshButton isRefreshing={isRefreshing} onRefresh={refresh} fullWidth />

      {diagnostic ? (
        <>
          <section className="cockpit-module-section" aria-labelledby="diagnostic-summary">
            <h3 id="diagnostic-summary">Synthèse exécutive</h3>
            <p className="cockpit-sheet-summary">{diagnostic.executiveSummary}</p>
            <p className="cockpit-module-freshness">
              <span>{diagnostic.periodLabel}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={diagnostic.generatedAt} suppressHydrationWarning>
                {freshnessLabel(diagnostic.generatedAt)}
              </time>
            </p>
          </section>

          <section className="cockpit-module-section" aria-labelledby="diagnostic-correlations">
            <h3 id="diagnostic-correlations">Corrélations</h3>
            {diagnostic.correlations.length > 0 ? (
              <div className="cockpit-diagnostic-correlations">
                {diagnostic.correlations.map((correlation) => (
                  <DiagnosticCorrelationCard key={correlation.id} correlation={correlation} />
                ))}
              </div>
            ) : (
              <p className="cockpit-sheet-empty">Aucune corrélation détectée dans le dernier diagnostic.</p>
            )}
          </section>

          <section className="cockpit-module-section" aria-labelledby="diagnostic-arbitrations">
            <h3 id="diagnostic-arbitrations">{COCKPIT_DIAGNOSTIC_ARBITRATIONS_LABEL}</h3>
            {diagnostic.priorities.length > 0 ? (
              <ol className="cockpit-diagnostic-arbitrations">
                {diagnostic.priorities.map((priority) => (
                  <DiagnosticPriorityCallout key={priority.rank} priority={priority} />
                ))}
              </ol>
            ) : (
              <p className="cockpit-sheet-empty">Aucun arbitrage recommandé actuellement.</p>
            )}
          </section>
        </>
      ) : (
        <p className="cockpit-sheet-empty">
          Aucun diagnostic enregistré. Utilisez Actualiser pour lancer explicitement une analyse.
        </p>
      )}

      {error ? <p className="cockpit-diagnostic-error" role="status">{error}</p> : null}
    </div>
  )
}

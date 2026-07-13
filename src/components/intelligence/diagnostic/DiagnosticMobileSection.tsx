"use client"

import { MobileHeroInsight } from "@/components/ui/mobile/MobileHeroInsight"
import { DiagnosticCorrelationCard } from "./DiagnosticCorrelationCard"
import { DiagnosticPriorityCallout } from "./DiagnosticPriorityCallout"
import { DiagnosticRefreshButton } from "./DiagnosticRefreshButton"
import { useWorkspaceDiagnostic } from "./use-workspace-diagnostic"
import type { WorkspaceDiagnosticSnapshot } from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

interface DiagnosticMobileSectionProps {
  initialSnapshot: WorkspaceDiagnosticSnapshot | null
}

export function DiagnosticMobileSection({ initialSnapshot }: DiagnosticMobileSectionProps) {
  const { diagnostic, error, isRefreshing, refresh } = useWorkspaceDiagnostic(initialSnapshot)

  return (
    <section aria-labelledby="workspace-diagnostic-mobile-title" className="mb-5">
      <MobileHeroInsight
        eyebrow="Diagnostic macro IA"
        title={<span id="workspace-diagnostic-mobile-title">Lecture du centre de profit</span>}
        summary={
          diagnostic?.executiveSummary
          ?? "Générez une lecture transversale à partir des faits déjà calculés dans le cockpit."
        }
        sourceLabel="commerce · delivery · finance · équipe · recrutement"
        updatedAt={diagnostic?.periodLabel}
        tone="brand"
        primaryAction={
          <DiagnosticRefreshButton
            isRefreshing={isRefreshing}
            onRefresh={refresh}
            fullWidth
          />
        }
      />

      {error ? <p className="mt-2 text-sm text-danger" role="status">{error}</p> : null}

      {diagnostic?.correlations.length ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Corrélations
          </p>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {diagnostic.correlations.map((correlation) => (
              <DiagnosticCorrelationCard
                key={correlation.id}
                correlation={correlation}
                mobile
              />
            ))}
          </div>
        </div>
      ) : null}

      {diagnostic?.priorities.length ? (
        <div className="mt-4 border-t border-border/70 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Priorités
          </p>
          <ol>
            {diagnostic.priorities.map((priority) => (
              <DiagnosticPriorityCallout key={priority.rank} priority={priority} />
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  )
}

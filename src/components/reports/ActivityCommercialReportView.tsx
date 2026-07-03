"use client"

import { cn } from "@/lib/utils"
import { formatDate, formatEuro } from "@/lib/formatters"
import type { ActivityCommercialContent } from "@/app/(app)/reports/_data/reports-types"

function BlockHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="h-px w-3 bg-brand-brass/60" aria-hidden />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">
        {children}
      </h3>
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className="block text-sm font-bold text-heading font-mono">{value}</span>
      {hint && <span className="block text-[10px] text-muted">{hint}</span>}
    </div>
  )
}

export function ActivityCommercialReportView({
  content,
  isMobile = false,
}: {
  content: ActivityCommercialContent
  isMobile?: boolean
}) {
  const { facts, narrative, qaFlags } = content
  const failedFlags = qaFlags.filter((f) => !f.passed)
  const allPassed = failedFlags.length === 0
  const narrativeWarnings = Array.isArray(narrative.warnings)
    ? narrative.warnings.filter((warning): warning is string => typeof warning === "string" && warning.trim().length > 0)
    : []

  return (
    <div className="space-y-5">
      {/* Statut qualité */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider w-fit",
          allPassed
            ? "border-success/20 bg-success/10 text-success"
            : "border-warning/25 bg-warning/10 text-[var(--color-status-warning-ink)]"
        )}
      >
        <span className={cn("size-1.5 rounded-full", allPassed ? "bg-success" : "bg-warning")} />
        {allPassed ? "Qualité OK" : "À vérifier"}
      </div>
      {!allPassed && (
        <ul className="space-y-1 text-[11px] text-[var(--color-status-warning-ink)]">
          {failedFlags.map((flag, i) => (
            <li key={i}>• {flag.detail || flag.check}</li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-muted">
        Période : {formatDate(facts.period.startDate)} → {formatDate(facts.period.endDate)}
      </p>

      {/* Bloc 1 — Activité */}
      <section>
        <BlockHeading>Activité</BlockHeading>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="RDV réalisés" value={String(facts.activity.realizedMeetingsCount)} />
          <Metric label="RDV planifiés" value={String(facts.activity.plannedMeetingsCount)} />
        </div>
      </section>

      {/* Bloc 2 — Mouvements du pipe */}
      <section>
        <BlockHeading>Mouvements du pipe (période)</BlockHeading>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Opportunités créées" value={String(facts.pipeMovements.opportunitiesCreatedCount)} />
          <Metric label="Opportunités gagnées" value={String(facts.pipeMovements.opportunitiesWonCount)} />
          <Metric label="Opportunités perdues" value={String(facts.pipeMovements.opportunitiesLostCount)} />
          <Metric label="Valeur gagnée (ACV)" value={formatEuro(facts.pipeMovements.wonWeightedValue)} />
        </div>
      </section>

      {/* Bloc 3 — Snapshot pipe */}
      <section>
        <BlockHeading>Pipe ouvert (instantané)</BlockHeading>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Opportunités ouvertes" value={String(facts.pipeSnapshot.openOpportunitiesCount)} />
          <Metric label="Pipe pondéré ouvert" value={formatEuro(facts.pipeSnapshot.openPipeWeighted)} />
        </div>
      </section>

      {/* Bloc 4 — Opportunités sans action récente */}
      {facts.staleOpportunities.length > 0 && (
        <section>
          <BlockHeading>Sans action récente</BlockHeading>
          <ul className="space-y-1.5 text-xs text-body">
            {facts.staleOpportunities.map((o) => (
              <li key={o.opportunityId} className="flex items-start justify-between gap-2">
                <span>
                  ▸ <span className="font-semibold text-heading">{o.title}</span>
                  {o.companyName && <span className="text-muted"> — {o.companyName}</span>}
                </span>
                <span className="shrink-0 text-danger font-semibold text-[10px]">
                  {o.daysSinceLastAction}j
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bloc 5 — Prochaines actions */}
      {facts.upcomingNextActions.length > 0 && (
        <section>
          <BlockHeading>Prochaines actions</BlockHeading>
          <ul className="space-y-1 text-xs text-body">
            {facts.upcomingNextActions.map((a) => (
              <li key={a.opportunityId}>
                ▸ {a.label ?? "Action à définir"}
                {a.companyName && <span className="text-muted"> — {a.companyName}</span>}
                {a.at && <span className="text-muted"> · {formatDate(a.at)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bloc 6 — Répartition par commercial / secteur */}
      {(facts.byOwner.length > 0 || facts.bySector.length > 0) && (
        <section className="grid grid-cols-2 gap-4">
          {facts.byOwner.length > 0 && (
            <div>
              <BlockHeading>Par commercial</BlockHeading>
              <ul className="space-y-1 text-xs text-body">
                {facts.byOwner.map((o) => (
                  <li key={o.ownerId} className="flex items-center justify-between">
                    <span>{o.ownerName ?? "Sans nom"}</span>
                    <span className="font-mono text-[10px] text-muted">{formatEuro(o.openPipeWeighted)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {facts.bySector.length > 0 && (
            <div>
              <BlockHeading>Par secteur</BlockHeading>
              <ul className="space-y-1 text-xs text-body">
                {facts.bySector.map((s) => (
                  <li key={s.sectorId} className="flex items-center justify-between">
                    <span>{s.sectorName ?? "Non structuré"}</span>
                    <span className="font-mono text-[10px] text-muted">{formatEuro(s.openPipeWeighted)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Bloc 7 — Synthèse IA */}
      <section>
        <BlockHeading>Synthèse</BlockHeading>
        <p className="text-xs text-body leading-relaxed mb-3">{narrative.summary}</p>
        {narrative.priorities.length > 0 && (
          <div className="mb-3">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-primary mb-1">
              Priorités
            </span>
            <ul className="space-y-1 text-xs text-body">
              {narrative.priorities.map((p, i) => (
                <li key={i}>▸ {p}</li>
              ))}
            </ul>
          </div>
        )}
        {narrative.risks.length > 0 && (
          <div className="rounded border border-warning/20 bg-warning/5 px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--color-status-warning-ink)] mb-1">
              Risques
            </span>
            <ul className="space-y-1 text-xs text-body">
              {narrative.risks.map((r, i) => (
                <li key={i}>▸ {r}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {facts.caveats.length > 0 && (
        <div className="rounded border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] text-[var(--color-status-warning-ink)] space-y-1">
          {facts.caveats.map((caveat, i) => (
            <p key={i}>⚠ {caveat}</p>
          ))}
        </div>
      )}

      {narrativeWarnings.length > 0 && (
        <div className="rounded border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] text-[var(--color-status-warning-ink)] space-y-1">
          {narrativeWarnings.map((warning, i) => (
            <p key={i}>⚠ {warning}</p>
          ))}
        </div>
      )}

      <p className={cn("text-[10px] text-muted", isMobile ? "pb-2" : "")}>
        Données à jour au {formatDate(facts.dataCutoffAt)}
      </p>
    </div>
  )
}

"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { TechnicalReportDocumentContent, TechnicalReportFacts } from "@/app/(app)/reports/_data/reports-types"

function formatDurationMs(ms: number | null): string {
  if (!ms) return "—"
  if (ms < 1000) return `${ms} ms`
  const sec = (ms / 1000).toFixed(1)
  return `${sec} s`
}

function formatCostEur(cost: number | null): string {
  if (cost === null || cost === undefined) return "Indisponible"
  return `${cost.toFixed(2).replace(".", ",")} €`
}

function formatDateTimeFR(dateIso: string): string {
  if (!dateIso) return "—"
  const d = new Date(dateIso)
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TechnicalReportContent({
  contentJson,
}: {
  contentJson: TechnicalReportDocumentContent | unknown
}) {
  const content = contentJson as TechnicalReportDocumentContent | undefined
  const facts: TechnicalReportFacts | undefined = content?.facts

  if (!facts) {
    return (
      <div className="p-4 text-center text-xs text-muted">
        Données du rapport technique non disponibles.
      </div>
    )
  }

  const {
    periodLabel,
    totalRuns,
    successCount,
    failureCount,
    successRatePct,
    healthStatus,
    topAutomations,
    topAlerts,
    totalCost,
    costBreakdown,
  } = facts

  const isOptimal = healthStatus === "optimal"
  const isWarning = healthStatus === "warning"
  const isUnavailable = healthStatus === "unavailable"

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* ── En-tête du Rapport Technique ── */}
      <div className="rounded-[var(--radius-medium)] border border-border/60 bg-canvas/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Automatisations & Santé System
              </span>
              <span className="text-xs text-muted">{periodLabel}</span>
            </div>
            <h3 className="mt-1 text-base font-bold text-heading">
              Synthèse d&apos;exploitation des automatisations
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                isOptimal && "border-success/30 bg-success/10 text-success",
                isWarning && "border-warning/30 bg-warning/10 text-warning",
                healthStatus === "critical" && "border-danger/30 bg-danger/10 text-danger",
                isUnavailable && "border-border bg-surface text-muted",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  isOptimal && "bg-success animate-pulse",
                  isWarning && "bg-warning",
                  healthStatus === "critical" && "bg-danger animate-ping",
                  isUnavailable && "bg-muted",
                )}
              />
              <span>
                {isOptimal && `Système optimal (${successRatePct}%)`}
                {isWarning && `Sous surveillance (${successRatePct}%)`}
                {healthStatus === "critical" && `Action requise (${successRatePct}%)`}
                {isUnavailable && "Santé indisponible — aucune exécution"}
              </span>
            </span>

            <Link
              href="/automations"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Page Automatisations &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── Grille des 4 KPIs denses ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[var(--radius-medium)] border border-border bg-surface/60 p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Volume d&apos;exécutions
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-heading">{totalRuns}</span>
            <span className="text-xs text-muted">runs</span>
          </div>
          <p className="mt-1 text-[10px] text-muted">Sur la période sélectionnée</p>
        </div>

        <div className="rounded-[var(--radius-medium)] border border-border bg-surface/60 p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Ratio Succès / Échecs
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-heading">
              {successRatePct === null ? "—" : `${successRatePct}%`}
            </span>
            <span className="text-xs text-muted">
              {successRatePct === null ? "indisponible" : "réussis"}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted">
            {successCount} succès &middot; {failureCount} échecs
          </p>
        </div>

        <div className="rounded-[var(--radius-medium)] border border-border bg-surface/60 p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Top 3 Alertes
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-2xl font-bold tracking-tight",
                topAlerts.length > 0
                  ? "text-danger"
                  : totalRuns === 0
                    ? "text-muted"
                    : "text-success",
              )}
            >
              {totalRuns === 0 ? "—" : topAlerts.length}
            </span>
            <span className="text-xs text-muted">incidents</span>
          </div>
          <p className="mt-1 text-[10px] text-muted">
            {topAlerts.length > 0
              ? "Alertes à examiner"
              : totalRuns === 0
                ? "Aucune exécution disponible"
                : "Aucun incident critique"}
          </p>
        </div>

        <div className="rounded-[var(--radius-medium)] border border-border bg-surface/60 p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Coût total représenté
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-heading">
              {totalRuns === 0 ? "—" : formatCostEur(totalCost)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted">
            {totalRuns === 0 ? "Aucune exécution disponible" : "Consommation des APIs LLM & n8n"}
          </p>
        </div>
      </div>

      {/* ── Barre Visuelle du Ratio Succès / Échecs ── */}
      <div className="rounded-[var(--radius-medium)] border border-border/70 bg-canvas/30 p-4">
        <div className="flex items-center justify-between text-xs font-semibold text-heading">
          <span>Répartition des résultats d&apos;exécution</span>
          <span className="text-muted">
            {successCount} Succès / {failureCount} Échecs ({totalRuns} au total)
          </span>
        </div>

        {successRatePct === null ? (
          <div className="mt-2.5 rounded-lg border border-border/50 bg-surface/30 p-3 text-center text-xs text-muted">
            Aucune exécution disponible sur la période : le taux de succès et la santé ne sont pas calculables.
          </div>
        ) : (
          <>
            <div className="mt-2.5 flex h-3.5 w-full overflow-hidden rounded-full border border-border/40 bg-surface">
              <div
                className="bg-success transition-all duration-500"
                style={{ width: `${(successCount / totalRuns) * 100}%` }}
                title={`Succès: ${successCount}`}
              />
              <div
                className="bg-danger transition-all duration-500"
                style={{ width: `${(failureCount / totalRuns) * 100}%` }}
                title={`Échecs: ${failureCount}`}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-success" />
                <span>Succès: {successCount} ({successRatePct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-danger" />
                <span>Échecs: {failureCount} ({(100 - successRatePct).toFixed(1)}%)</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Section 1 : Top 3 des automatisations les plus utilisées ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-heading">
            Top 3 des automatisations sollicitées
          </h4>
          <span className="text-[11px] text-muted">Classées par volume d&apos;exécutions</span>
        </div>

        {topAutomations.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-surface/30 p-3 text-center text-xs text-muted">
            Aucune automatisation enregistrée sur la période.
          </div>
        ) : (
          <div className="grid gap-2.5">
            {topAutomations.map((item, idx) => (
              <div
                key={item.runType}
                className="flex flex-col gap-2 rounded-[var(--radius-medium)] border border-border/70 bg-surface/40 p-3 transition-colors hover:border-border"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-heading">{item.label}</p>
                      <p className="truncate text-[10px] font-mono text-muted">{item.runType}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <p className="text-xs font-bold text-heading">{item.executionCount} runs</p>
                      <p className="text-[10px] text-muted">{item.sharePct}% du total</p>
                    </div>
                    {item.avgDurationMs && (
                      <div className="hidden sm:block">
                        <p className="text-xs font-medium text-body">
                          {formatDurationMs(item.avgDurationMs)}
                        </p>
                        <p className="text-[10px] text-muted">durée moy.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar d'utilisation relative */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, item.sharePct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2 : Top 3 des alertes de mauvais fonctionnement ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-heading">
            Top 3 des alertes de mauvais fonctionnement
          </h4>
          <span className="text-[11px] text-muted">Incidents récents à traiter</span>
        </div>

        {topAlerts.length === 0 ? (
          <div className={cn(
            "flex items-center gap-2 rounded-lg p-3.5 text-xs",
            totalRuns === 0
              ? "border border-border/50 bg-surface/30 text-muted"
              : "border border-success/30 bg-success/5 text-success",
          )}>
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {totalRuns === 0
                ? "Aucune alerte disponible : aucune exécution n’a été enregistrée sur la période."
                : "Aucune alerte de dysfonctionnement relevée sur la période."}
            </span>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {topAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-[var(--radius-medium)] border border-danger/30 bg-danger/5 p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger">
                      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-heading">{alert.label}</p>
                      <p className="mt-0.5 text-xs font-medium leading-relaxed text-danger">
                        {alert.errorMessage}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-[10px] font-medium text-muted">
                    {formatDateTimeFR(alert.failedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 3 : Coût total représenté par les automatisations ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-heading">
            Répartition et coût total des automatisations
          </h4>
          <span className="text-xs font-bold text-heading">
            Total : {totalRuns === 0 ? "—" : formatCostEur(totalCost)}
          </span>
        </div>

        {costBreakdown.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-surface/30 p-3 text-center text-xs text-muted">
            Aucun coût enregistré sur cette période.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface/40">
            <table className="w-full text-left text-xs text-body">
              <thead className="border-b border-border/60 bg-canvas/50 text-[10px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3.5 py-2">Workflow</th>
                  <th className="px-3.5 py-2 text-right">Exécutions</th>
                  <th className="px-3.5 py-2 text-right">Coût estimé (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {costBreakdown.map((row) => (
                  <tr key={row.runType} className="hover:bg-surface-hover/30">
                    <td className="px-3.5 py-2 font-medium text-heading">{row.label}</td>
                    <td className="px-3.5 py-2 text-right text-muted">{row.runsCount}</td>
                    <td className="px-3.5 py-2 text-right font-mono font-semibold text-heading">
                      {formatCostEur(row.costTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

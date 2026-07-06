"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { formatEuro, formatDate } from "@/lib/formatters"
import { Button } from "@/components/ui/Button"
import type {
  FinancialReportDocumentContent,
} from "@/app/(app)/reports/_data/reports-types"

type FinancialReportDesktopContentProps = {
  content: FinancialReportDocumentContent
}

export function FinancialReportDesktopContent({
  content,
}: FinancialReportDesktopContentProps) {
  const { facts } = content
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const triggerToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const handleAction = (actionType: string, label: string) => {
    triggerToast(`Action déclenchée : "${label}" (${actionType})`)
  }

  // Formatting helpers
  const fmtEuroVal = (val: number | null) => (val !== null ? formatEuro(val) : "—")
  const fmtPctVal = (val: number | null) => (val !== null ? `${val.toFixed(2)} %` : "—")

  // Confidence index color-coding
  const confidenceColorClass =
    facts.trajectory.confidenceLabel === "high"
      ? "border-success/20 bg-success/10 text-success"
      : facts.trajectory.confidenceLabel === "medium"
        ? "border-warning/20 bg-warning/10 text-warning"
        : "border-danger/20 bg-danger/10 text-danger"

  // Stacked bar calculations for CA Bridge
  const totalBridge =
    facts.revenueBridge.assistanceFromCra +
    facts.revenueBridge.projectInvoicedMilestones +
    Math.abs(facts.revenueBridge.pnlResidualUnexplained)

  const craPct = totalBridge > 0 ? (facts.revenueBridge.assistanceFromCra / totalBridge) * 100 : 0
  const projPct =
    totalBridge > 0 ? (facts.revenueBridge.projectInvoicedMilestones / totalBridge) * 100 : 0
  const resPct =
    totalBridge > 0 ? (Math.abs(facts.revenueBridge.pnlResidualUnexplained) / totalBridge) * 100 : 0

  const isResidualAnomaly =
    facts.revenueBridge.pnlResidualPct !== null && Math.abs(facts.revenueBridge.pnlResidualPct) > 10

  // Slice to max 3 alerts for display
  const displayAlerts = facts.alerts.slice(0, 3)

  return (
    <div className="relative space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-heading shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          {toastMessage}
        </div>
      )}

      {/* Header Info */}
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-heading">
            Rapport Financier — Exercice {facts.period.fiscalYear}
          </h1>
          <p className="mt-1 text-xs text-muted">
            Généré le {formatDate(content.generatedAt)} · Données arrêtées au{" "}
            {facts.period.lastClosedMonth ? formatDate(facts.period.lastClosedMonth) : "—"}
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider",
            confidenceColorClass
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full",
              facts.trajectory.confidenceLabel === "high"
                ? "bg-success"
                : facts.trajectory.confidenceLabel === "medium"
                  ? "bg-warning"
                  : "bg-danger"
            )}
          />
          Confiance : {facts.trajectory.confidenceIndex}/100 ({facts.trajectory.confidenceLabel})
        </div>
      </header>

      {/* KPIs Row */}
      <section className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
            CA P&L YTD
          </span>
          <span className="mt-1 block font-mono text-lg font-bold text-heading">
            {fmtEuroVal(facts.officialPnl.ytdRevenue)}
          </span>
          <span className="mt-1 block text-[10px] text-muted">Revenus déclarés P&L</span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
            Marge brute YTD
          </span>
          <span className="mt-1 block font-mono text-lg font-bold text-heading">
            {fmtPctVal(facts.officialPnl.ytdGrossMarginPct)}
          </span>
          <span className="mt-1 block text-[10px] text-muted">
            Marge : {fmtEuroVal(facts.officialPnl.ytdGrossMarginValue)}
          </span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
            Pipe commercial
          </span>
          <span className="mt-1 block font-mono text-lg font-bold text-heading">
            {fmtEuroVal(facts.pipeline.totalWeightedPipe)}
          </span>
          <span className="mt-1 block text-[10px] text-muted">
            {facts.pipeline.openOpportunitiesCount} opportunités en cours
          </span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
            Projection fin d&apos;année
          </span>
          <span className="mt-1 block font-mono text-lg font-bold text-brand-brass">
            {fmtEuroVal(facts.trajectory.projectedYearEndRevenue)}
          </span>
          <span className="mt-1 block text-[10px] text-muted">
            Run-rate : {fmtEuroVal(facts.trajectory.runRateProjection)}
          </span>
        </div>
      </section>

      {/* CA Bridge Section */}
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-heading text-sm font-bold text-heading mb-4">
          Bridge Chiffre d&apos;Affaires YTD
        </h2>
        <p className="text-xs text-body mb-4 leading-relaxed">
          Le bridge réconcilie le CA officiel P&L avec l&apos;activité déclarée dans l&apos;application (CRA de l&apos;assistance + jalons projets facturés).
        </p>

        {/* Stacked bar chart */}
        <div className="relative h-6 w-full overflow-hidden rounded-md bg-canvas/30 flex mb-4">
          <div
            className="h-full bg-dataviz-1 transition-all duration-300"
            style={{ width: `${craPct}%` }}
            title={`CRA Assistance : ${formatEuro(facts.revenueBridge.assistanceFromCra)}`}
          />
          <div
            className="h-full bg-dataviz-2 transition-all duration-300"
            style={{ width: `${projPct}%` }}
            title={`Jalons Projets : ${formatEuro(facts.revenueBridge.projectInvoicedMilestones)}`}
          />
          <div
            className={cn(
              "h-full transition-all duration-300",
              isResidualAnomaly ? "bg-status-danger" : "bg-dataviz-3"
            )}
            style={{ width: `${resPct}%` }}
            title={`Résiduel non expliqué : ${formatEuro(facts.revenueBridge.pnlResidualUnexplained)}`}
          />
        </div>

        {/* Legend / Metrics table */}
        <div className="grid grid-cols-3 gap-6 pt-2">
          <div className="flex items-start gap-2">
            <span className="mt-1 block size-2.5 shrink-0 rounded-sm bg-dataviz-1" />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                CRA Assistance
              </span>
              <span className="block font-mono text-sm font-bold text-heading">
                {formatEuro(facts.revenueBridge.assistanceFromCra)}
              </span>
              <span className="text-[10px] text-muted">
                CRA Validés : {formatEuro(facts.revenueBridge.assistanceFromValidatedCra)} ({facts.dataHealth.craValidationCoveragePct}% de validation)
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="mt-1 block size-2.5 shrink-0 rounded-sm bg-dataviz-2" />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                Jalons projets facturés
              </span>
              <span className="block font-mono text-sm font-bold text-heading">
                {formatEuro(facts.revenueBridge.projectInvoicedMilestones)}
              </span>
              <span className="text-[10px] text-muted">
                Issus des livrables forfaitaires
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span
              className={cn(
                "mt-1 block size-2.5 shrink-0 rounded-sm",
                isResidualAnomaly ? "bg-status-danger" : "bg-dataviz-3"
              )}
            />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                Résiduel non expliqué
              </span>
              <span
                className={cn(
                  "block font-mono text-sm font-bold",
                  isResidualAnomaly ? "text-danger" : "text-heading"
                )}
              >
                {formatEuro(facts.revenueBridge.pnlResidualUnexplained)}
              </span>
              <span className={cn("text-[10px]", isResidualAnomaly ? "font-bold text-danger animate-pulse" : "text-muted")}>
                Écart : {fmtPctVal(facts.revenueBridge.pnlResidualPct)}
                {isResidualAnomaly && " (Seuil > 10% dépassé)"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Trajectory vs Targets & Pipeline */}
      <div className="grid grid-cols-2 gap-6">
        {/* Targets & Objectives */}
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm space-y-4">
          <h2 className="font-heading text-sm font-bold text-heading">
            Trajectoire vs Objectifs Annuels
          </h2>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-body">CA Cible Annuel</span>
                <span className="font-mono text-heading">{fmtEuroVal(facts.targets.annualRevenueTarget)}</span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-canvas overflow-hidden">
                <div
                  className="h-full bg-brand-brass transition-all duration-300"
                  style={{ width: `${Math.min(100, facts.targets.ytdRevenueCompletionPct ?? 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted mt-1">
                <span>Avancement YTD : {fmtPctVal(facts.targets.ytdRevenueCompletionPct)}</span>
                <span>Cible CA</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                  Marge Cible Annuelle
                </span>
                <span className="block font-mono text-sm font-bold text-heading">
                  {facts.targets.annualGrossMarginTargetPct !== null ? `${facts.targets.annualGrossMarginTargetPct} %` : "—"}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                  Écart Linéaire Attendu
                </span>
                <span
                  className={cn(
                    "block font-mono text-sm font-bold",
                    facts.targets.linearTargetGap !== null && facts.targets.linearTargetGap >= 0
                      ? "text-success"
                      : "text-danger"
                  )}
                >
                  {facts.targets.linearTargetGap !== null
                    ? (facts.targets.linearTargetGap >= 0 ? "+" : "") + formatEuro(facts.targets.linearTargetGap)
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Win */}
        <section className="rounded-lg border-2 border-brand-brass bg-brand-brass/5 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-brand-brass/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-brass">
                Action immédiate
              </span>
              <h2 className="font-heading text-sm font-bold text-heading">
                Recommandation Quick Win
              </h2>
            </div>
            <h3 className="text-sm font-bold text-heading mt-2">{facts.quickWin.title}</h3>
            <p className="mt-1 text-xs text-body leading-relaxed">
              {facts.quickWin.description}
            </p>
          </div>
          {facts.quickWin.actionType && (
            <div className="mt-4 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  handleAction(facts.quickWin.actionType!, facts.quickWin.title)
                }
              >
                Résoudre l&apos;écart
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Alerts & Data Health */}
      <div className="grid grid-cols-[1.3fr_0.7fr] gap-6">
        {/* Actionable Alerts */}
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm space-y-4">
          <h2 className="font-heading text-sm font-bold text-heading">
            Points de Vigilance ({displayAlerts.length})
          </h2>

          {displayAlerts.length === 0 ? (
            <p className="text-xs italic text-muted">Aucune alerte critique ou anomalie détectée sur cette période.</p>
          ) : (
            <div className="space-y-3">
              {displayAlerts.map((alert) => {
                const alertBorderColor =
                  alert.severity === "critical"
                    ? "border-danger/30 bg-danger/5"
                    : alert.severity === "warning"
                      ? "border-warning/30 bg-warning/5"
                      : "border-info/30 bg-info/5"

                const alertTitleColor =
                  alert.severity === "critical"
                    ? "text-danger"
                    : alert.severity === "warning"
                      ? "text-warning"
                      : "text-info"

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start justify-between rounded-lg border p-3 text-xs gap-4 transition-all duration-150",
                      alertBorderColor
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            alert.severity === "critical"
                              ? "bg-danger"
                              : alert.severity === "warning"
                                ? "bg-warning"
                                : "bg-info"
                          )}
                        />
                        <span className={cn("font-bold", alertTitleColor)}>{alert.title}</span>
                      </div>
                      <p className="text-body leading-relaxed">{alert.description}</p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => handleAction(alert.action.type, alert.action.label)}
                    >
                      {alert.action.label}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Data Health & Caveats */}
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm space-y-3">
          <h2 className="font-heading text-sm font-bold text-heading">
            Santé des données
          </h2>
          <div className="text-xs space-y-2">
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted">Couverture CRA</span>
              <span className="font-mono font-semibold text-heading">
                {facts.dataHealth.craValidationCoveragePct !== null
                  ? `${facts.dataHealth.craValidationCoveragePct} %`
                  : "—"}
              </span>
            </div>
            {facts.dataHealth.caveats.length > 0 && (
              <div className="pt-1.5 space-y-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                  Réserves & Limites
                </span>
                <ul className="space-y-1.5 text-muted text-[11px] leading-relaxed">
                  {facts.dataHealth.caveats.map((caveat, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="mt-1 shrink-0 text-[10px]">⚠️</span>
                      <span>{caveat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

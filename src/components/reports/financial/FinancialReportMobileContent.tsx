"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { formatEuro, formatDate } from "@/lib/formatters"
import { Button } from "@/components/ui/Button"
import type { FinancialReportDocumentContent } from "@/app/(app)/reports/_data/reports-types"

type FinancialReportMobileContentProps = {
  content: FinancialReportDocumentContent
}

export function FinancialReportMobileContent({
  content,
}: FinancialReportMobileContentProps) {
  const { facts } = content
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const triggerToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const handleAction = (actionType: string, label: string) => {
    triggerToast(`Action : "${label}"`)
  }

  // Formatting helpers
  const fmtEuroVal = (val: number | null) => (val !== null ? formatEuro(val) : "—")
  const fmtPctVal = (val: number | null) => (val !== null ? `${val.toFixed(2)} %` : "—")

  // Confidence index color-coding
  const confidenceColorClass =
    facts.trajectory.confidenceLabel === "high"
      ? "bg-success/10 text-success border-success/20"
      : facts.trajectory.confidenceLabel === "medium"
        ? "bg-warning/10 text-warning border-warning/20"
        : "bg-danger/10 text-danger border-danger/20"

  // Slice to max 3 alerts for display
  const displayAlerts = facts.alerts.slice(0, 3)

  return (
    <div className="relative space-y-4 px-1 pb-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-4 right-4 z-50 animate-fade-in rounded-lg border border-border bg-surface px-4 py-3 text-center text-xs font-semibold text-heading shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
          {toastMessage}
        </div>
      )}

      {/* Title */}
      <div>
        <h2 className="text-sm font-bold text-heading">
          Exercice {facts.period.fiscalYear} · Rapport Financier
        </h2>
        <span className="text-[10px] text-muted">
          Généré le {formatDate(content.generatedAt)}
        </span>
      </div>

      {/* Main Synthesis Card */}
      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">
              CA P&L YTD
            </span>
            <span className="block font-mono text-base font-bold text-heading">
              {fmtEuroVal(facts.officialPnl.ytdRevenue)}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
              confidenceColorClass
            )}
          >
            {facts.trajectory.confidenceIndex}/100
          </div>
        </div>

        {/* Progress vs Objective */}
        {facts.targets.annualRevenueTarget && (
          <div className="space-y-1 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>Objectif : {formatEuro(facts.targets.annualRevenueTarget)}</span>
              <span>{fmtPctVal(facts.targets.ytdRevenueCompletionPct)}</span>
            </div>
            <div className="relative h-1.5 w-full rounded-full bg-canvas overflow-hidden">
              <div
                className="h-full bg-brand-brass"
                style={{ width: `${Math.min(100, facts.targets.ytdRevenueCompletionPct ?? 0)}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Quick Win Card */}
      <section className="rounded-lg border border-brand-brass bg-brand-brass/5 p-4 shadow-sm space-y-2">
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-brand-brass/25 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-brand-brass">
            Quick Win
          </span>
          <span className="text-[10px] font-bold text-heading">{facts.quickWin.title}</span>
        </div>
        <p className="text-[11px] text-body leading-relaxed">
          {facts.quickWin.description}
        </p>
        {facts.quickWin.actionType && (
          <div className="pt-1">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              className="h-11 flex items-center justify-center"
              onClick={() =>
                handleAction(facts.quickWin.actionType!, facts.quickWin.title)
              }
            >
              Exécuter l&apos;action
            </Button>
          </div>
        )}
      </section>

      {/* Simplified Bridge Card */}
      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-heading">Répartition du CA</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center border-b border-border/40 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-dataviz-1" />
              <span className="text-muted">CRA Assistance</span>
            </div>
            <span className="font-mono font-semibold text-heading">
              {formatEuro(facts.revenueBridge.assistanceFromCra)}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-border/40 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-dataviz-2" />
              <span className="text-muted">Jalons Forfaits</span>
            </div>
            <span className="font-mono font-semibold text-heading">
              {formatEuro(facts.revenueBridge.projectInvoicedMilestones)}
            </span>
          </div>

          <div className="flex justify-between items-center pb-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2 rounded-sm",
                  Math.abs(facts.revenueBridge.pnlResidualUnexplained) >
                    facts.officialPnl.ytdRevenue * 0.1
                    ? "bg-status-danger"
                    : "bg-dataviz-3"
                )}
              />
              <span className="text-muted">Résiduel non expliqué</span>
            </div>
            <span
              className={cn(
                "font-mono font-semibold",
                Math.abs(facts.revenueBridge.pnlResidualUnexplained) >
                  facts.officialPnl.ytdRevenue * 0.1
                  ? "text-danger"
                  : "text-heading"
              )}
            >
              {formatEuro(facts.revenueBridge.pnlResidualUnexplained)}
            </span>
          </div>
        </div>
      </section>

      {/* Actionable Alerts List */}
      {displayAlerts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-heading">
            Vigilance ({displayAlerts.length})
          </h3>
          <div className="space-y-2">
            {displayAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg border p-3.5 space-y-2.5",
                  alert.severity === "critical"
                    ? "border-danger/30 bg-danger/5"
                    : "border-warning/30 bg-warning/5"
                )}
              >
                <div className="space-y-1">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      alert.severity === "critical" ? "text-danger" : "text-warning"
                    )}
                  >
                    ⚠️ {alert.title}
                  </span>
                  <p className="text-[11px] text-body leading-relaxed">{alert.description}</p>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  className="h-11 flex items-center justify-center font-medium"
                  onClick={() => handleAction(alert.action.type, alert.action.label)}
                >
                  {alert.action.label}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Data Health caveats */}
      {facts.dataHealth.caveats.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm space-y-2 text-[10px] text-muted">
          <span className="font-bold text-heading block">Notes de conformité</span>
          <ul className="space-y-1 list-disc pl-3.5 leading-relaxed">
            {facts.dataHealth.caveats.slice(0, 2).map((caveat, idx) => (
              <li key={idx}>{caveat}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

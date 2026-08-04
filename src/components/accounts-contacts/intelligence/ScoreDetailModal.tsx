"use client"

import { useState, useTransition } from "react"
import { KREDO_TIME_ZONE } from "@/lib/formatting/date-fr"
import { AppDialog } from "@/components/ui/AppDialog"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { recomputeAccountScore } from "@/lib/account-scoring/actions"
import type { AccountScoreSummaryView } from "@/lib/account-scoring/get-account-score-summary"
import { cn } from "@/lib/utils"
import { lifecycleLabel } from "./intelligence-parts"

const BAND_LABELS: Record<string, string> = {
  A: "Priorité immédiate",
  B: "À travailler",
  C: "À surveiller / enrichir",
  D: "Non prioritaire à date",
  U: "Score exploratoire — enrichissement requis",
}

const BAND_TONE: Record<string, StatusPillVariant> = {
  A: "success",
  B: "inProgress",
  C: "warning",
  D: "neutral",
  U: "danger",
}

function formatCalculatedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: KREDO_TIME_ZONE }) +
    " à " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: KREDO_TIME_ZONE })
}

export function ScoreDetailModal({
  open,
  onOpenChange,
  companyId,
  summary,
  onRecomputed,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  summary: AccountScoreSummaryView | null
  onRecomputed: (next: AccountScoreSummaryView) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRecompute = () => {
    setError(null)
    startTransition(async () => {
      try {
        const next = await recomputeAccountScore(companyId)
        onRecomputed(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec du recalcul du score.")
      }
    })
  }

  const unqualified = summary !== null && (summary.scoreBand === "U" || summary.confidenceScore < 40)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Score de priorité commerciale"
      description="Indicateur d'arbitrage, pas une probabilité de signature — voir les composants ci-dessous pour la justification complète."
      className="score-modal-reading max-w-2xl border"
      bodyClassName="max-h-[70vh] overflow-y-auto"
      footer={
        <button
          type="button"
          onClick={handleRecompute}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-fg transition-colors hover:bg-primary-deep disabled:opacity-60"
        >
          {isPending ? "Calcul en cours…" : "Actualiser"}
        </button>
      }
    >
      {error && (
        <p className="mb-3 rounded border border-danger/25 bg-danger/[0.06] px-3 py-2 text-xs text-danger">{error}</p>
      )}

      {summary === null ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-canvas/30 px-6 py-10 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Aucun score calculé pour ce compte</span>
          <span className="text-[11px] text-muted/70">Cliquez sur &laquo;&nbsp;Actualiser&nbsp;&raquo; pour lancer le premier calcul.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Score global + confiance + date */}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4">
            <div>
              <span className={cn("font-heading text-3xl font-bold leading-none", unqualified ? "text-muted" : "text-heading")}>
                {unqualified ? "—" : Math.round(summary.scoreValue)}
                <span className="ml-1 text-sm font-semibold text-muted">/100</span>
              </span>
              <div className="mt-2">
                <StatusPill label={BAND_LABELS[summary.scoreBand]} variant={BAND_TONE[summary.scoreBand]} />
              </div>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Confiance</span>
              <span className="font-heading text-lg font-bold text-heading">{Math.round(summary.confidenceScore)}%</span>
              <span className="mt-1 block text-[11px] text-muted">{lifecycleLabel(summary.lifecycleContext)}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted">Calculé le {formatCalculatedAt(summary.calculatedAt)}</p>

          {/* Drivers */}
          {(summary.summary.topPositiveDrivers.length > 0 || summary.summary.topNegativeDrivers.length > 0) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {summary.summary.topPositiveDrivers.length > 0 && (
                <div className="rounded border border-success/20 bg-success/[0.05] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-success">Facteurs positifs</span>
                  <ul className="mt-1.5 space-y-1">
                    {summary.summary.topPositiveDrivers.map((d, i) => (
                      <li key={i} className="text-[11px] leading-relaxed text-body">{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.summary.topNegativeDrivers.length > 0 && (
                <div className="rounded border border-warning/20 bg-warning/[0.05] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-status-warning-ink)]">Points de vigilance</span>
                  <ul className="mt-1.5 space-y-1">
                    {summary.summary.topNegativeDrivers.map((d, i) => (
                      <li key={i} className="text-[11px] leading-relaxed text-body">{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Caveats */}
          {summary.summary.caveats.length > 0 && (
            <div className="rounded border border-border/60 bg-canvas/40 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">À noter</span>
              <ul className="mt-1.5 space-y-1">
                {summary.summary.caveats.map((c, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-body">{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Détail des composants */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Détail des composants</span>
            <div className="mt-2 space-y-2">
              {summary.components.map((c) => (
                <div key={c.componentKey} className="rounded border border-border/60 bg-canvas/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-heading">{c.componentLabel}</span>
                    <span className="text-xs font-semibold text-muted">
                      {Math.round(c.normalizedScore)}/100 · poids {c.weight}{c.lifecycleMultiplier !== 1 ? ` ×${c.lifecycleMultiplier}` : ""}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border/50">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(0, Math.min(100, c.normalizedScore))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-body">{c.explanation}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    Contribution +{c.weightedContribution.toFixed(1)} pts · confiance {Math.round(c.confidence)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppDialog>
  )
}

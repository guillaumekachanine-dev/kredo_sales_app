"use client"

// ─── Bandeau « Mettre à jour l'entreprise » ─────────────────────────────────
// Lot 1. Deux rendus distincts (Desktop / Mobile) partageant uniquement des
// fonctions de formatage — chaque vue n'importe que le sien, rien n'est chargé
// puis masqué en CSS.

import type { AccountKnowledgeState } from "@/lib/intelligence/intelligence-data"
import type { AccountKnowledgeRunStatus } from "./use-account-knowledge-run"

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}

function formatUpdatedAt(state: AccountKnowledgeState | null): string {
  if (!state) return "Jamais mise à jour"
  return `Mise à jour le ${new Date(state.createdAt).toLocaleString("fr-FR", DATE_FORMAT)}`
}

/**
 * Couverture des sources — disponible uniquement en V2 : c'est cette version
 * qui exige un sourcing. Pour un artefact V1, on l'annonce explicitement plutôt
 * que d'afficher un taux fabriqué.
 */
function formatCoverage(state: AccountKnowledgeState | null): string | null {
  if (!state) return null
  if (state.version === 1) return "Version précédente — affirmations non sourcées"

  const coverage = state.data.source_coverage
  if (coverage.displayed_claims === 0) return "Aucune affirmation publiée"
  return `${coverage.sourced_claims}/${coverage.displayed_claims} affirmations sourcées (${Math.round(coverage.coverage_rate * 100)} %)`
}

function statusLabel(status: AccountKnowledgeRunStatus): string | null {
  if (status === "running") return "Mise à jour en cours…"
  if (status === "done") return "Mise à jour terminée."
  return null
}

type ControlsProps = {
  state: AccountKnowledgeState | null
  status: AccountKnowledgeRunStatus
  errorMessage: string | null
  onUpdate: () => void
}

export function AccountKnowledgeUpdateControlsDesktop({
  state,
  status,
  errorMessage,
  onUpdate,
}: ControlsProps) {
  const coverage = formatCoverage(state)
  const progress = statusLabel(status)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-heading">{formatUpdatedAt(state)}</p>
        {coverage ? <p className="mt-0.5 text-[11px] text-muted">{coverage}</p> : null}
        {progress ? <p className="mt-0.5 text-[11px] font-medium text-primary">{progress}</p> : null}
        {errorMessage ? (
          <p role="alert" className="mt-0.5 text-[11px] font-medium text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onUpdate}
        disabled={status === "running"}
        aria-busy={status === "running"}
        className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded border border-primary bg-primary px-4 text-xs font-bold text-primary-fg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "running" ? "Mise à jour en cours…" : "Mettre à jour l’entreprise"}
      </button>
    </div>
  )
}

export function AccountKnowledgeUpdateControlsMobile({
  state,
  status,
  errorMessage,
  onUpdate,
}: ControlsProps) {
  const coverage = formatCoverage(state)
  const progress = statusLabel(status)

  return (
    <div className="mb-3 space-y-2">
      <button
        type="button"
        onClick={onUpdate}
        disabled={status === "running"}
        aria-busy={status === "running"}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-fg shadow-sm transition-all active:scale-98 disabled:opacity-60"
      >
        {status === "running" ? "Mise à jour en cours…" : "Mettre à jour l’entreprise"}
      </button>

      <p className="text-[11px] text-muted">{formatUpdatedAt(state)}</p>
      {coverage ? <p className="text-[11px] text-muted">{coverage}</p> : null}
      {progress ? <p className="text-[11px] font-medium text-primary">{progress}</p> : null}
      {errorMessage ? (
        <p role="alert" className="text-[11px] font-medium text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

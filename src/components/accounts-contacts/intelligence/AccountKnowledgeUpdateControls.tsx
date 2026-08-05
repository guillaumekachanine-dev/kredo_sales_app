"use client"

// ─── Bandeau « Mettre à jour l'entreprise » ─────────────────────────────────
// Lot 1. Deux rendus distincts (Desktop / Mobile) partageant uniquement des
// fonctions de formatage — chaque vue n'importe que le sien, rien n'est chargé
// puis masqué en CSS.

import { KREDO_TIME_ZONE } from "@/lib/formatting/date-fr"
// Lot 4 — restreint volontairement à l'état restituable : un artefact V3 passé
// ici serait lu avec les règles V2 (couverture affichée comme si le sourcing
// avait les mêmes exigences). L'annotation le rend impossible à la compilation.
import type { AccountKnowledgeRenderableState } from "@/lib/intelligence/intelligence-data"
import type { AccountKnowledgeRunStatus } from "./use-account-knowledge-run"

// Fuseau explicite : cf. lib/formatting/date-fr.ts.
const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: KREDO_TIME_ZONE,
}

/**
 * Revue Lot 4 — prend directement la date de l'artefact courant plutôt que de
 * la dériver de `state` (restreint V1/V2) : sinon la mention affichait
 * « Jamais mise à jour » dès qu'un V3 devenait l'artefact courant, alors
 * qu'une génération venait de réussir. `lastUpdatedAt` porte la date réelle
 * quelle que soit la version, y compris quand `state` vaut `null`.
 */
function formatUpdatedAt(lastUpdatedAt: string | null): string {
  if (!lastUpdatedAt) return "Jamais mise à jour"
  return `Mise à jour le ${new Date(lastUpdatedAt).toLocaleString("fr-FR", DATE_FORMAT)}`
}

/**
 * Couverture des sources — disponible uniquement en V2 : c'est cette version
 * qui exige un sourcing. Pour un artefact V1, on l'annonce explicitement plutôt
 * que d'afficher un taux fabriqué.
 */
function formatCoverage(state: AccountKnowledgeRenderableState | null): string | null {
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
  state: AccountKnowledgeRenderableState | null
  /** Date de l'artefact courant, quelle que soit sa version — cf. formatUpdatedAt. */
  lastUpdatedAt: string | null
  status: AccountKnowledgeRunStatus
  errorMessage: string | null
  onUpdate: () => void
}

export function AccountKnowledgeUpdateControlsDesktop({
  state,
  lastUpdatedAt,
  status,
  errorMessage,
  onUpdate,
}: ControlsProps) {
  const coverage = formatCoverage(state)
  const progress = statusLabel(status)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-heading">{formatUpdatedAt(lastUpdatedAt)}</p>
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
  lastUpdatedAt,
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

      <p className="text-[11px] text-muted">{formatUpdatedAt(lastUpdatedAt)}</p>
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

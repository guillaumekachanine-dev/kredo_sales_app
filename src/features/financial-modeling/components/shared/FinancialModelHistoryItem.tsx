"use client"

import { FINANCIAL_MODEL_STATUS_LABELS } from "../../domain/financial-model.constants"
import type { FinancialModelRow } from "../../persistence"

interface FinancialModelHistoryItemProps {
  simulation: FinancialModelRow
  companyName?: string
  opportunityTitle?: string
  active?: boolean
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onShare: (simulation: FinancialModelRow) => void
  onArchive: (id: string) => void
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  candidate: "Candidat",
  collaborator: "Collaborateur",
  external: "Externe",
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function HistoryInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-muted">{label}</p>
      <p className="truncate text-[11px] font-semibold leading-4 text-heading">{value}</p>
    </div>
  )
}

export function FinancialModelHistoryItem({
  simulation,
  companyName,
  opportunityTitle,
  active = false,
  onOpen,
  onDuplicate,
  onShare,
  onArchive,
}: FinancialModelHistoryItemProps) {
  const statusLabel = FINANCIAL_MODEL_STATUS_LABELS[simulation.status as keyof typeof FINANCIAL_MODEL_STATUS_LABELS] || simulation.status
  const resourceType = RESOURCE_TYPE_LABELS[simulation.resource_type] || "Non renseigné"
  const canArchive = simulation.status === "draft" || simulation.status === "validated"

  return (
    <article
      className={`group relative overflow-visible rounded-[var(--radius-medium)] border px-3 py-3 transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${
        active
          ? "border-primary/30 bg-[#f3f7ff] shadow-[inset_2px_0_0_var(--color-primary)]"
          : "border-transparent bg-transparent hover:-translate-y-px hover:border-[#b9cff8] hover:bg-[#f8fbff] hover:shadow-[0_10px_24px_-20px_rgba(37,84,184,0.75),inset_2px_0_0_var(--color-primary)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="min-w-0 flex-1 truncate text-xs font-bold text-heading">
          {simulation.title} <span className="font-medium text-muted">({statusLabel})</span>
        </h4>
        <details className="relative shrink-0">
          <summary className="flex h-7 cursor-pointer list-none items-center gap-1.5 rounded-[var(--radius-small)] bg-[#2554B8] px-2 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-[#1E4596] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
            Actions
            <svg className="size-3 transition-transform duration-200 [[open]_&]:rotate-180" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-[var(--radius-medium)] border border-primary/15 bg-surface p-1 shadow-[0_14px_32px_-12px_rgba(15,23,42,0.35)] animate-in fade-in zoom-in-95 duration-150">
            <button type="button" onClick={() => onOpen(simulation.id)} className="flex w-full items-center rounded-[var(--radius-small)] px-2.5 py-2 text-left text-[11px] font-medium text-heading transition-colors hover:bg-primary/8 hover:text-primary">
              Ouvrir
            </button>
            <button type="button" onClick={() => onDuplicate(simulation.id)} className="flex w-full items-center rounded-[var(--radius-small)] px-2.5 py-2 text-left text-[11px] font-medium text-heading transition-colors hover:bg-primary/8 hover:text-primary">
              Dupliquer
            </button>
            <button type="button" onClick={() => onShare(simulation)} className="flex w-full items-center rounded-[var(--radius-small)] px-2.5 py-2 text-left text-[11px] font-medium text-heading transition-colors hover:bg-primary/8 hover:text-primary">
              Partager
            </button>
            <button type="button" disabled={!canArchive} onClick={() => onArchive(simulation.id)} className="flex w-full items-center rounded-[var(--radius-small)] px-2.5 py-2 text-left text-[11px] font-medium text-danger transition-colors hover:bg-danger/8 disabled:cursor-not-allowed disabled:opacity-40">
              Archiver
            </button>
          </div>
        </details>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-x-3">
        <HistoryInfo label="Compte" value={companyName || "—"} />
        <HistoryInfo label="Opportunité" value={opportunityTitle || "—"} />
        <HistoryInfo label={resourceType} value={simulation.resource_label || "—"} />
        <HistoryInfo label="Date" value={formatDate(simulation.updated_at)} />
      </div>
    </article>
  )
}

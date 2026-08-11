"use client"

import { cn } from "@/lib/utils"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table/DataTable"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import type { AccountScanOutput } from "@/lib/n8n/types"
import {
  type AccountScanBilanCategory,
  type AccountScanProposalRow,
  BILAN_LABELS,
  SOURCE_TYPE_LABELS,
  formatConfidencePercent,
  formatProposalValue,
  getAttributeLabel,
  getConfidenceTone,
} from "./account-scan-utils"

interface AccountScanDesktopResultsProps {
  output: AccountScanOutput
  proposalRows: AccountScanProposalRow[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: (ids: string[]) => void
  onApplySelected: () => void
  applying: boolean
  bilanByProposalId: Map<string, AccountScanBilanCategory>
}

const CONFIDENCE_VARIANT: Record<string, StatusPillVariant> = {
  high: "success",
  medium: "warning",
  low: "danger",
}

const BILAN_VARIANT: Record<AccountScanBilanCategory, StatusPillVariant> = {
  applied: "success",
  already_applied: "success",
  conflicting: "danger",
  ignored: "neutral",
  error: "danger",
}

const PROPOSAL_STATUS_VARIANT: Record<string, StatusPillVariant> = {
  proposed: "inProgress",
  needs_review: "warning",
  validated: "info",
  applied: "success",
  conflicting: "danger",
  rejected: "neutral",
  outdated: "neutral",
}

function sourceLabelFor(output: AccountScanOutput, sourceKeys: string[]): { name: string; url?: string } | null {
  const key = sourceKeys[0]
  if (!key) return null
  const source = output.sources.find((s) => s.sourceKey === key)
  if (!source) return null
  return { name: `${SOURCE_TYPE_LABELS[source.sourceType]} — ${source.sourceName}`, url: source.sourceUrl }
}

export function AccountScanDesktopResults({
  output,
  proposalRows,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onApplySelected,
  applying,
  bilanByProposalId,
}: AccountScanDesktopResultsProps) {
  const allIds = proposalRows.map((r) => r.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))

  const columns: DataTableColumn<AccountScanProposalRow>[] = [
    {
      id: "select",
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => onToggleSelectAll(allIds)}
          aria-label="Sélectionner toutes les propositions"
          className="h-4 w-4 accent-primary"
        />
      ),
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => onToggleSelect(row.id)}
          aria-label={`Sélectionner ${getAttributeLabel(row.attributeName)}`}
          className="h-4 w-4 accent-primary"
        />
      ),
      width: "2.5rem",
    },
    {
      id: "attribute",
      header: "Attribut",
      cell: (row) => (
        <span className="font-semibold text-heading">
          {getAttributeLabel(row.attributeName)}
          {row.isFact && (
            <span className="ml-1.5 rounded-full border border-border bg-canvas/50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted">
              Fait
            </span>
          )}
        </span>
      ),
      minWidth: "10rem",
    },
    {
      id: "current",
      header: "Valeur actuelle",
      cell: (row) => <span className="text-muted">{formatProposalValue(row.oldValue)}</span>,
      minWidth: "9rem",
    },
    {
      id: "proposed",
      header: "Valeur proposée",
      cell: (row) => <span className="font-medium text-heading">{formatProposalValue(row.normalizedValue ?? row.proposedValue)}</span>,
      minWidth: "9rem",
    },
    {
      id: "confidence",
      header: "Confiance",
      align: "center",
      cell: (row) => (
        <span className="text-xs font-bold text-muted">
          {formatConfidencePercent(row.confidenceScore)}
        </span>
      ),
    },
    {
      id: "source",
      header: "Source",
      cell: (row) => {
        const source = sourceLabelFor(output, row.sourceKeys)
        if (!source) return <span className="text-muted">—</span>
        return source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {source.name}
          </a>
        ) : (
          <span>{source.name}</span>
        )
      },
      minWidth: "10rem",
    },
    {
      id: "status",
      header: "Statut",
      align: "center",
      cell: (row) => {
        const bilan = bilanByProposalId.get(row.id)
        if (bilan) {
          return <StatusPill label={BILAN_LABELS[bilan]} variant={BILAN_VARIANT[bilan]} />
        }
        return (
          <StatusPill
            label={row.status}
            variant={PROPOSAL_STATUS_VARIANT[row.status] ?? "neutral"}
          />
        )
      },
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300 lg:grid-cols-4 xl:gap-8">
      {/* Left Column (Main Content) */}
      <div className="flex flex-col gap-6 lg:col-span-3">
        <div className="flex items-end justify-between gap-3 pb-2">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-heading">Propositions de modifications</h2>
            <p className="text-sm text-body">
              L'IA a identifié {proposalRows.length} mise{proposalRows.length > 1 ? "s" : ""} à jour potentielle{proposalRows.length > 1 ? "s" : ""}.
            </p>
          </div>
        </div>

        {/* A. Informations proposées */}
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <DataTable<AccountScanProposalRow>
            rows={proposalRows}
            columns={columns}
            getRowId={(row) => row.id}
            ariaLabel="Propositions du scan"
            emptyState={<div className="flex h-32 items-center justify-center p-4 text-sm text-muted">Aucune proposition générée par ce scan.</div>}
          />
        </section>
      </div>

      {/* Right Column (Sidebar) */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 flex flex-col gap-6">
          
          {/* Action Panel */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-muted">Résumé de l'analyse</h3>
            
            <div className="space-y-3 pb-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs text-body">Propositions</span>
                <span className="text-xs font-bold text-heading">{proposalRows.length}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs text-body">Sélectionnées</span>
                <span className="text-xs font-bold text-brand-brass">{selectedIds.size}</span>
              </div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs text-body">Sources analysées</span>
                <span className="text-xs font-bold text-heading">{output.sources.length}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onApplySelected}
              disabled={applying || selectedIds.size === 0}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold shadow-sm transition-all hover:shadow",
                applying || selectedIds.size === 0
                  ? "cursor-not-allowed border border-border bg-canvas text-muted"
                  : "bg-heading text-surface hover:bg-heading/90"
              )}
            >
              {applying ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-muted border-t-transparent animate-spin" />
                  Application…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 text-brand-brass" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Appliquer la sélection
                </>
              )}
            </button>
          </div>

          {/* B. Mini-rapport */}
          {output.warnings.length > 0 && (
            <section className="rounded-xl border border-brand-brass/20 bg-brand-brass/[0.02] p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-brand-brass" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">Réserves</h3>
              </div>
              <ul className="space-y-2">
                {output.warnings.map((warning, idx) => (
                  <li key={idx} className="text-xs leading-relaxed text-body">• {warning}</li>
                ))}
              </ul>
            </section>
          )}

          {/* C. Sources */}
          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-muted">Sources consultées</h3>
            <div className="space-y-3">
              {output.sources.map((source) => (
                <div key={source.sourceKey} className="rounded-lg border border-border/50 bg-canvas/30 p-3.5 transition-colors hover:bg-canvas/60">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="block text-xs font-bold text-heading">{source.sourceName}</span>
                      <StatusPill
                        label={formatConfidencePercent(source.reliabilityScore)}
                        variant={CONFIDENCE_VARIANT[getConfidenceTone(source.reliabilityScore)]}
                      />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted">{SOURCE_TYPE_LABELS[source.sourceType]}</span>
                  </div>
                  
                  {source.evidenceExcerpt && (
                    <div className="mt-3 rounded border-l-2 border-border pl-2.5">
                      <p className="text-[11px] italic leading-relaxed text-muted">&laquo;&nbsp;{source.evidenceExcerpt}&nbsp;&raquo;</p>
                    </div>
                  )}
                  {source.sourceUrl && (
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-brass hover:underline"
                    >
                      Consulter la source
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
              {output.sources.length === 0 && (
                <p className="py-2 text-center text-xs italic text-muted">Aucune source collectée.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

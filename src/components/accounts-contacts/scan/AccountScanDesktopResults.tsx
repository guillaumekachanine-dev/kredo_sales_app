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
        <StatusPill
          label={formatConfidencePercent(row.confidenceScore)}
          variant={CONFIDENCE_VARIANT[getConfidenceTone(row.confidenceScore)]}
        />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-heading">Résultats du scan</h2>
          <p className="text-[11px] text-muted mt-0.5">
            {proposalRows.length} proposition{proposalRows.length > 1 ? "s" : ""} · {output.sources.length} source{output.sources.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onApplySelected}
          disabled={applying || selectedIds.size === 0}
          className={cn(
            "inline-flex min-h-[36px] items-center justify-center gap-2 rounded border px-4 text-xs font-bold transition-colors",
            applying || selectedIds.size === 0
              ? "border-border bg-canvas/40 text-muted cursor-not-allowed"
              : "border-primary bg-primary text-primary-fg hover:bg-primary/90"
          )}
        >
          {applying ? "Application…" : `Appliquer la sélection (${selectedIds.size})`}
        </button>
      </div>

      {/* A. Informations proposées */}
      <section>
        <DataTable<AccountScanProposalRow>
          rows={proposalRows}
          columns={columns}
          getRowId={(row) => row.id}
          ariaLabel="Propositions du scan"
          emptyState={<p className="p-4 text-center text-xs text-muted">Aucune proposition générée par ce scan.</p>}
        />
      </section>

      {/* B. Mini-rapport */}
      {output.warnings.length > 0 && (
        <section className="rounded-lg border border-border bg-canvas/30 p-4">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Réserves</h3>
          <ul className="space-y-1">
            {output.warnings.map((warning, idx) => (
              <li key={idx} className="text-[11px] leading-relaxed text-body">• {warning}</li>
            ))}
          </ul>
        </section>
      )}

      {/* C. Sources et réserves */}
      <section>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Sources</h3>
        <div className="space-y-2">
          {output.sources.map((source) => (
            <div key={source.sourceKey} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-heading">{source.sourceName}</span>
                  <span className="text-[10px] text-muted">{SOURCE_TYPE_LABELS[source.sourceType]}</span>
                </div>
                <StatusPill
                  label={`Fiabilité ${formatConfidencePercent(source.reliabilityScore)}`}
                  variant={CONFIDENCE_VARIANT[getConfidenceTone(source.reliabilityScore)]}
                />
              </div>
              {source.evidenceExcerpt && (
                <p className="mt-2 text-[11px] italic leading-relaxed text-muted">&laquo;&nbsp;{source.evidenceExcerpt}&nbsp;&raquo;</p>
              )}
              {source.sourceUrl && (
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-[11px] font-semibold text-primary hover:underline"
                >
                  Voir la source
                </a>
              )}
            </div>
          ))}
          {output.sources.length === 0 && (
            <p className="text-xs text-muted italic">Aucune source collectée.</p>
          )}
        </div>
      </section>
    </div>
  )
}

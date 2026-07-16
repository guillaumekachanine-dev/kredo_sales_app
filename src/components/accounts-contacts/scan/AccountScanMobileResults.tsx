"use client"

import { cn } from "@/lib/utils"
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

interface AccountScanMobileResultsProps {
  output: AccountScanOutput
  proposalRows: AccountScanProposalRow[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
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

function sourceLabelFor(output: AccountScanOutput, sourceKeys: string[]): string | null {
  const key = sourceKeys[0]
  if (!key) return null
  const source = output.sources.find((s) => s.sourceKey === key)
  return source ? `${SOURCE_TYPE_LABELS[source.sourceType]} — ${source.sourceName}` : null
}

function ProposalCard({
  row,
  output,
  selected,
  onToggle,
  bilan,
}: {
  row: AccountScanProposalRow
  output: AccountScanOutput
  selected: boolean
  onToggle: () => void
  bilan?: AccountScanBilanCategory
}) {
  const sourceLabel = sourceLabelFor(output, row.sourceKeys)

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Sélectionner ${getAttributeLabel(row.attributeName)}`}
          className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-heading">
              {getAttributeLabel(row.attributeName)}
              {row.isFact && (
                <span className="ml-1.5 rounded-full border border-border bg-canvas/50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                  Fait
                </span>
              )}
            </span>
            {bilan ? (
              <StatusPill label={BILAN_LABELS[bilan]} variant={BILAN_VARIANT[bilan]} />
            ) : (
              <StatusPill
                label={formatConfidencePercent(row.confidenceScore)}
                variant={CONFIDENCE_VARIANT[getConfidenceTone(row.confidenceScore)]}
              />
            )}
          </div>
          <div className="text-[11px] text-body">
            <span className="text-muted line-through decoration-muted/50">{formatProposalValue(row.oldValue)}</span>
            <span className="mx-1.5 text-muted">→</span>
            <span className="font-semibold text-heading">{formatProposalValue(row.normalizedValue ?? row.proposedValue)}</span>
          </div>
          {sourceLabel && <p className="text-[10px] text-muted">{sourceLabel}</p>}
          {row.justification && (
            <details className="mt-1">
              <summary className="cursor-pointer text-[10px] font-semibold text-primary">Détail</summary>
              <p className="mt-1 text-[11px] leading-relaxed text-body">{row.justification}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

export function AccountScanMobileResults({
  output,
  proposalRows,
  selectedIds,
  onToggleSelect,
  onApplySelected,
  applying,
  bilanByProposalId,
}: AccountScanMobileResultsProps) {
  return (
    <div className="flex flex-col gap-4 pb-[68px]">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Résultats du scan</h2>
        <p className="text-[11px] text-muted mt-0.5">
          {proposalRows.length} proposition{proposalRows.length > 1 ? "s" : ""}
        </p>
      </div>

      {proposalRows.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">Aucune proposition générée par ce scan.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {proposalRows.map((row) => (
            <ProposalCard
              key={row.id}
              row={row}
              output={output}
              selected={selectedIds.has(row.id)}
              onToggle={() => onToggleSelect(row.id)}
              bilan={bilanByProposalId.get(row.id)}
            />
          ))}
        </div>
      )}

      <details className="rounded-lg border border-border bg-canvas/30">
        <summary className="cursor-pointer px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted">
          Mini-rapport & réserves
        </summary>
        <div className="space-y-2 border-t border-border/40 px-3 py-3">
          {output.warnings.length === 0 ? (
            <p className="text-[11px] text-muted italic">Aucune réserve.</p>
          ) : (
            output.warnings.map((warning, idx) => (
              <p key={idx} className="text-[11px] leading-relaxed text-body">• {warning}</p>
            ))
          )}
        </div>
      </details>

      <details className="rounded-lg border border-border bg-canvas/30">
        <summary className="cursor-pointer px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted">
          Sources ({output.sources.length})
        </summary>
        <div className="space-y-2 border-t border-border/40 px-3 py-3">
          {output.sources.map((source) => (
            <div key={source.sourceKey} className="rounded border border-border/60 bg-surface p-2.5">
              <span className="block text-[11px] font-bold text-heading">{source.sourceName}</span>
              <span className="text-[10px] text-muted">{SOURCE_TYPE_LABELS[source.sourceType]}</span>
              {source.sourceUrl && (
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-[10px] font-semibold text-primary hover:underline"
                >
                  Voir la source
                </a>
              )}
            </div>
          ))}
        </div>
      </details>

      <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-surface px-4 py-3">
        <button
          type="button"
          onClick={onApplySelected}
          disabled={applying || selectedIds.size === 0}
          className={cn(
            "min-h-[44px] w-full rounded border px-4 text-xs font-bold transition-colors",
            applying || selectedIds.size === 0
              ? "border-border bg-canvas/40 text-muted cursor-not-allowed"
              : "border-primary bg-primary text-primary-fg hover:bg-primary/90"
          )}
        >
          {applying ? "Application…" : `Appliquer la sélection (${selectedIds.size})`}
        </button>
      </div>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { AccountScanOutput } from "@/lib/n8n/types"
import {
  type AccountScanBilanCategory,
  type AccountScanProposalRow,
  BILAN_LABELS,
  SOURCE_TYPE_LABELS,
  formatProposalValue,
  getAttributeLabel,
  getConfidenceTone,
} from "./account-scan-utils"
import { groupAccountScanRows } from "./account-scan-result-groups"

interface AccountScanMobileResultsProps {
  output: AccountScanOutput
  proposalRows: AccountScanProposalRow[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onApplySelected: () => void
  applying: boolean
  lastAppliedCount?: number | null
  bilanByProposalId: Map<string, AccountScanBilanCategory>
  errorMessage?: string | null
  onNewScan?: () => void
  onContacts?: () => void
}

export function AccountScanMobileResults({
  output,
  proposalRows,
  selectedIds,
  onToggleSelect,
  onApplySelected,
  applying,
  lastAppliedCount = null,
  bilanByProposalId,
  errorMessage,
  onNewScan,
  onContacts,
}: AccountScanMobileResultsProps) {
  const groups = useMemo(() => groupAccountScanRows(proposalRows), [proposalRows])
  const [activeGroupId, setActiveGroupId] = useState(() => groups[0]?.id ?? "")
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0]

  const isSuccessState = !applying && lastAppliedCount !== null && lastAppliedCount > 0 && selectedIds.size === 0

  return (
    <div className="flex min-h-full flex-col bg-edito-canvas pb-36">
      <div className="border-b border-edito-border bg-white px-4 py-3.5 sm:px-5">
        <h3 className="text-sm font-black text-edito-navy">
          {proposalRows.length} modification{proposalRows.length > 1 ? "s" : ""} proposée{proposalRows.length > 1 ? "s" : ""}
        </h3>
        <p className="mt-0.5 text-[10px] text-edito-muted">
          {output.sources.length} sources consultées · vérifiez avant application
        </p>
      </div>

      <nav
        className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-edito-border bg-white px-4 py-2.5 [scrollbar-width:none]"
        aria-label="Catégories de résultats"
      >
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActiveGroupId(group.id)}
            className={cn(
              "flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[10px] font-bold transition-colors",
              activeGroup?.id === group.id
                ? "border-edito-brass bg-edito-canvas text-edito-navy"
                : "border-edito-border bg-white text-edito-muted hover:text-edito-navy",
            )}
          >
            {group.label}
            <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px]">{group.rows.length}</span>
          </button>
        ))}
      </nav>

      <section className="divide-y divide-edito-border/70 bg-white" aria-label={activeGroup?.label ?? "Propositions"}>
        {(activeGroup?.rows ?? []).map((row) => {
          const tone = getConfidenceTone(row.confidenceScore)
          const sources = row.sourceKeys.flatMap((key) => {
            const source = output.sources.find((item) => item.sourceKey === key)
            return source ? [source] : []
          })
          const bilan = bilanByProposalId.get(row.id)
          const isSelected = selectedIds.has(row.id)
          const proposedValueFormatted = formatProposalValue(row.normalizedValue ?? row.proposedValue)
          const oldValueFormatted = formatProposalValue(row.oldValue)
          const hasDifferentOldValue = Boolean(row.oldValue && oldValueFormatted !== proposedValueFormatted)

          return (
            <details key={row.id} className="group px-4 py-3.5 open:bg-edito-canvas/60">
              <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => onToggleSelect(row.id)}
                  aria-label={`Sélectionner ${getAttributeLabel(row.attributeName)}`}
                  className="mt-1 size-5 shrink-0 accent-primary cursor-pointer"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-edito-heading">
                      {getAttributeLabel(row.attributeName)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold",
                        tone === "high" && "bg-success/10 text-success",
                        tone === "medium" && "bg-warning/15 text-warning",
                        tone === "low" && "bg-danger/10 text-danger",
                      )}
                    >
                      {bilan ? BILAN_LABELS[bilan] : tone === "high" ? "Élevée" : tone === "medium" ? "Moyenne" : "Faible"}
                    </span>
                  </span>

                  <div className="mt-1 flex items-start gap-1.5 text-xs">
                    <span className="shrink-0 font-bold text-edito-navy" aria-hidden="true">→</span>
                    <span className="min-w-0 flex-1 font-semibold text-edito-navy break-words leading-snug">
                      {proposedValueFormatted}
                    </span>
                  </div>

                  {hasDifferentOldValue ? (
                    <p className="mt-0.5 text-[10px] text-edito-muted truncate">
                      Précédemment : {oldValueFormatted}
                    </p>
                  ) : null}

                  <p className="mt-1 block truncate text-[9px] text-edito-muted">
                    {sources[0]?.sourceName ?? "Source non précisée"}
                  </p>
                </span>
                <svg
                  className="mt-1 size-4 shrink-0 text-edito-muted transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div className="ml-8 mt-3 rounded-md border border-edito-border bg-white p-3.5 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none">
                <p className="text-[9px] font-black uppercase tracking-[0.08em] text-edito-navy">
                  Pourquoi cette proposition ?
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-edito-body">
                  {row.justification || "Cette proposition correspond aux informations publiques les plus récentes trouvées pour le compte."}
                </p>
                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.08em] text-edito-navy">
                  Sources ({sources.length})
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {sources.map((source) => (
                    <span key={source.sourceKey} className="rounded border border-edito-border bg-edito-canvas px-2 py-1 text-[9px] text-edito-body">
                      {source.sourceName} · {SOURCE_TYPE_LABELS[source.sourceType]}
                    </span>
                  ))}
                </div>
              </div>
            </details>
          )
        })}
      </section>

      <details className="mx-4 mt-4 rounded-lg border border-edito-border bg-white">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3.5 text-[10px] font-black uppercase tracking-[0.06em] text-edito-muted">
          Réserves & sources <span>{output.warnings.length + output.sources.length}</span>
        </summary>
        <div className="space-y-2 border-t border-edito-border p-3.5">
          {output.warnings.map((warning, index) => (
            <p key={index} className="text-[10px] leading-relaxed text-edito-body">• {warning}</p>
          ))}
          {output.warnings.length === 0 ? <p className="text-[10px] text-edito-muted">Aucune réserve signalée.</p> : null}
        </div>
      </details>

      {errorMessage ? (
        <div className="mx-4 mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-[11px] font-semibold text-danger">
          {errorMessage}
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-edito-border bg-edito-navy px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 text-white shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold">
            <strong className="text-edito-gold">{selectedIds.size}</strong> sélectionné{selectedIds.size > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={onApplySelected}
            disabled={applying || (selectedIds.size === 0 && !isSuccessState)}
            className={cn(
              "min-h-11 rounded-md border px-4 text-xs font-bold transition-all duration-200 cursor-pointer",
              applying
                ? "border-white/20 bg-white/10 text-white/40 cursor-wait"
                : isSuccessState
                  ? "border-edito-brass bg-edito-brass text-edito-navy font-black shadow-sm"
                  : "border-edito-brass bg-edito-navy text-white hover:bg-white/10 disabled:border-white/20 disabled:text-white/40 disabled:cursor-not-allowed",
            )}
          >
            {applying
              ? "Application…"
              : isSuccessState
                ? `Appliqué ${lastAppliedCount} changement${lastAppliedCount! > 1 ? "s" : ""} ✓`
                : `Appliquer ${selectedIds.size} changement${selectedIds.size > 1 ? "s" : ""} →`}
          </button>
        </div>
        <div className="mt-2.5 flex gap-2">
          {onNewScan ? (
            <button
              type="button"
              onClick={onNewScan}
              className="min-h-9 flex-1 rounded border border-white/15 text-[10px] font-bold text-white/75 hover:bg-white/10 transition-colors"
            >
              Nouveau scan
            </button>
          ) : null}
          {onContacts ? (
            <button
              type="button"
              onClick={onContacts}
              className="min-h-9 flex-1 rounded border border-white/15 text-[10px] font-bold text-white/75 hover:bg-white/10 transition-colors"
            >
              Scanner les contacts
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}


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
  bilanByProposalId: Map<string, AccountScanBilanCategory>
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
  bilanByProposalId,
  onNewScan,
  onContacts,
}: AccountScanMobileResultsProps) {
  const groups = useMemo(() => groupAccountScanRows(proposalRows), [proposalRows])
  const [activeGroupId, setActiveGroupId] = useState(() => groups[0]?.id ?? "")
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0]

  return (
    <div className="flex min-h-full flex-col bg-edito-canvas pb-28">
      <div className="border-b border-edito-border bg-white px-4 py-3">
        <h3 className="text-sm font-black text-edito-navy">{proposalRows.length} modification{proposalRows.length > 1 ? "s" : ""} proposée{proposalRows.length > 1 ? "s" : ""}</h3>
        <p className="mt-0.5 text-[10px] text-edito-muted">{output.sources.length} sources consultées · vérifiez avant application</p>
      </div>

      <nav className="sticky top-0 z-20 flex gap-1.5 overflow-x-auto border-b border-edito-border bg-white px-3 py-2 [scrollbar-width:none]" aria-label="Catégories de résultats">
        {groups.map((group) => (
          <button key={group.id} type="button" onClick={() => setActiveGroupId(group.id)} className={cn("flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[10px] font-bold", activeGroup?.id === group.id ? "border-edito-brass bg-edito-canvas text-edito-navy" : "border-edito-border bg-white text-edito-muted")}>
            {group.label}<span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px]">{group.rows.length}</span>
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
          return (
            <details key={row.id} className="group px-4 py-3 open:bg-edito-canvas/60">
              <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
                <input type="checkbox" checked={selectedIds.has(row.id)} onClick={(event) => event.stopPropagation()} onChange={() => onToggleSelect(row.id)} aria-label={`Sélectionner ${getAttributeLabel(row.attributeName)}`} className="mt-0.5 size-5 shrink-0 accent-primary" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-edito-heading">{getAttributeLabel(row.attributeName)}</span>
                    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold", tone === "high" && "bg-success/10 text-success", tone === "medium" && "bg-warning/15 text-warning", tone === "low" && "bg-danger/10 text-danger")}>{bilan ? BILAN_LABELS[bilan] : tone === "high" ? "Élevée" : tone === "medium" ? "Moyenne" : "Faible"}</span>
                  </span>
                  <span className="mt-1 grid grid-cols-[1fr_18px_1fr] items-center gap-1 text-[10px]">
                    <span className="truncate text-edito-muted">{formatProposalValue(row.oldValue)}</span><span className="text-center text-edito-muted">→</span><span className="truncate font-semibold text-edito-navy">{formatProposalValue(row.normalizedValue ?? row.proposedValue)}</span>
                  </span>
                  <span className="mt-1 block truncate text-[9px] text-edito-muted">{sources[0]?.sourceName ?? "Source non précisée"}</span>
                </span>
                <svg className="mt-1 size-4 shrink-0 text-edito-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
              </summary>
              <div className="ml-8 mt-2 rounded-md border border-edito-border bg-white p-3 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none">
                <p className="text-[9px] font-black uppercase tracking-[0.08em] text-edito-navy">Pourquoi cette proposition ?</p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-edito-body">{row.justification || "Cette proposition correspond aux informations publiques les plus récentes trouvées pour le compte."}</p>
                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.08em] text-edito-navy">Sources ({sources.length})</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {sources.map((source) => <span key={source.sourceKey} className="rounded border border-edito-border bg-edito-canvas px-2 py-1 text-[9px] text-edito-body">{source.sourceName} · {SOURCE_TYPE_LABELS[source.sourceType]}</span>)}
                </div>
              </div>
            </details>
          )
        })}
      </section>

      <details className="mx-3 mt-3 rounded-lg border border-edito-border bg-white">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-[10px] font-black uppercase tracking-[0.06em] text-edito-muted">Réserves & sources <span>{output.warnings.length + output.sources.length}</span></summary>
        <div className="space-y-2 border-t border-edito-border p-3">
          {output.warnings.map((warning, index) => <p key={index} className="text-[10px] leading-relaxed text-edito-body">• {warning}</p>)}
          {output.warnings.length === 0 ? <p className="text-[10px] text-edito-muted">Aucune réserve signalée.</p> : null}
        </div>
      </details>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-edito-border bg-edito-navy px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold"><strong className="text-edito-gold">{selectedIds.size}</strong> sélectionné{selectedIds.size > 1 ? "s" : ""}</span>
          <button type="button" onClick={onApplySelected} disabled={applying || selectedIds.size === 0} className="min-h-11 rounded-md border border-edito-brass px-4 text-xs font-bold hover:bg-white/10 disabled:border-white/20 disabled:text-white/40">{applying ? "Application…" : `Appliquer ${selectedIds.size} changement${selectedIds.size > 1 ? "s" : ""}`} →</button>
        </div>
        <div className="mt-2 flex gap-2">
          {onNewScan ? <button type="button" onClick={onNewScan} className="min-h-9 flex-1 rounded border border-white/15 text-[10px] font-bold text-white/75">Nouveau scan</button> : null}
          {onContacts ? <button type="button" onClick={onContacts} className="min-h-9 flex-1 rounded border border-white/15 text-[10px] font-bold text-white/75">Scanner les contacts</button> : null}
        </div>
      </div>
    </div>
  )
}

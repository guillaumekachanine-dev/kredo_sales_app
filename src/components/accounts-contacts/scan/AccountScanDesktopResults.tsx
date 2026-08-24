"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
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
import { groupAccountScanRows } from "./account-scan-result-groups"

interface AccountScanDesktopResultsProps {
  output: AccountScanOutput
  proposalRows: AccountScanProposalRow[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: (ids: string[]) => void
  onApplySelected: () => void
  applying: boolean
  lastAppliedCount?: number | null
  bilanByProposalId: Map<string, AccountScanBilanCategory>
  onNewScan?: () => void
  onContacts?: () => void
  setupMode: "find" | "verify"
}

function ConfidenceBadge({ score }: { score: number }) {
  const tone = getConfidenceTone(score)
  return (
    <span className={cn(
      "inline-flex min-w-14 items-center justify-center rounded px-2 py-1 text-[9px] font-bold",
      tone === "high" && "bg-success/10 text-success",
      tone === "medium" && "bg-warning/15 text-warning",
      tone === "low" && "bg-danger/10 text-danger",
    )}>
      {tone === "high" ? "Élevée" : tone === "medium" ? "Moyenne" : "Faible"}
    </span>
  )
}

function sourceFor(output: AccountScanOutput, row: AccountScanProposalRow) {
  return row.sourceKeys.flatMap((key) => {
    const source = output.sources.find((item) => item.sourceKey === key)
    return source ? [source] : []
  })
}

export function AccountScanDesktopResults({
  output,
  proposalRows,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onApplySelected,
  applying,
  lastAppliedCount = null,
  bilanByProposalId,
  onNewScan,
  onContacts,
  setupMode,
}: AccountScanDesktopResultsProps) {
  const groups = useMemo(() => groupAccountScanRows(proposalRows), [proposalRows])
  const [activeGroupId, setActiveGroupId] = useState(() => groups[0]?.id ?? "")
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0]
  const visibleRows = activeGroup?.rows ?? []
  const [focusedId, setFocusedId] = useState(() => visibleRows[0]?.id ?? proposalRows[0]?.id ?? "")
  const focusedRow = proposalRows.find((row) => row.id === focusedId) ?? visibleRows[0] ?? proposalRows[0]
  const focusedSources = focusedRow ? sourceFor(output, focusedRow) : []
  const visibleIds = visibleRows.map((row) => row.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

  const isSuccessState = !applying && lastAppliedCount !== null && lastAppliedCount > 0 && selectedIds.size === 0

  const chooseGroup = (id: string) => {
    setActiveGroupId(id)
    const next = groups.find((group) => group.id === id)?.rows[0]
    if (next) setFocusedId(next.id)
  }

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-edito-border px-5 py-3">
        <div>
          <h3 className="text-sm font-black text-edito-navy">{proposalRows.length} modification{proposalRows.length > 1 ? "s" : ""} proposée{proposalRows.length > 1 ? "s" : ""}</h3>
          <p className="mt-0.5 text-[10px] text-edito-muted">Examinez les écarts, leurs niveaux de confiance et leurs sources.</p>
        </div>
        <button 
          type="button" 
          onClick={onApplySelected} 
          disabled={applying || (selectedIds.size === 0 && !isSuccessState)} 
          className={cn(
            "inline-flex min-h-9 items-center gap-2 rounded-md border px-4 text-xs font-bold transition-colors duration-300",
            isSuccessState 
              ? "border-edito-brass bg-edito-brass text-edito-navy" 
              : "border-edito-brass bg-edito-navy text-white hover:bg-edito-heading disabled:cursor-not-allowed disabled:border-edito-border disabled:bg-edito-border disabled:text-edito-muted"
          )}
        >
          {applying ? "Application…" : isSuccessState ? `Appliqué ${lastAppliedCount} changement${lastAppliedCount! > 1 ? "s" : ""} ✓` : `Appliquer ${selectedIds.size} changement${selectedIds.size > 1 ? "s" : ""} →`}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[190px_minmax(0,1fr)_250px]">
        <nav className="border-r border-edito-border bg-edito-canvas py-3" aria-label="Catégories de résultats">
          <p className="px-4 pb-2 text-[9px] font-black uppercase tracking-[0.1em] text-edito-muted">Catégories</p>
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => chooseGroup(group.id)}
              aria-current={activeGroup?.id === group.id ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 w-full items-center justify-between gap-2 px-4 text-left text-[11px] font-semibold transition-colors",
                activeGroup?.id === group.id ? "bg-white text-edito-navy before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-edito-brass" : "text-edito-body hover:bg-white/70",
              )}
            >
              <span>{group.label}</span>
              <span className="min-w-6 rounded-md bg-edito-chip px-1.5 py-1 text-center text-[9px] font-bold text-edito-muted">{group.rows.length}</span>
            </button>
          ))}
          {output.classification ? (
            <div className="mt-1 flex min-h-11 items-center justify-between gap-2 border-t border-edito-border/70 px-4 pt-1 text-[11px] font-semibold text-edito-muted">
              <span>Classification & segmentation</span>
              <span className="min-w-6 rounded-md bg-edito-chip px-1.5 py-1 text-center text-[9px] font-bold">7</span>
            </div>
          ) : null}
        </nav>

        <section className="min-w-0 overflow-y-auto" aria-label={activeGroup?.label ?? "Propositions"}>
          <div className={cn("sticky top-0 z-10 grid items-center gap-2 border-b border-edito-border bg-edito-canvas px-4 py-2 text-[9px] font-black uppercase tracking-[0.06em] text-edito-muted", setupMode === "find" ? "grid-cols-[28px_minmax(120px,1fr)_minmax(210px,1.75fr)_80px_90px]" : "grid-cols-[28px_minmax(120px,1fr)_minmax(100px,.85fr)_22px_minmax(110px,.9fr)_80px_90px]")}>
            <input type="checkbox" checked={allVisibleSelected} onChange={() => onToggleSelectAll(visibleIds)} aria-label={allVisibleSelected ? "Tout désélectionner" : "Tout sélectionner"} className="size-4 accent-primary cursor-pointer" />
            <span>Attribut</span>
            {setupMode === "verify" ? (
              <>
                <span>Actuel</span>
                <span />
              </>
            ) : null}
            <span>Proposé</span>
            <span>Confiance</span>
            <span>Source</span>
          </div>
          {visibleRows.length === 0 ? <p className="p-8 text-center text-xs text-edito-muted">Aucune proposition dans cette catégorie.</p> : null}
          {visibleRows.map((row) => {
            const sources = sourceFor(output, row)
            const bilan = bilanByProposalId.get(row.id)
            const focused = focusedRow?.id === row.id
            return (
              <div
                key={row.id}
                role="button"
                tabIndex={0}
                onClick={() => setFocusedId(row.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setFocusedId(row.id) }}
                className={cn("grid min-h-12 cursor-pointer items-center gap-2 border-b border-edito-border/65 px-4 py-2 outline-none transition-colors hover:bg-edito-canvas/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40", focused && "bg-primary/[0.035]", setupMode === "find" ? "grid-cols-[28px_minmax(120px,1fr)_minmax(210px,1.75fr)_80px_90px]" : "grid-cols-[28px_minmax(120px,1fr)_minmax(100px,.85fr)_22px_minmax(110px,.9fr)_80px_90px]")}
              >
                <input type="checkbox" checked={selectedIds.has(row.id)} onClick={(event) => event.stopPropagation()} onChange={() => onToggleSelect(row.id)} aria-label={`Sélectionner ${getAttributeLabel(row.attributeName)}`} className="size-4 accent-primary" />
                <span className="truncate text-[11px] font-bold text-edito-heading">{getAttributeLabel(row.attributeName)}</span>
                {setupMode === "verify" ? (
                  <>
                    <span className="truncate text-[11px] text-edito-muted">{formatProposalValue(row.oldValue)}</span>
                    <span className="text-center text-xs text-edito-muted">→</span>
                  </>
                ) : null}
                <span className="truncate text-[11px] font-semibold text-edito-navy">{formatProposalValue(row.normalizedValue ?? row.proposedValue)}</span>
                <span>{bilan ? <span className="text-[9px] font-bold text-success">{BILAN_LABELS[bilan]}</span> : <ConfidenceBadge score={row.confidenceScore} />}</span>
                <span className="truncate text-[10px] font-semibold text-edito-muted">{sources[0]?.sourceName ?? "—"}</span>
              </div>
            )
          })}
        </section>

        <aside className="overflow-y-auto border-l border-edito-border bg-edito-canvas px-4 pb-4 pt-3" aria-label="Élément sélectionné">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.1em] text-edito-muted">Élément sélectionné</p>
          {focusedRow ? (
            <div className="rounded-lg border border-edito-border bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-black text-edito-navy">{getAttributeLabel(focusedRow.attributeName)}</h4>
                <div className="scale-90 origin-top-right shrink-0"><ConfidenceBadge score={focusedRow.confidenceScore} /></div>
              </div>
              <div className="mt-4 space-y-1">
                <span className="text-[9px] font-bold uppercase text-edito-muted">Proposé</span>
                <p className="text-xs font-bold text-edito-heading">{formatProposalValue(focusedRow.normalizedValue ?? focusedRow.proposedValue)}</p>
              </div>
              <div className="my-3 border-t border-edito-border" />
              <p className="text-[9px] font-black uppercase tracking-[0.08em] text-edito-navy">Justification</p>
              <p className="mt-1 text-[11px] leading-snug text-edito-body">{focusedRow.justification || "Cette proposition rapproche les données du compte des informations publiques les plus récentes."}</p>
              <div className="my-3 border-t border-edito-border" />
              <p className="text-[9px] font-black uppercase tracking-[0.08em] text-edito-navy">Sources ({focusedSources.length})</p>
              <div className="mt-2 space-y-3">
                {focusedSources.map((source) => (
                  <div key={source.sourceKey} className="flex items-start gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-edito-chip text-[8px] font-black text-primary">{source.sourceName.slice(0, 2).toUpperCase()}</span>
                    <span className="min-w-0"><span className="block truncate text-[10px] font-bold text-edito-heading">{source.sourceName}</span><span className="block text-[9px] text-edito-muted">{SOURCE_TYPE_LABELS[source.sourceType]}</span></span>
                  </div>
                ))}
                {focusedSources.length === 0 ? <p className="text-[10px] text-edito-muted">Aucune source associée.</p> : null}
              </div>
            </div>
          ) : <p className="text-[11px] text-edito-muted">Sélectionnez une ligne pour afficher sa justification.</p>}
        </aside>
      </div>
    </div>
  )
}

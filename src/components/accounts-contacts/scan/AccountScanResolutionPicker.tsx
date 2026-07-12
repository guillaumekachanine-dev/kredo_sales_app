"use client"

import { cn } from "@/lib/utils"
import type { AccountScanResolutionCandidate } from "@/lib/n8n/types"

interface AccountScanResolutionPickerProps {
  candidates: AccountScanResolutionCandidate[]
  isMobile: boolean
  relaunching: boolean
  onSelect: (siren: string) => void
  onCancel: () => void
}

export function AccountScanResolutionPicker({
  candidates,
  isMobile,
  relaunching,
  onSelect,
  onCancel,
}: AccountScanResolutionPickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Entreprise ambiguë</h2>
        <p className="mt-0.5 text-[11px] text-body leading-relaxed">
          Plusieurs entités du registre officiel correspondent à ce compte — sélectionner la bonne pour
          continuer. Aucune proposition n&apos;a été générée tant que l&apos;entité n&apos;est pas confirmée.
        </p>
      </div>

      <div className="space-y-2">
        {candidates.map((candidate) => (
          <button
            key={candidate.siren}
            type="button"
            onClick={() => onSelect(candidate.siren)}
            disabled={relaunching}
            className={cn(
              "w-full rounded-lg border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] disabled:cursor-wait disabled:opacity-60",
              isMobile ? "min-h-[44px]" : ""
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 truncate text-xs font-bold text-heading">{candidate.legalName}</span>
              {typeof candidate.matchScore === "number" && (
                <span className="shrink-0 rounded-full border border-border bg-canvas/40 px-2 py-0.5 text-[10px] font-bold text-muted">
                  {Math.round(candidate.matchScore * 100)}% correspondance
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-body">
              <span>SIREN : <strong className="font-semibold text-heading">{candidate.siren}</strong></span>
              {candidate.nafCode && <span>NAF : {candidate.nafCode}</span>}
              {candidate.hqLocation && <span>{candidate.hqLocation}</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={relaunching}
          className="text-[10px] font-bold uppercase tracking-wider text-muted hover:text-body"
        >
          Annuler et revenir au paramétrage
        </button>
      </div>
    </div>
  )
}

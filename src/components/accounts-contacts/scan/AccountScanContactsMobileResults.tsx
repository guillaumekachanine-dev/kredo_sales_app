"use client"

import { cn } from "@/lib/utils"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import type { AccountScanContactCandidate, AccountScanOutput } from "@/lib/n8n/types"
import type { ImportAccountScanContactsResult } from "./account-scan-actions"
import { candidateCanBeSelected, formatConfidencePercent, getConfidenceTone } from "./account-scan-utils"

interface AccountScanContactsMobileResultsProps {
  output: AccountScanOutput
  selectedKeys: Set<string>
  importing: boolean
  importResult: ImportAccountScanContactsResult | null
  onToggleSelect: (candidateKey: string) => void
  onImportSelected: () => void
  onBackToInformation: () => void
  onRelaunchContacts: () => void
  onClose: () => void
}

const CONFIDENCE_VARIANT: Record<string, StatusPillVariant> = {
  high: "success",
  medium: "warning",
  low: "danger",
}

const ACTION_VARIANT: Record<AccountScanContactCandidate["suggestedAction"], StatusPillVariant> = {
  create: "success",
  link: "info",
  update: "warning",
  ignore: "neutral",
}

function ContactCard({
  candidate,
  selected,
  onToggle,
}: {
  candidate: AccountScanContactCandidate
  selected: boolean
  onToggle: () => void
}) {
  const selectable = candidateCanBeSelected(candidate)

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          disabled={!selectable}
          onChange={onToggle}
          aria-label={`Sélectionner ${candidate.fullName}`}
          className="mt-0.5 h-5 w-5 shrink-0 accent-primary disabled:opacity-40"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-heading">{candidate.fullName}</p>
              <p className="mt-0.5 text-[11px] text-body">{candidate.jobTitle || "Fonction non renseignée"}</p>
              {candidate.department && <p className="text-[10px] text-muted">{candidate.department}</p>}
            </div>
            <StatusPill
              label={formatConfidencePercent(candidate.confidenceScore)}
              variant={CONFIDENCE_VARIANT[getConfidenceTone(candidate.confidenceScore)]}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusPill label={candidate.suggestedAction} variant={ACTION_VARIANT[candidate.suggestedAction]} />
            <StatusPill label={candidate.existingContactId ? "Existant" : "Nouveau"} variant={candidate.existingContactId ? "info" : "success"} />
            <StatusPill label={`Email ${candidate.emailStatus}`} variant={candidate.emailStatus === "inferred" ? "warning" : "neutral"} />
          </div>

          <div className="mt-2 space-y-1 text-[11px] text-body">
            <p>{candidate.email && candidate.emailStatus !== "inferred" ? candidate.email : "Email non confirmé"}</p>
            {candidate.phone && <p>{candidate.phone}</p>}
            {candidate.linkedinUrl && (
              <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary">
                Profil public
              </a>
            )}
          </div>

          {(candidate.evidence || candidate.relationshipRole) && (
            <details className="mt-2">
              <summary className="flex min-h-[44px] items-center cursor-pointer text-[10px] font-semibold text-primary">
                Détail
              </summary>
              <div className="space-y-1 text-[11px] leading-relaxed text-muted">
                {candidate.relationshipRole && <p>Rôle : {candidate.relationshipRole}</p>}
                {candidate.evidence && <p>{candidate.evidence}</p>}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

export function AccountScanContactsMobileResults({
  output,
  selectedKeys,
  importing,
  importResult,
  onToggleSelect,
  onImportSelected,
  onBackToInformation,
  onRelaunchContacts,
  onClose,
}: AccountScanContactsMobileResultsProps) {
  return (
    <div className="flex flex-col gap-4 pb-[84px]">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Résultats contacts</h2>
        <p className="mt-0.5 text-[11px] text-muted">
          {output.contactCandidates.length} candidat{output.contactCandidates.length > 1 ? "s" : ""}
        </p>
      </div>

      {importResult && (
        <div className={cn(
          "rounded-lg border p-3 text-[11px]",
          importResult.error ? "border-danger/30 bg-danger/5 text-danger" : "border-border bg-canvas/30 text-body"
        )}>
          {importResult.error
            ? importResult.error
            : `Créé ${importResult.created} · Rattaché ${importResult.linked} · Mis à jour ${importResult.updated} · Déjà à jour ${importResult.alreadyExists} · Conflit ${importResult.conflicting} · Ignoré ${importResult.ignored}`}
        </div>
      )}

      {output.contactCandidates.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">Aucun candidat contact dans ce résultat.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {output.contactCandidates.map((candidate) => (
            <ContactCard
              key={candidate.candidateKey}
              candidate={candidate}
              selected={selectedKeys.has(candidate.candidateKey)}
              onToggle={() => onToggleSelect(candidate.candidateKey)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <button type="button" onClick={onBackToInformation} className="min-h-[44px] rounded border border-border bg-surface px-3 text-xs font-bold text-body">
          Retour aux résultats informations
        </button>
        <button type="button" onClick={onRelaunchContacts} className="min-h-[44px] rounded border border-border bg-surface px-3 text-xs font-bold text-body">
          Relancer une recherche contacts
        </button>
        <button type="button" onClick={onClose} className="min-h-[44px] rounded border border-border bg-surface px-3 text-xs font-bold text-body">
          Fermer
        </button>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-surface px-4 py-3">
        <button
          type="button"
          onClick={onImportSelected}
          disabled={importing || selectedKeys.size === 0}
          className={cn(
            "min-h-[44px] w-full rounded border px-4 text-xs font-bold transition-colors",
            importing || selectedKeys.size === 0
              ? "cursor-not-allowed border-border bg-canvas/40 text-muted"
              : "border-primary bg-primary text-primary-fg hover:bg-primary/90"
          )}
        >
          {importing ? "Import…" : `Importer la sélection (${selectedKeys.size})`}
        </button>
      </div>
    </div>
  )
}

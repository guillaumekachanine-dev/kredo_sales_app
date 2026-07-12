"use client"

import { cn } from "@/lib/utils"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import type { AccountScanContactCandidate, AccountScanOutput } from "@/lib/n8n/types"
import type { ImportAccountScanContactsResult } from "./account-scan-actions"
import { SOURCE_TYPE_LABELS, candidateCanBePreselected, formatConfidencePercent, getConfidenceTone } from "./account-scan-utils"

interface AccountScanContactsDesktopResultsProps {
  output: AccountScanOutput
  resultId: string | null
  selectedKeys: Set<string>
  importing: boolean
  importResult: ImportAccountScanContactsResult | null
  onToggleSelect: (candidateKey: string) => void
  onToggleSelectAll: (candidateKeys: string[]) => void
  onImportSelected: () => void
  onBackToInformation: () => void
  onRelaunchContacts: () => void
  onClose: () => void
  onOpenContact?: (contactId: string) => void
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

const EMAIL_LABELS: Record<AccountScanContactCandidate["emailStatus"], string> = {
  public: "public",
  confirmed: "confirmé",
  inferred: "inféré",
  unknown: "inconnu",
}

function sourceLabelFor(output: AccountScanOutput, sourceKeys: string[]): string {
  const key = sourceKeys[0]
  const source = key ? output.sources.find((item) => item.sourceKey === key) : null
  return source ? `${SOURCE_TYPE_LABELS[source.sourceType]} — ${source.sourceName}` : "—"
}

function ImportSummary({
  result,
  onOpenContact,
}: {
  result: ImportAccountScanContactsResult
  onOpenContact?: (contactId: string) => void
}) {
  if (result.error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
        {result.error}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-canvas/30 p-3">
      <div className="flex flex-wrap gap-2 text-[11px]">
        <StatusPill label={`Créé ${result.created}`} variant="success" />
        <StatusPill label={`Rattaché ${result.linked}`} variant="info" />
        <StatusPill label={`Mis à jour ${result.updated}`} variant="warning" />
        <StatusPill label={`Ignoré ${result.ignored}`} variant="neutral" />
        <StatusPill label={`Conflit ${result.conflict}`} variant={result.conflict > 0 ? "danger" : "neutral"} />
        <StatusPill label={`Erreur ${result.errorCount}`} variant={result.errorCount > 0 ? "danger" : "neutral"} />
      </div>
      {onOpenContact && result.items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {result.items.filter((item) => item.contactId).map((item) => (
            <button
              key={`${item.candidateKey}-${item.contactId}`}
              type="button"
              onClick={() => item.contactId && onOpenContact(item.contactId)}
              className="rounded border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-primary hover:bg-canvas/40"
            >
              Ouvrir {item.operation}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AccountScanContactsDesktopResults({
  output,
  resultId,
  selectedKeys,
  importing,
  importResult,
  onToggleSelect,
  onToggleSelectAll,
  onImportSelected,
  onBackToInformation,
  onRelaunchContacts,
  onClose,
  onOpenContact,
}: AccountScanContactsDesktopResultsProps) {
  const candidates = output.contactCandidates
  const selectableKeys = candidates.filter(candidateCanBePreselected).map((candidate) => candidate.candidateKey)
  const allSelected = selectableKeys.length > 0 && selectableKeys.every((key) => selectedKeys.has(key))

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-heading">Résultats contacts</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {candidates.length} candidat{candidates.length > 1 ? "s" : ""} · résultat {resultId ? resultId.slice(0, 8) : "en attente"}
          </p>
        </div>
        <button
          type="button"
          onClick={onImportSelected}
          disabled={importing || selectedKeys.size === 0}
          className={cn(
            "inline-flex min-h-[36px] items-center justify-center rounded border px-4 text-xs font-bold transition-colors",
            importing || selectedKeys.size === 0
              ? "cursor-not-allowed border-border bg-canvas/40 text-muted"
              : "border-primary bg-primary text-primary-fg hover:bg-primary/90"
          )}
        >
          {importing ? "Import…" : `Importer la sélection (${selectedKeys.size})`}
        </button>
      </div>

      {importResult && <ImportSummary result={importResult} onOpenContact={onOpenContact} />}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-left text-xs">
          <thead className="bg-canvas/40 text-[10px] uppercase tracking-wider text-muted">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleSelectAll(selectableKeys)}
                  aria-label="Sélectionner tous les contacts importables"
                  className="h-4 w-4 accent-primary"
                />
              </th>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Fonction</th>
              <th className="px-3 py-2">Rôle</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Téléphone</th>
              <th className="px-3 py-2">Profil public</th>
              <th className="px-3 py-2">Confiance</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {candidates.map((candidate) => {
              const selectable = candidateCanBePreselected(candidate)
              return (
                <tr key={candidate.candidateKey}>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(candidate.candidateKey)}
                      disabled={!selectable}
                      onChange={() => onToggleSelect(candidate.candidateKey)}
                      aria-label={`Sélectionner ${candidate.fullName}`}
                      className="h-4 w-4 accent-primary disabled:opacity-40"
                    />
                  </td>
                  <td className="px-3 py-2 align-top font-semibold text-heading">{candidate.fullName}</td>
                  <td className="px-3 py-2 align-top text-body">
                    <span className="block">{candidate.jobTitle || "—"}</span>
                    <span className="text-[10px] text-muted">{candidate.department || "—"}</span>
                  </td>
                  <td className="px-3 py-2 align-top">{candidate.relationshipRole || "—"}</td>
                  <td className="px-3 py-2 align-top">
                    <span className={candidate.emailStatus === "inferred" ? "text-muted" : "text-heading"}>
                      {candidate.email || "—"}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted">{EMAIL_LABELS[candidate.emailStatus]}</span>
                  </td>
                  <td className="px-3 py-2 align-top">{candidate.phone || "—"}</td>
                  <td className="px-3 py-2 align-top">
                    {candidate.linkedinUrl ? (
                      <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Profil
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <StatusPill
                      label={formatConfidencePercent(candidate.confidenceScore)}
                      variant={CONFIDENCE_VARIANT[getConfidenceTone(candidate.confidenceScore)]}
                    />
                  </td>
                  <td className="max-w-[12rem] px-3 py-2 align-top text-[11px] text-muted">{sourceLabelFor(output, candidate.sourceKeys)}</td>
                  <td className="px-3 py-2 align-top">
                    <StatusPill label={candidate.suggestedAction} variant={ACTION_VARIANT[candidate.suggestedAction]} />
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-muted">
                    {candidate.existingContactId ? "Contact existant" : candidate.existingPersonId ? "Personne connue" : "Nouveau"}
                  </td>
                </tr>
              )
            })}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-xs text-muted">
                  Aucun candidat contact dans ce résultat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <button type="button" onClick={onBackToInformation} className="min-h-[36px] rounded border border-border bg-surface px-3 text-xs font-bold text-body hover:bg-canvas/40">
          Retour aux résultats informations
        </button>
        <button type="button" onClick={onRelaunchContacts} className="min-h-[36px] rounded border border-border bg-surface px-3 text-xs font-bold text-body hover:bg-canvas/40">
          Relancer une recherche contacts
        </button>
        <button type="button" onClick={onClose} className="min-h-[36px] rounded border border-primary bg-primary px-3 text-xs font-bold text-primary-fg hover:bg-primary/90">
          Fermer
        </button>
      </div>
    </div>
  )
}

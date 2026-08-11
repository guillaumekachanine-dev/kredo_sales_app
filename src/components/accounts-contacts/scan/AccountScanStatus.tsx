"use client"

import { cn } from "@/lib/utils"

export type AccountScanStatusKind = "queued" | "running" | "error" | "not_found"

interface AccountScanStatusProps {
  kind: AccountScanStatusKind
  message?: string | null
  isMobile: boolean
  onRetry?: () => void
  onCancel?: () => void
}

const STATUS_COPY: Record<AccountScanStatusKind, { title: string; body: string }> = {
  queued: {
    title: "Scan en file d'attente",
    body: "Le run a été créé, n8n va démarrer le traitement dans quelques instants.",
  },
  running: {
    title: "Scan en cours",
    body: "Résolution de l'entité, collecte des sources et génération des propositions… le résultat apparaît automatiquement.",
  },
  error: {
    title: "Le scan a échoué",
    body: "Une erreur est survenue pendant le traitement.",
  },
  not_found: {
    title: "Entité juridique introuvable",
    body: "Le registre officiel n'a retourné aucune correspondance. Vérifier le nom légal ou renseigner un SIREN manuellement.",
  },
}

export function AccountScanStatus({ kind, message, isMobile, onRetry, onCancel }: AccountScanStatusProps) {
  const copy = STATUS_COPY[kind]
  const isBusy = kind === "queued" || kind === "running"
  const isCancelled = kind === "error" && message === "Annulé par l'utilisateur"

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      {isBusy ? (
        <span className="h-8 w-8 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
      ) : (
        <svg
          className={cn("h-8 w-8", kind === "error" ? "text-danger" : "text-warning")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}

      <div>
        <p className="text-sm font-bold text-heading">{isCancelled ? "Scan annulé" : copy.title}</p>
        <p className="mt-1 max-w-xs text-[11px] text-muted leading-relaxed">{isCancelled ? "Le processus a été interrompu." : (message || copy.body)}</p>
      </div>

      <div className="flex gap-3 mt-2">
        {isBusy && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "inline-flex items-center justify-center rounded border-2 border-[#EF4444] bg-[#FEF2F2] px-6 text-xs font-bold text-[#DC2626] transition-colors hover:bg-[#FEE2E2]",
              isMobile ? "min-h-[44px]" : "min-h-[36px]"
            )}
          >
            STOP
          </button>
        )}
        {!isBusy && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "mt-2 inline-flex items-center justify-center rounded border border-primary bg-primary px-4 text-xs font-bold text-primary-fg transition-colors hover:bg-primary/90",
            isMobile ? "min-h-[44px]" : "min-h-[36px]"
          )}
        >
          Revenir au paramétrage
        </button>
        )}
      </div>
    </div>
  )
}

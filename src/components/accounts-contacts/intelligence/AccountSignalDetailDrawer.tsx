"use client"

import { AppDrawer } from "@/components/ui/AppDrawer"
import type { ClientIntelligenceSignal } from "@/lib/intelligence/intelligence-data"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"
import { AccountSignalMobileActions } from "./AccountSignalMobileActions"

type AccountSignalDetailDrawerProps = {
  signal: ClientIntelligenceSignal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  onDismiss: (signalId: string) => void
  onReturnToCockpit?: () => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function AccountSignalDetailDrawer({
  signal,
  open,
  onOpenChange,
  companyId,
  companyName,
  onDismiss,
  onReturnToCockpit,
}: AccountSignalDetailDrawerProps) {
  if (!signal) return null

  const hasSourceUrl = !!signal.primarySource?.source_url

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={signal.title}
      eyebrow={signal.type ?? signal.category ?? "Signal de veille"}
      subtitle={`Veille client rattachée au compte ${companyName}`}
    >
      <div className="space-y-6">
        {onReturnToCockpit ? <CockpitReturnButton onClick={onReturnToCockpit} /> : null}
        {/* Résumé */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Résumé</h3>
          <p className="text-xs text-body bg-canvas/30 rounded-lg p-3.5 border border-border/40 leading-relaxed">
            {signal.summary || "Aucun résumé disponible."}
          </p>
        </div>

        {/* Action recommandée */}
        {signal.recommendedAction && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Action recommandée</h3>
            <p className="text-xs font-semibold text-heading bg-brand-brass/5 rounded-lg p-3.5 border border-brand-brass/25 leading-relaxed">
              {signal.recommendedAction}
            </p>
          </div>
        )}

        {/* Méta-scores */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Indicateurs clés</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/80 bg-canvas/20 p-3 text-center">
              <span className="block text-[9px] font-semibold text-muted uppercase">Score global</span>
              <span className="mt-1 block text-base font-bold text-heading">
                {signal.globalScore.toFixed(2)}
              </span>
            </div>
            <div className="rounded-lg border border-border/80 bg-canvas/20 p-3 text-center">
              <span className="block text-[9px] font-semibold text-muted uppercase">Urgence</span>
              <span className="mt-1 block text-base font-bold text-heading">
                {signal.urgencyScore.toFixed(2)}
              </span>
            </div>
            <div className="rounded-lg border border-border/80 bg-canvas/20 p-3 text-center">
              <span className="block text-[9px] font-semibold text-muted uppercase">Confiance</span>
              <span className="mt-1 block text-base font-bold text-heading">
                {signal.confidenceScore.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Date & Source */}
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Détecté le</span>
            <span className="font-semibold text-heading">{formatDate(signal.detectedAt)}</span>
          </div>
          {signal.expiresAt && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Expire le</span>
              <span className="font-semibold text-heading">{formatDate(signal.expiresAt)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2.5">
            <span className="text-muted">Source principale</span>
            {hasSourceUrl ? (
              <a
                href={signal.primarySource!.source_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[200px] truncate font-semibold text-primary underline-offset-2 hover:underline"
                title={signal.primarySource?.source_name ?? undefined}
              >
                {signal.primarySource?.source_name || "Ouvrir la source"}
              </a>
            ) : (
              <span className="max-w-[200px] truncate font-semibold text-heading">{signal.primarySource?.source_name || "Non disponible"}</span>
            )}
          </div>
        </div>

        <AccountSignalMobileActions
          key={signal.id}
          signalId={signal.id}
          companyId={companyId}
          companyName={companyName}
          onDismiss={(signalId) => {
            onDismiss(signalId)
            onOpenChange(false)
          }}
        />
      </div>
    </AppDrawer>
  )
}

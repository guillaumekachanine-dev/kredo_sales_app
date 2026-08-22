"use client"

import { AppDrawer } from "@/components/ui/AppDrawer"
import type { ClientIntelligenceSignal } from "@/lib/intelligence/intelligence-data"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"
import { AccountSignalMobileActions } from "./AccountSignalMobileActions"
import { formatDateNumeric } from "@/lib/formatters"
import { resolveOriginalSourceName } from "@/components/veille/veille-utils"

type AccountSignalDetailDrawerProps = {
  signal: ClientIntelligenceSignal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  onDismiss: (signalId: string) => void
  onReturnToCockpit?: () => void
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
  const sourceName = resolveOriginalSourceName(signal.primarySource?.source_name, signal.primarySource?.source_url)
  const paritionDate = signal.publishedAt ?? signal.detectedAt

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={signal.title}
      eyebrow="Veille ciblée"
      subtitle={`Paru le ${formatDateNumeric(paritionDate)}`}
    >
      <div className="space-y-6">
        {onReturnToCockpit ? <CockpitReturnButton onClick={onReturnToCockpit} /> : null}

        {/* Résumé du signal (sans cadre, au-dessus de la section détecté le + source) */}
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Résumé du signal</h3>
          <p className="text-xs font-medium leading-snug text-heading">
            {signal.summary || "Aucun résumé disponible."}
          </p>
        </div>

        {/* Date & Source principale */}
        <div className="space-y-2.5 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Détecté le</span>
            <span className="font-semibold text-heading">{formatDateNumeric(signal.detectedAt)}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2.5">
            <span className="text-muted">Source principale</span>
            {hasSourceUrl ? (
              <a
                href={signal.primarySource!.source_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[220px] truncate font-semibold text-primary underline-offset-2 hover:underline"
                title={sourceName}
              >
                {sourceName}
              </a>
            ) : (
              <span className="max-w-[220px] truncate font-semibold text-heading">{sourceName}</span>
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

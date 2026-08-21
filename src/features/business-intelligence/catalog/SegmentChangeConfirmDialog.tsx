"use client"

import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import type { BusinessIntelligenceCatalogSegment } from "../data/business-intelligence-workspace-types"

export function SegmentChangeConfirmDialog({
  pendingSegment,
  currentSegmentName,
  isPending,
  onCancel,
  onConfirm,
}: {
  pendingSegment: BusinessIntelligenceCatalogSegment | null
  currentSegmentName?: string | null
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const open = pendingSegment !== null
  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onCancel() }}
      title="Confirmer le changement de segment"
      description="Le segment actif détermine toutes les analyses du workspace Business Intelligence."
      footer={
        <>
          <Button variant="secondary" size="sm" disabled={isPending} onClick={onCancel}>Annuler</Button>
          <Button size="sm" loading={isPending} loadingLabel="Chargement" onClick={onConfirm}>Activer ce segment</Button>
        </>
      }
    >
      {pendingSegment ? (
        <div className="space-y-3 py-1">
          {currentSegmentName ? (
            <p className="text-xs text-muted">Segment actuel <strong className="font-semibold text-body">{currentSegmentName}</strong></p>
          ) : null}
          <div className="border-l-2 border-brand-brass bg-canvas px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Nouveau segment</p>
            <p className="mt-1 text-sm font-bold text-heading">{pendingSegment.name}</p>
            <p className="mt-1 text-xs text-body">{pendingSegment.accountCount} compte{pendingSegment.accountCount > 1 ? "s" : ""} dans le portefeuille</p>
          </div>
          <p className="text-xs leading-relaxed text-body">L’Accueil et les cinq autres chapitres seront recalculés dans ce nouveau périmètre.</p>
        </div>
      ) : null}
    </AppDialog>
  )
}

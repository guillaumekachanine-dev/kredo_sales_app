"use client"

import { AppDrawer } from "@/components/ui/AppDrawer"
import type { ResolvedSource } from "../shared/SourceChip"
import { formatConsultedAt, resolveTerrainSource } from "./terrain-source-model"

export type TerrainSourceSheetProps = {
  sourceId: number | null
  sourceResolution?: Record<number, ResolvedSource> | null
  open: boolean
  onClose: () => void
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 stroke-[2.5]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  )
}

function DragHandle() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto mb-2.5 h-1 w-10 shrink-0 rounded-full bg-edito-border"
    />
  )
}

export function TerrainSourceSheet({
  sourceId,
  sourceResolution,
  open,
  onClose,
}: TerrainSourceSheetProps) {
  if (sourceId === null) return null

  const resolved = resolveTerrainSource(sourceId, sourceResolution)
  const title = `Source S${sourceId}`
  const eyebrow = resolved.publisher ?? "Source Terrain"
  const formattedDate = formatConsultedAt(resolved.consultedAt)

  const footerCTA = resolved.url ? (
    <a
      href={resolved.url}
      target="_blank"
      rel="noreferrer"
      aria-label="Ouvrir le site de l’éditeur dans un nouvel onglet"
      className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-edito-navy px-4 font-sans text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-edito-heading active:bg-edito-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
    >
      <span>Ouvrir le site de l’éditeur</span>
      <ExternalLinkIcon />
    </a>
  ) : undefined

  return (
    <AppDrawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
      side="bottom"
      title={
        <div className="space-y-0.5">
          <DragHandle />
          <h2 className="font-heading text-base font-extrabold tracking-tight text-edito-navy sm:text-lg">
            {title}
          </h2>
        </div>
      }
      eyebrow={eyebrow}
      showMobileCloseButton={true}
      closeLabel="Fermer la fiche source"
      footer={footerCTA}
      className="rounded-t-2xl border-t border-edito-border bg-edito-surface"
      contentClassName="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4"
    >
      {resolved.isResolved ? (
        <div className="space-y-4 text-xs">
          {/* 1. Éditeur & Tier */}
          <div className="rounded-xl border border-edito-border/60 bg-edito-canvas/60 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-edito-muted">
                Éditeur
              </span>
              {resolved.tier ? (
                <span className="inline-block rounded border border-edito-brass/40 bg-edito-amber-soft px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-edito-navy">
                  {resolved.tier}
                </span>
              ) : null}
            </div>
            <p className="font-heading text-sm font-bold text-edito-navy">
              {resolved.publisher ?? "Éditeur non renseigné"}
            </p>
          </div>

          {/* 2. Attestation (contenu long scrollable) */}
          {resolved.attests ? (
            <div className="space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-edito-brass-hover">
                Ce que la source atteste
              </span>
              <div className="rounded-xl border border-edito-border/80 bg-edito-surface p-3.5 leading-relaxed text-edito-body">
                {resolved.attests}
              </div>
            </div>
          ) : null}

          {/* 3. Date de consultation */}
          <div className="pt-1 text-[11px] font-medium text-edito-muted">
            {resolved.consultedAt ? (
              <p>Consulté le {formattedDate}</p>
            ) : (
              <p className="italic text-edito-muted/80">{formattedDate}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-edito-border/60 bg-edito-chip/50 p-4 space-y-2 text-xs">
          <p className="font-bold text-edito-navy">Informations source indisponibles</p>
          <p className="leading-relaxed text-edito-muted">
            La source S{sourceId} est référencée dans le contenu mais n’est pas résolue dans le
            registre courant.
          </p>
        </div>
      )}
    </AppDrawer>
  )
}

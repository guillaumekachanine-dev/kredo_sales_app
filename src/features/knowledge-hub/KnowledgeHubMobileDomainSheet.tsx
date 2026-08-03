"use client"

import { DomainItem } from "./knowledge-hub.types"

interface MobileDomainSheetProps {
  domain: DomainItem
  onClose: () => void
}

export function KnowledgeHubMobileDomainSheet({
  domain,
  onClose,
}: MobileDomainSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
      {/* Backdrop click target */}
      <button
        type="button"
        aria-label="Fermer le panneau"
        onClick={onClose}
        className="absolute inset-0 cursor-default outline-none bg-transparent"
      />

      {/* Sheet Content */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-edito-border bg-edito-surface p-5 shadow-lg animate-slide-up">
        {/* Drag handle visual */}
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-edito-border" />

        <div className="flex items-start justify-between border-b border-edito-border pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
              Détail du domaine
            </span>
            <h4 className="text-sm font-bold text-edito-navy">{domain.title}</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-edito-chip text-edito-navy font-bold text-xs"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
              Description de l&apos;intention
            </span>
            <p className="mt-1 text-xs leading-relaxed text-edito-body">
              {domain.description}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
              Nature des futurs contenus
            </span>
            <p className="mt-1 text-xs leading-relaxed text-edito-body">
              {domain.nature}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
              Relations cartographiques prévues
            </span>
            <ul className="mt-1.5 space-y-1">
              {domain.relations.map((rel) => (
                <li key={rel} className="flex items-center gap-2 text-xs text-edito-body">
                  <span className="inline-block size-1.5 rounded-full bg-edito-brass shrink-0" />
                  <span>{rel}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-edito-border pt-4">
            <div className="flex items-center justify-between rounded bg-edito-brass/10 px-3 py-2 border border-edito-brass/25">
              <span className="text-[10px] font-bold uppercase tracking-wider text-edito-brass">
                Statut
              </span>
              <span className="rounded bg-edito-brass px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                Contenus à connecter
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-edito-navy text-xs font-bold text-white transition-colors hover:bg-edito-navy/90 outline-none"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

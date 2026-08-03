"use client"

import { WorkshopItem } from "./knowledge-hub.types"

interface MobileWorkshopSheetProps {
  workshop: WorkshopItem
  onClose: () => void
}

export function KnowledgeHubMobileWorkshopSheet({
  workshop,
  onClose,
}: MobileWorkshopSheetProps) {
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
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-edito-navy/5 text-sm font-bold text-edito-navy">
              {workshop.icon === "RFP" && "📄"}
              {workshop.icon === "REX" && "📌"}
              {workshop.icon === "CALC" && "⚖️"}
              {workshop.icon === "DOC" && "🎨"}
              {workshop.icon === "CRM" && "🏢"}
              {workshop.icon === "MEET" && "👥"}
              {workshop.icon === "EXIT" && "🔄"}
              {workshop.icon === "LAW" && "🛡️"}
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                Détail de l&apos;atelier
              </span>
              <h4 className="text-sm font-bold text-edito-navy">{workshop.title}</h4>
            </div>
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
              Objectif de l&apos;action
            </span>
            <p className="mt-1 text-xs leading-relaxed text-edito-body">
              {workshop.description}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
              Connaissances mobilisées
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {workshop.mobilizedKnowledge.map((fam) => (
                <span
                  key={fam}
                  className="inline-flex items-center rounded bg-edito-chip px-2 py-0.5 text-[9px] font-medium text-edito-muted"
                >
                  {fam}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
              Résultat attendu
            </span>
            <p className="mt-1 text-xs leading-relaxed text-edito-body">
              Génération automatique de livrables et recommandations basées sur l&apos;atlas de connaissances KREDO.
            </p>
          </div>

          <div className="border-t border-edito-border pt-4 space-y-3">
            <div className="flex items-center justify-between rounded bg-edito-brass/10 px-3 py-2 border border-edito-brass/25">
              <span className="text-[10px] font-bold uppercase tracking-wider text-edito-brass">
                Statut
              </span>
              <span className="rounded bg-edito-brass px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                Bientôt disponible
              </span>
            </div>

            <button
              type="button"
              disabled
              className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-edito-navy/20 text-xs font-bold text-edito-navy/50 cursor-not-allowed border border-edito-navy/10 uppercase tracking-wider"
            >
              Lancer l&apos;atelier
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

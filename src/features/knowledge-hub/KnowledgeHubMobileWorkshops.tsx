"use client"

import { useState } from "react"
import { mobileWorkshops } from "./knowledge-hub-mobile-shell-data"
import { WorkshopItem } from "./knowledge-hub.types"
import { KnowledgeHubMobileWorkshopSheet } from "./KnowledgeHubMobileWorkshopSheet"

export function KnowledgeHubMobileWorkshops() {
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopItem | null>(null)
  const [showAll, setShowAll] = useState(false)

  // Only display 4 initially, or all 8 if showAll is true
  const displayedWorkshops = showAll ? mobileWorkshops : mobileWorkshops.slice(0, 4)

  return (
    <div className="space-y-4">
      {/* Intro block — Navy/Gold intelligence style */}
      <div className="rounded-xl border border-edito-border bg-edito-navy text-white p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-edito-gold">
              Ateliers Métiers
            </span>
            <h3 className="text-xs font-bold text-white mt-0.5">Actions Guidées</h3>
          </div>
          <span className="rounded bg-white/10 px-2.5 py-0.5 text-[8px] font-bold text-edito-gold uppercase tracking-wider">
            Mode lecture seule
          </span>
        </div>
        <p className="mt-3 text-[11px] text-white/70 leading-relaxed">
          Processus et workflows facilités par l&apos;intelligence documentaire.
        </p>
      </div>

      {/* Workshop List */}
      <div className="space-y-3">
        {displayedWorkshops.map((workshop) => (
          <button
            key={workshop.id}
            type="button"
            onClick={() => setSelectedWorkshop(workshop)}
            className="w-full min-h-[48px] rounded-xl border border-edito-border bg-edito-surface p-4 text-left active:bg-edito-chip transition-colors outline-none cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded bg-edito-navy/5 text-xs text-edito-navy">
                  {workshop.icon === "RFP" && "📄"}
                  {workshop.icon === "REX" && "📌"}
                  {workshop.icon === "CALC" && "⚖️"}
                  {workshop.icon === "DOC" && "🎨"}
                  {workshop.icon === "CRM" && "🏢"}
                  {workshop.icon === "MEET" && "👥"}
                  {workshop.icon === "EXIT" && "🔄"}
                  {workshop.icon === "LAW" && "🛡️"}
                </span>
                <span className="text-xs font-bold text-edito-navy">{workshop.title}</span>
              </div>
              <span className="rounded bg-edito-brass/10 px-1.5 py-0.5 text-[8px] font-bold text-edito-brass uppercase tracking-wider shrink-0">
                {workshop.status}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-edito-body line-clamp-2">
              {workshop.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1 border-t border-edito-border/50 pt-2">
              {workshop.mobilizedKnowledge.map((fam) => (
                <span
                  key={fam}
                  className="rounded bg-edito-chip px-1.5 py-0.5 text-[8px] font-semibold text-edito-muted"
                >
                  {fam}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Toggle button: Show All */}
      {!showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-edito-border bg-edito-surface text-xs font-bold text-edito-navy hover:bg-edito-chip transition-colors outline-none cursor-pointer"
        >
          Voir tous les ateliers ({mobileWorkshops.length})
        </button>
      )}

      {/* Detail Dialog Sheet */}
      {selectedWorkshop && (
        <KnowledgeHubMobileWorkshopSheet
          workshop={selectedWorkshop}
          onClose={() => setSelectedWorkshop(null)}
        />
      )}
    </div>
  )
}

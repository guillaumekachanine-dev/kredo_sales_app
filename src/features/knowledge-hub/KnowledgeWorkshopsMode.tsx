"use client"

import { useState } from "react"
import { workshops } from "./knowledge-hub-shell-data"
import { WorkshopItem } from "./knowledge-hub.types"

// ──────────────────────────────────────────────────────────────────────
//  DESKTOP VIEW FOR WORKSHOPS MODE
// ──────────────────────────────────────────────────────────────────────

interface WorkshopsModeProps {
  selectedWorkshop: WorkshopItem | null
  onSelectWorkshop: (workshop: WorkshopItem | null) => void
}

export function KnowledgeWorkshopsModeDesktop({
  selectedWorkshop,
  onSelectWorkshop,
}: WorkshopsModeProps) {
  return (
    <div className="space-y-6">
      {/* Introduction Banner - Navy/Gold intelligence style */}
      <div className="rounded-xl border border-edito-border bg-edito-navy text-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-edito-gold">
              Ateliers Métiers
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">Processus Décisionnels</h2>
            <p className="mt-1 text-xs text-white/70">
              Actions métiers intelligentes et processus décisionnels alimentés par le Knowledge Hub.
            </p>
          </div>
          <span className="rounded bg-white/10 px-2.5 py-0.5 text-[9px] font-bold text-edito-gold uppercase tracking-wider">
            Mode lecture seule
          </span>
        </div>
      </div>

      {/* Grid Layout (8 Workshops) - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {workshops.map((workshop) => {
          const isSelected = selectedWorkshop?.id === workshop.id
          return (
            <button
              key={workshop.id}
              type="button"
              onClick={() => onSelectWorkshop(isSelected ? null : workshop)}
              className={`w-full rounded-lg border text-left bg-edito-surface p-5 transition-all outline-none ${
                isSelected
                  ? "border-edito-brass ring-1 ring-edito-brass"
                  : "border-edito-border hover:border-edito-muted"
              }`}
            >
              <div className="flex items-start">
                <h3 className="text-sm font-bold text-edito-navy">{workshop.title}</h3>
              </div>
              
              <p className="mt-3 text-xs leading-relaxed text-edito-body">
                {workshop.description}
              </p>

              <div className="mt-4 border-t border-edito-border pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-edito-muted block">
                  Connaissances mobilisées :
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
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
//  MOBILE VIEW FOR WORKSHOPS MODE
// ──────────────────────────────────────────────────────────────────────

export function KnowledgeWorkshopsModeMobile() {
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopItem | null>(null)

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="rounded-xl border border-edito-border bg-edito-surface p-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-edito-brass">
          Ateliers Métiers
        </span>
        <p className="mt-1 text-xs text-edito-body">
          Processus décisionnels augmentés par les connaissances.
        </p>
      </div>

      {/* List */}
      <div className="space-y-3">
        {workshops.map((workshop) => (
          <button
            key={workshop.id}
            type="button"
            onClick={() => setSelectedWorkshop(workshop)}
            className="w-full min-h-[48px] rounded-xl border border-edito-border bg-edito-surface p-4 text-left active:bg-edito-chip transition-colors outline-none"
          >
            <div className="flex items-start">
              <span className="text-xs font-bold text-edito-navy">{workshop.title}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-edito-body line-clamp-2">
              {workshop.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
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

      {/* Mobile Drawer (Bottom Sheet) */}
      {selectedWorkshop && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-t-2xl border border-edito-border bg-edito-surface p-5 animate-slide-up">
            <div className="flex items-start justify-between border-b border-edito-border pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedWorkshop.icon}</span>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">
                    Détail de l&apos;atelier
                  </span>
                  <h4 className="text-sm font-bold text-edito-navy">{selectedWorkshop.title}</h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkshop(null)}
                className="flex size-7 items-center justify-center rounded-full bg-edito-chip text-edito-navy font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
                  Objectif de l&apos;atelier
                </span>
                <p className="mt-1 text-xs leading-relaxed text-edito-body">
                  {selectedWorkshop.description}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
                  Flux de données futures
                </span>
                <p className="mt-1 text-xs leading-relaxed text-edito-body">
                  Cet atelier mobilisera automatiquement les fiches d&apos;expertise, les retours d&apos;expérience et les données des comptes pour assister la décision en temps réel.
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
                  Connaissances ciblées
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {selectedWorkshop.mobilizedKnowledge.map((fam) => (
                    <span
                      key={fam}
                      className="rounded bg-edito-chip px-2 py-0.5 text-[9px] font-semibold text-edito-muted"
                    >
                      {fam}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-edito-border pt-4">
                <div className="flex items-center justify-between rounded bg-edito-brass/10 px-3 py-2 border border-edito-brass/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-edito-brass">
                    Statut
                  </span>
                  <span className="rounded bg-edito-brass px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                    {selectedWorkshop.status}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWorkshop(null)}
                className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-edito-navy text-xs font-bold text-white transition-colors hover:bg-edito-navy/90"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

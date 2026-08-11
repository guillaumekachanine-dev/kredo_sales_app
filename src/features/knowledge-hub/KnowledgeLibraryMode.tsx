"use client"

import { useState } from "react"
import { domains } from "./knowledge-hub-shell-data"
import { DomainItem } from "./knowledge-hub.types"
import { KnowledgeHubCategoryIcon } from "./KnowledgeHubCategoryIcon"

// ──────────────────────────────────────────────────────────────────────
//  DESKTOP VIEW FOR LIBRARY MODE
// ──────────────────────────────────────────────────────────────────────

interface LibraryModeProps {
  selectedDomain: DomainItem | null
  onSelectDomain: (domain: DomainItem | null) => void
}

export function KnowledgeLibraryModeDesktop({
  selectedDomain,
  onSelectDomain,
}: LibraryModeProps) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-6">
      {/* Editorial Header - Navy/Gold intelligence style */}
      <div className="rounded-xl border border-edito-border bg-edito-navy text-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-edito-gold">
              Bibliothèque Fédérée
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">Patrimoine de Connaissances</h2>
            <p className="mt-1 text-xs text-white/70">
              Accès unifié au patrimoine de connaissances KREDO et cartographie des relations.
            </p>
          </div>
          <span className="rounded bg-white/10 px-2.5 py-0.5 text-[9px] font-bold text-edito-gold uppercase tracking-wider shrink-0">
            Socle en construction
          </span>
        </div>

        {/* Visual Search Bar - Disabled */}
        <div className="mt-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-edito-muted">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              disabled
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans la bibliothèque fédérée... (Recherche inactive pendant la construction)"
              className="h-10 w-full rounded-md border border-white/20 bg-white pl-9 pr-4 text-sm text-edito-body placeholder:text-edito-muted cursor-not-allowed opacity-80 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Grid Layout (6 Domains) - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {domains.map((domain) => {
          const isSelected = selectedDomain?.id === domain.id
          return (
            <button
              key={domain.id}
              type="button"
              onClick={() => onSelectDomain(isSelected ? null : domain)}
              className={`group w-full rounded-lg border text-left bg-edito-surface p-5 transition-all outline-none ${
                isSelected
                  ? "border-edito-brass ring-1 ring-edito-brass"
                  : "border-edito-border hover:border-edito-brass/60 hover:bg-edito-canvas/35"
              }`}
            >
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold text-edito-navy">{domain.title}</h3>
                <KnowledgeHubCategoryIcon domainId={domain.id} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-edito-body">{domain.description}</p>
              
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-edito-border pt-3">
                {domain.subItems.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded bg-edito-chip px-2 py-0.5 text-[9px] font-medium text-edito-muted"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
//  MOBILE VIEW FOR LIBRARY MODE
// ──────────────────────────────────────────────────────────────────────

export function KnowledgeLibraryModeMobile() {
  const [selectedDomain, setSelectedDomain] = useState<DomainItem | null>(null)

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="rounded-xl border border-edito-border bg-edito-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-edito-brass">
            Bibliothèque Fédérée
          </span>
          <span className="rounded-full bg-edito-navy/5 px-2 py-0.5 text-[9px] font-semibold text-edito-navy">
            Socle en construction
          </span>
        </div>
        <p className="mt-1 text-xs text-edito-body">
          Structure documentaire et atlas relationnel.
        </p>

        {/* Search Input Visual */}
        <div className="mt-3 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-edito-muted">
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            disabled
            placeholder="Rechercher... (Recherche inactive)"
            className="h-9 w-full rounded-md border border-edito-border bg-edito-canvas pl-8 pr-3 text-xs text-edito-body cursor-not-allowed opacity-80"
          />
        </div>
      </div>

      {/* List of Cards */}
      <div className="space-y-3">
        {domains.map((domain) => (
          <button
            key={domain.id}
            type="button"
            onClick={() => setSelectedDomain(domain)}
            className="w-full min-h-[48px] rounded-xl border border-edito-border bg-edito-surface p-4 text-left active:bg-edito-chip transition-colors outline-none"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-edito-navy">{domain.title}</span>
              <span className="text-xs text-edito-brass">→</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-edito-body line-clamp-2">
              {domain.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {domain.subItems.slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="rounded bg-edito-chip px-1.5 py-0.5 text-[8px] font-semibold text-edito-muted"
                >
                  {item}
                </span>
              ))}
              {domain.subItems.length > 3 && (
                <span className="text-[8px] font-semibold text-edito-muted pt-0.5">
                  +{domain.subItems.length - 3}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Mobile Drawer (Bottom Sheet) using standard HTML structure */}
      {selectedDomain && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-t-2xl border border-edito-border bg-edito-surface p-5 animate-slide-up">
            <div className="flex items-start justify-between border-b border-edito-border pb-3">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-edito-muted">
                  Détail du domaine
                </span>
                <h4 className="text-sm font-bold text-edito-navy">{selectedDomain.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDomain(null)}
                className="flex size-7 items-center justify-center rounded-full bg-edito-chip text-edito-navy font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
                  Nature des contenus futurs
                </span>
                <p className="mt-1 text-xs leading-relaxed text-edito-body">
                  {selectedDomain.nature}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
                  Relations prévues
                </span>
                <ul className="mt-1.5 space-y-1">
                  {selectedDomain.relations.map((rel) => (
                    <li key={rel} className="flex items-center gap-2 text-xs text-edito-body">
                      <span className="inline-block size-1.5 rounded-full bg-edito-brass" />
                      <span>{rel}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-edito-border pt-4">
                <div className="flex items-center justify-between rounded bg-edito-brass/10 px-3 py-2 border border-edito-brass/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-edito-brass">
                    Statut du domaine
                  </span>
                  <span className="rounded bg-edito-brass px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                    Contenus à connecter
                  </span>
                </div>
              </div>

              {/* Close Touch Target */}
              <button
                type="button"
                onClick={() => setSelectedDomain(null)}
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

"use client"

import { useState } from "react"
import { mobileDomains } from "./knowledge-hub-mobile-shell-data"
import { DomainItem } from "./knowledge-hub.types"
import { KnowledgeHubMobileDomainSheet } from "./KnowledgeHubMobileDomainSheet"

interface MobileExplorerProps {
  onSelectExpertise: () => void
}

export function KnowledgeHubMobileExplorer({ onSelectExpertise }: MobileExplorerProps) {
  const [selectedDomain, setSelectedDomain] = useState<DomainItem | null>(null)

  const handleDomainClick = (domain: DomainItem) => {
    if (domain.id === "expertise-kredo") {
      onSelectExpertise()
    } else {
      setSelectedDomain(domain)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Intro — Navy/Gold intelligence style */}
      <div className="rounded-xl border border-edito-border bg-edito-navy text-white p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-edito-gold">
              Bibliothèque Fédérée
            </span>
            <h3 className="text-xs font-bold text-white mt-0.5">Explorer le Patrimoine</h3>
          </div>
          <span className="rounded bg-white/10 px-2.5 py-0.5 text-[8px] font-bold text-edito-gold uppercase tracking-wider">
            Socle en construction
          </span>
        </div>
        <p className="mt-3 text-[11px] text-white/70 leading-relaxed">
          Accédez aux structures de connaissances capitalisées de KREDO.
        </p>

        {/* Visual Search Bar */}
        <div className="mt-3 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-white/40">
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            disabled
            placeholder="Rechercher dans l'atlas... (Recherche inactive)"
            className="h-9 w-full rounded-md border border-white/20 bg-white/5 pl-8 pr-3 text-xs text-white placeholder:text-white/40 cursor-not-allowed opacity-80"
          />
        </div>
      </div>

      {/* 2-Column Domain Grid */}
      <div className="grid grid-cols-2 gap-3">
        {mobileDomains.map((domain) => (
          <button
            key={domain.id}
            type="button"
            onClick={() => handleDomainClick(domain)}
            className="flex flex-col justify-between min-h-[140px] rounded-xl border border-edito-border bg-edito-surface p-4 text-left active:bg-edito-chip transition-colors outline-none cursor-pointer"
          >
            <div>
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-bold text-edito-navy leading-snug line-clamp-2">
                  {domain.title}
                </span>
                <span className="text-edito-brass text-xs font-bold shrink-0">→</span>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-edito-muted line-clamp-3">
                {domain.description}
              </p>
            </div>

            {/* Sub items inline preview */}
            <div className="mt-3 flex flex-wrap gap-1 border-t border-edito-border/50 pt-2">
              {domain.subItems.slice(0, 2).map((item) => (
                <span
                  key={item}
                  className="rounded bg-edito-chip px-1 py-0.5 text-[8px] font-semibold text-edito-muted whitespace-nowrap"
                >
                  {item}
                </span>
              ))}
              {domain.subItems.length > 2 && (
                <span className="text-[8px] font-bold text-edito-muted pt-0.5">
                  +{domain.subItems.length - 2}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Details Dialog Sheet */}
      {selectedDomain && (
        <KnowledgeHubMobileDomainSheet
          domain={selectedDomain}
          onClose={() => setSelectedDomain(null)}
        />
      )}
    </div>
  )
}

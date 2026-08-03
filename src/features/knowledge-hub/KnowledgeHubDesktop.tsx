"use client"

import { useState } from "react"
import { KnowledgeHubMode, DomainItem, WorkshopItem } from "./knowledge-hub.types"
import { KnowledgeHubModeNavigation } from "./KnowledgeHubModeNavigation"
import { KnowledgeLibraryModeDesktop } from "./KnowledgeLibraryMode"
import { KnowledgeWorkshopsModeDesktop } from "./KnowledgeWorkshopsMode"
import { KnowledgeAskMode } from "./KnowledgeAskMode"
import { KredoExpertiseSnapshot } from "./expertise/kredo-expertise.types"
import { KredoExpertiseDesktop } from "./expertise/KredoExpertiseDesktop"

interface KnowledgeHubDesktopProps {
  snapshot: KredoExpertiseSnapshot
}

export function KnowledgeHubDesktop({ snapshot }: KnowledgeHubDesktopProps) {
  const [activeMode, setActiveMode] = useState<KnowledgeHubMode>("library")
  const [selectedDomain, setSelectedDomain] = useState<DomainItem | null>(null)
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopItem | null>(null)
  const [showExpertise, setShowExpertise] = useState(false)

  const handleModeChange = (mode: KnowledgeHubMode) => {
    setActiveMode(mode)
    setSelectedDomain(null)
    setSelectedWorkshop(null)
    setShowExpertise(false)
  }

  const handleSelectDomain = (domain: DomainItem | null) => {
    if (domain?.id === "expertise-kredo") {
      setShowExpertise(true)
    } else {
      setSelectedDomain(domain)
    }
  }

  // Determine if a details panel should be visible
  const showSidebar = (activeMode === "library" && !showExpertise) || activeMode === "workshops"

  return (
    <div className="min-h-screen bg-edito-canvas text-edito-body font-sans">
      {/* Top Main Navigation Bar (horizontal) */}
      <KnowledgeHubModeNavigation activeMode={activeMode} onChangeMode={handleModeChange} />

      {/* Main Page Layout */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className={`grid grid-cols-1 ${showSidebar ? "lg:grid-cols-[1fr_280px]" : ""} gap-6`}>
          {/* Main Content Area */}
          <div className="space-y-6 min-w-0">
            {activeMode === "library" && (
              showExpertise ? (
                <KredoExpertiseDesktop
                  snapshot={snapshot}
                  onBack={() => {
                    setShowExpertise(false)
                    setSelectedDomain(null)
                  }}
                />
              ) : (
                <KnowledgeLibraryModeDesktop
                  selectedDomain={selectedDomain}
                  onSelectDomain={handleSelectDomain}
                />
              )
            )}
            {activeMode === "workshops" && (
              <KnowledgeWorkshopsModeDesktop
                selectedWorkshop={selectedWorkshop}
                onSelectWorkshop={setSelectedWorkshop}
              />
            )}
            {activeMode === "ask" && <KnowledgeAskMode />}
          </div>

          {/* Context/Detail Sidebar Panel */}
          {showSidebar && (
            <aside className="lg:block">
              {activeMode === "library" && (
                <div className="sticky top-6 rounded-xl border border-edito-border bg-edito-surface p-5 h-fit space-y-5">
                  <div className="border-b border-edito-border pb-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-edito-muted block">
                      Spécifications de la Fiche
                    </span>
                    <h3 className="text-sm font-bold text-edito-navy mt-0.5">
                      {selectedDomain ? selectedDomain.title : "Sélectionner un Domaine"}
                    </h3>
                  </div>

                  {selectedDomain ? (
                    <div className="space-y-5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block">
                          Nature des contenus futurs
                        </span>
                        <p className="mt-1 text-edito-body leading-relaxed">
                          {selectedDomain.nature}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block">
                          Relations prévues
                        </span>
                        <ul className="mt-1.5 space-y-1.5">
                          {selectedDomain.relations.map((rel) => (
                            <li key={rel} className="flex items-start gap-2">
                              <span className="inline-block size-1.5 rounded-full bg-edito-brass mt-1.5 shrink-0" />
                              <span className="text-edito-body leading-relaxed">{rel}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="border-t border-edito-border pt-4">
                        <div className="rounded bg-edito-brass/15 p-3 border border-edito-brass/25">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-edito-brass block">
                            Statut de connexion
                          </span>
                          <span className="text-[11px] font-bold text-edito-navy block mt-1 uppercase tracking-wide">
                            Contenus à connecter
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-edito-muted">
                      <p>Cliquez sur l&apos;un des 6 domaines pour analyser sa nature et ses relations futures.</p>
                    </div>
                  )}
                </div>
              )}

              {activeMode === "workshops" && (
                <div className="sticky top-6 rounded-xl border border-edito-border bg-edito-surface p-5 h-fit space-y-5">
                  <div className="border-b border-edito-border pb-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-edito-muted block">
                      Spécifications de l&apos;Atelier
                    </span>
                    <h3 className="text-sm font-bold text-edito-navy mt-0.5">
                      {selectedWorkshop ? selectedWorkshop.title : "Sélectionner un Atelier"}
                    </h3>
                  </div>

                  {selectedWorkshop ? (
                    <div className="space-y-5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block">
                          Objectif opérationnel
                        </span>
                        <p className="mt-1 text-edito-body leading-relaxed">
                          {selectedWorkshop.description}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block">
                          Flux de données futures
                        </span>
                        <p className="mt-1 text-edito-body leading-relaxed">
                          Cet atelier mobilisera automatiquement les fiches d&apos;expertise, les retours d&apos;expérience et les données des comptes pour assister la décision en temps réel.
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block">
                          Familles de connaissances
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {selectedWorkshop.mobilizedKnowledge.map((fam) => (
                            <span
                              key={fam}
                              className="inline-flex items-center rounded bg-edito-chip px-2 py-0.5 text-[9px] font-medium text-edito-muted"
                            >
                              {fam}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-edito-border pt-4">
                        <div className="rounded bg-edito-brass/15 p-3 border border-edito-brass/25">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-edito-brass block">
                            Statut de l&apos;atelier
                          </span>
                          <span className="text-[11px] font-bold text-edito-navy block mt-1 uppercase tracking-wide">
                            {selectedWorkshop.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-edito-muted">
                      <p>Cliquez sur un atelier de la grille pour afficher les spécifications de flux.</p>
                    </div>
                  )}
                </div>
              )}
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}

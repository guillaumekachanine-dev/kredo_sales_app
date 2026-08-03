"use client"

import { useState } from "react"
import { KnowledgeHubMode } from "./knowledge-hub.types"
import { KnowledgeHubMobileModeTabs } from "./KnowledgeHubMobileModeTabs"
import { KnowledgeHubMobileExplorer } from "./KnowledgeHubMobileExplorer"
import { KnowledgeHubMobileWorkshops } from "./KnowledgeHubMobileWorkshops"
import { KnowledgeHubMobileAsk } from "./KnowledgeHubMobileAsk"
import { KredoExpertiseSnapshot } from "./expertise/kredo-expertise.types"
import { KredoExpertiseMobile } from "./expertise/KredoExpertiseMobile"

interface KnowledgeHubMobileProps {
  snapshot: KredoExpertiseSnapshot
}

export function KnowledgeHubMobile({ snapshot }: KnowledgeHubMobileProps) {
  const [activeMode, setActiveMode] = useState<KnowledgeHubMode>("library")
  const [showExpertise, setShowExpertise] = useState(false)

  const handleModeChange = (mode: KnowledgeHubMode) => {
    setActiveMode(mode)
    setShowExpertise(false)
  }

  if (showExpertise && activeMode === "library") {
    return (
      <KredoExpertiseMobile
        snapshot={snapshot}
        onBack={() => setShowExpertise(false)}
      />
    )
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-edito-canvas pb-16 text-edito-body font-sans">
      {/* Mobile Title Header */}
      <header className="bg-edito-surface px-4 pt-5 pb-3 border-b border-edito-border/50">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-edito-navy">
            Knowledge Hub
          </h1>
          <span className="rounded bg-edito-brass/10 px-2 py-0.5 text-[9px] font-bold text-edito-brass uppercase tracking-wider">
            Socle en construction
          </span>
        </div>
        <p className="mt-1 text-[10px] text-edito-muted font-medium">
          Accès mobile au patrimoine de connaissances KREDO
        </p>
      </header>

      {/* Sticky Mode Tabs */}
      <KnowledgeHubMobileModeTabs activeMode={activeMode} onChangeMode={handleModeChange} />

      {/* Main Mode View Container */}
      <main className="px-4 py-4 space-y-4">
        {activeMode === "library" && (
          <KnowledgeHubMobileExplorer onSelectExpertise={() => setShowExpertise(true)} />
        )}
        {activeMode === "workshops" && <KnowledgeHubMobileWorkshops />}
        {activeMode === "ask" && <KnowledgeHubMobileAsk />}
      </main>
    </div>
  )
}

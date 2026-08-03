"use client"

import { useState } from "react"
import { KnowledgeHubMode, DomainItem, WorkshopItem } from "./knowledge-hub.types"
import { KnowledgeHubModeNavigation } from "./KnowledgeHubModeNavigation"
import { KnowledgeLibraryModeDesktop } from "./KnowledgeLibraryMode"
import { KnowledgeWorkshopsModeDesktop } from "./KnowledgeWorkshopsMode"
import { KnowledgeAskMode } from "./KnowledgeAskMode"
import { KredoExpertiseSnapshot } from "./expertise/kredo-expertise.types"
import { KredoExpertiseDesktop } from "./expertise/KredoExpertiseDesktop"
import { TalentKnowledgeDesktop } from "./talents/TalentKnowledgeDesktop"
import { TalentKnowledgeSnapshot } from "./talents/talent-knowledge.types"

interface KnowledgeHubDesktopProps {
  snapshot: KredoExpertiseSnapshot
  talentSnapshot: TalentKnowledgeSnapshot
}

export function KnowledgeHubDesktop({ snapshot, talentSnapshot }: KnowledgeHubDesktopProps) {
  const [activeMode, setActiveMode] = useState<KnowledgeHubMode>("library")
  const [selectedDomain, setSelectedDomain] = useState<DomainItem | null>(null)
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopItem | null>(null)
  const [showExpertise, setShowExpertise] = useState(false)
  const [showTalents, setShowTalents] = useState(false)

  const handleModeChange = (mode: KnowledgeHubMode) => {
    setActiveMode(mode)
    setSelectedDomain(null)
    setSelectedWorkshop(null)
    setShowExpertise(false)
    setShowTalents(false)
  }

  const handleSelectDomain = (domain: DomainItem | null) => {
    if (domain?.id === "expertise-kredo") {
      setShowExpertise(true)
      setShowTalents(false)
    } else if (domain?.id === "talents") {
      setShowTalents(true)
      setShowExpertise(false)
    } else {
      setSelectedDomain(domain)
    }
  }

  return (
    <div className="min-h-screen bg-edito-canvas text-edito-body font-sans">
      {/* Top Main Navigation Bar (horizontal) */}
      <KnowledgeHubModeNavigation activeMode={activeMode} onChangeMode={handleModeChange} />

      {/* Main Page Layout */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="space-y-6 min-w-0">
          {activeMode === "library" && (
            showTalents ? (
              <TalentKnowledgeDesktop
                snapshot={talentSnapshot}
                onBack={() => {
                  setShowTalents(false)
                  setSelectedDomain(null)
                }}
              />
            ) : showExpertise ? (
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
      </main>
    </div>
  )
}

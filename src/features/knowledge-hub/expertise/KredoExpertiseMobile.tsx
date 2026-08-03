"use client"

import { useState } from "react"
import { KredoExpertiseSnapshot } from "./kredo-expertise.types"
import { KredoExpertiseNavigation, ExpertiseTab } from "./KredoExpertiseNavigation"
import { KredoPracticesView } from "./KredoPracticesView"
import { KredoJobsView } from "./KredoJobsView"
import { KredoSkillsView } from "./KredoSkillsView"
import { KredoTechnologiesView } from "./KredoTechnologiesView"

interface KredoExpertiseMobileProps {
  snapshot: KredoExpertiseSnapshot
  onBack: () => void
}

export function KredoExpertiseMobile({
  snapshot,
  onBack,
}: KredoExpertiseMobileProps) {
  const [activeTab, setActiveTab] = useState<ExpertiseTab>("practices")

  const handleTabChange = (tab: ExpertiseTab) => {
    setActiveTab(tab)
  }

  const counts = {
    practices: snapshot.practices.length,
    jobs: snapshot.jobs.length,
    skills: snapshot.skills.length,
    techs: snapshot.technologies.length,
  }

  return (
    <div className="min-h-screen bg-edito-canvas pb-20 text-edito-body font-sans">
      {/* Mobile Title & Back Header */}
      <header className="sticky top-0 z-30 bg-edito-surface border-b border-edito-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[44px] items-center text-xs font-bold text-edito-brass outline-none"
        >
          ← Retour aux domaines
        </button>
        <h2 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
          Expertise KREDO
        </h2>
        {/* Empty placeholder for symmetrical spacing */}
        <div className="w-12" />
      </header>

      {/* Sticky Tab switcher sub-navigation */}
      <div className="sticky top-[53px] z-20">
        <KredoExpertiseNavigation
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          counts={counts}
        />
      </div>

      {/* Mobile content tab view */}
      <main className="px-4 py-4">
        {activeTab === "practices" && (
          <KredoPracticesView
            practices={snapshot.practices}
            jobs={snapshot.jobs}
            onSelectPractice={() => {}}
            isMobile
          />
        )}

        {activeTab === "jobs" && (
          <KredoJobsView
            jobs={snapshot.jobs}
            practices={snapshot.practices}
            skills={snapshot.skills}
          />
        )}

        {activeTab === "skills" && (
          <KredoSkillsView
            skills={snapshot.skills}
          />
        )}

        {activeTab === "techs" && (
          <KredoTechnologiesView
            technologies={snapshot.technologies}
            practices={snapshot.practices}
            isMobile
          />
        )}
      </main>
    </div>
  )
}

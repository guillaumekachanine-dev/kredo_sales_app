"use client"

import { useState } from "react"
import { KredoExpertiseSnapshot } from "./kredo-expertise.types"
import { KredoExpertiseNavigation, ExpertiseTab } from "./KredoExpertiseNavigation"
import { KredoPracticesView } from "./KredoPracticesView"
import { KredoJobsView } from "./KredoJobsView"
import { KredoSkillsView } from "./KredoSkillsView"
import { KredoTechnologiesView } from "./KredoTechnologiesView"

interface KredoExpertiseDesktopProps {
  snapshot: KredoExpertiseSnapshot
  onBack: () => void
}

export function KredoExpertiseDesktop({
  snapshot,
  onBack,
}: KredoExpertiseDesktopProps) {
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
    <div className="space-y-4">
      {/* Title & Back Button */}
      <div className="border-b border-edito-border/50 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-7 items-center justify-center rounded-md border border-edito-border bg-edito-surface px-2.5 text-[10px] font-bold text-edito-navy hover:bg-edito-chip transition-colors outline-none cursor-pointer mb-2"
        >
          ← Retour aux domaines
        </button>
        <h2 className="text-xl font-bold tracking-tight text-edito-navy">
          Expertise KREDO
        </h2>
      </div>

      {/* Tab Switcher with inline counts */}
      <KredoExpertiseNavigation
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        counts={counts}
      />

      {/* Layout Split: Main view on full width */}
      <div className="min-w-0">
        {activeTab === "practices" && (
          <KredoPracticesView
            practices={snapshot.practices}
            jobs={snapshot.jobs}
            onSelectPractice={() => {}}
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
          />
        )}
      </div>
    </div>
  )
}

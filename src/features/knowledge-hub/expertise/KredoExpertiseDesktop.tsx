"use client"

import { KredoExpertiseSnapshot } from "./kredo-expertise.types"
import { ExpertiseTab } from "./KredoExpertiseNavigation"
import { KredoPracticesView } from "./KredoPracticesView"
import { KredoJobsView } from "./KredoJobsView"
import { KredoSkillsView } from "./KredoSkillsView"
import { KredoTechnologiesView } from "./KredoTechnologiesView"

interface KredoExpertiseDesktopProps {
  snapshot: KredoExpertiseSnapshot
  activeSection?: ExpertiseTab
}

export function KredoExpertiseDesktop({
  snapshot,
  activeSection = "practices",
}: KredoExpertiseDesktopProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="border-b border-edito-border/50 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-edito-navy">
          Expertise KREDO
        </h2>
      </div>

      {/* Layout Split: Main view on full width */}
      <div className="min-w-0">
        {activeSection === "practices" && (
          <KredoPracticesView
            practices={snapshot.practices}
            jobs={snapshot.jobs}
            onSelectPractice={() => {}}
          />
        )}

        {activeSection === "jobs" && (
          <KredoJobsView
            jobs={snapshot.jobs}
            practices={snapshot.practices}
            skills={snapshot.skills}
          />
        )}

        {activeSection === "skills" && (
          <KredoSkillsView
            skills={snapshot.skills}
          />
        )}

        {activeSection === "techs" && (
          <KredoTechnologiesView
            technologies={snapshot.technologies}
            practices={snapshot.practices}
          />
        )}
      </div>
    </div>
  )
}

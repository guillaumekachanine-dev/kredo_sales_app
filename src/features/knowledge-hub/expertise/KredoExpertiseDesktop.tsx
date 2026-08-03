"use client"

import { useState } from "react"
import { KredoExpertiseSnapshot, PracticeItem } from "./kredo-expertise.types"
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
  const [selectedPractice, setSelectedPractice] = useState<PracticeItem | null>(null)

  const handleTabChange = (tab: ExpertiseTab) => {
    setActiveTab(tab)
    setSelectedPractice(null) // Reset selection when switching tabs
  }

  // Determine if details sidebar is shown
  const showSidebar = activeTab === "practices" && selectedPractice !== null

  return (
    <div className="space-y-6">
      {/* Title & Back Button */}
      <div className="flex items-center justify-between border-b border-edito-border/50 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
            Bibliothèque / Référentiel
          </span>
          <h2 className="text-xl font-bold tracking-tight text-edito-navy mt-0.5">
            Expertise KREDO
          </h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[36px] items-center justify-center rounded-lg border border-edito-border bg-edito-surface px-4 py-2 text-xs font-bold text-edito-navy hover:bg-edito-chip transition-colors outline-none cursor-pointer"
        >
          ← Retour aux domaines
        </button>
      </div>

      {/* KPI Counters Strip */}
      <div className="grid grid-cols-4 gap-4 bg-edito-surface rounded-xl border border-edito-border p-4 shadow-sm">
        {[
          { label: "Practices", count: snapshot.practices.length },
          { label: "Métiers", count: snapshot.jobs.length },
          { label: "Compétences", count: snapshot.skills.length },
          { label: "Technologies", count: snapshot.technologies.length },
        ].map((kpi) => (
          <div key={kpi.label} className="text-center">
            <span className="block text-lg font-bold text-edito-navy">{kpi.count}</span>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-edito-muted mt-0.5">
              {kpi.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <KredoExpertiseNavigation activeTab={activeTab} onChangeTab={handleTabChange} />

      {/* Layout Split: Main view vs Sidebar */}
      <div className={`grid grid-cols-1 ${showSidebar ? "lg:grid-cols-[1fr_300px]" : ""} gap-6`}>
        <div className="min-w-0">
          {activeTab === "practices" && (
            <KredoPracticesView
              practices={snapshot.practices}
              selectedPractice={selectedPractice}
              onSelectPractice={setSelectedPractice}
            />
          )}

          {activeTab === "jobs" && (
            <KredoJobsView
              jobs={snapshot.jobs}
              practices={snapshot.practices}
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

        {/* Sidebar Panel for selected practice (Tab A only) */}
        {showSidebar && selectedPractice && (
          <aside className="lg:block">
            <div className="sticky top-6 rounded-xl border border-edito-border bg-edito-surface p-5 space-y-5">
              <div className="flex items-start justify-between border-b border-edito-border pb-3">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-edito-muted block">
                    Détails de la Practice
                  </span>
                  <h3 className="text-sm font-bold text-edito-navy mt-0.5">
                    {selectedPractice.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPractice(null)}
                  className="flex size-7 items-center justify-center rounded-full bg-edito-chip text-edito-navy font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block">
                    Description / Promesse
                  </span>
                  <p className="mt-1 text-edito-body leading-relaxed">
                    {selectedPractice.description}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block">
                    Périmètre complet
                  </span>
                  <p className="mt-1 text-edito-body leading-relaxed">
                    {selectedPractice.perimeter}
                  </p>
                </div>

                {/* Métiers rattachés */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block mb-1.5">
                    Métiers rattachés ({selectedPractice.jobCount})
                  </span>
                  <ul className="space-y-1 pl-1">
                    {snapshot.jobs
                      .filter((j) => j.practiceId === selectedPractice.id)
                      .map((job) => (
                        <li key={job.id} className="flex items-center gap-2 text-edito-body">
                          <span className="inline-block size-1.5 rounded-full bg-edito-brass shrink-0" />
                          <span>{job.title}</span>
                        </li>
                      ))}
                  </ul>
                </div>

                {/* Technologies principales */}
                {selectedPractice.stackTags.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block mb-1.5">
                      Technologies principales
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedPractice.stackTags.map((tech) => (
                        <span
                          key={tech}
                          className="inline-flex items-center rounded bg-edito-chip px-2 py-0.5 text-[9px] font-medium text-edito-muted"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

"use client"

export type ExpertiseTab = "practices" | "jobs" | "skills" | "techs"

interface KredoExpertiseNavigationProps {
  activeTab: ExpertiseTab
  onChangeTab: (tab: ExpertiseTab) => void
  counts?: {
    practices?: number
    jobs?: number
    skills?: number
    techs?: number
  }
}

export function KredoExpertiseNavigation({
  activeTab,
  onChangeTab,
  counts,
}: KredoExpertiseNavigationProps) {
  const tabs: { id: ExpertiseTab; label: string; count?: number }[] = [
    { id: "practices", label: "Practices", count: counts?.practices },
    { id: "jobs", label: "Métiers", count: counts?.jobs },
    { id: "skills", label: "Compétences", count: counts?.skills },
    { id: "techs", label: "Technologies", count: counts?.techs },
  ]

  return (
    <div className="flex border-b border-edito-border/60 bg-edito-surface rounded-t-xl overflow-x-auto scrollbar-none">
      <nav className="flex gap-1" aria-label="Onglets d'Expertise KREDO">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative min-h-[40px] px-4 text-xs font-bold uppercase tracking-wider transition-colors outline-none cursor-pointer whitespace-nowrap ${
                isActive
                  ? "text-edito-navy after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-edito-brass"
                  : "text-edito-muted hover:text-edito-body"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="ml-1.5 font-semibold text-edito-brass">
                  ({tab.count})
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

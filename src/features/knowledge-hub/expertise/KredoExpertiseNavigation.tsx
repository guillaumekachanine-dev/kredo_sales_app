"use client"

export type ExpertiseTab = "practices" | "jobs" | "skills" | "techs"

interface KredoExpertiseNavigationProps {
  activeTab: ExpertiseTab
  onChangeTab: (tab: ExpertiseTab) => void
}

export function KredoExpertiseNavigation({
  activeTab,
  onChangeTab,
}: KredoExpertiseNavigationProps) {
  const tabs: { id: ExpertiseTab; label: string }[] = [
    { id: "practices", label: "Practices" },
    { id: "jobs", label: "Métiers" },
    { id: "skills", label: "Compétences" },
    { id: "techs", label: "Technologies" },
  ]

  return (
    <div className="flex border-b border-edito-border/60 bg-edito-surface">
      <nav className="flex gap-1" aria-label="Onglets d'Expertise KREDO">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative min-h-[40px] px-4 text-xs font-bold uppercase tracking-wider transition-colors outline-none cursor-pointer ${
                isActive
                  ? "text-edito-navy after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-edito-brass"
                  : "text-edito-muted hover:text-edito-body"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

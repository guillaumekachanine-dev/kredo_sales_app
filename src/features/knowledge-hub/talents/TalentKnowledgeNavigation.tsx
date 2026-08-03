"use client"

import type { TalentTab } from "./talent-knowledge.types"

const tabs: Array<{ id: TalentTab; label: string; mobileLabel: string; icon: string }> = [
  { id: "team", label: "Équipe", mobileLabel: "Équipe", icon: "◉" },
  { id: "alumni", label: "Alumni", mobileLabel: "Alumni", icon: "◌" },
  { id: "candidates", label: "Vivier candidats", mobileLabel: "Vivier", icon: "◇" },
  { id: "skills", label: "Cartographie", mobileLabel: "Compétences", icon: "⌘" },
]

export function TalentKnowledgeNavigation({
  activeTab,
  onChange,
  mobile = false,
}: {
  activeTab: TalentTab
  onChange: (tab: TalentTab) => void
  mobile?: boolean
}) {
  return (
    <nav aria-label="Navigation Talents" className={mobile ? "grid grid-cols-4 border-b border-edito-border" : "flex border-b border-edito-border"}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              "relative inline-flex min-w-0 items-center justify-center gap-1.5 border-b-2 px-2 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass",
              mobile ? "min-h-11 text-[10px]" : "h-10 text-xs",
              isActive ? "border-edito-brass text-edito-navy" : "border-transparent text-edito-muted hover:text-edito-navy",
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
          >
            {!mobile && <span aria-hidden="true" className="text-sm text-edito-brass">{tab.icon}</span>}
            <span className="truncate">{mobile ? tab.mobileLabel : tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

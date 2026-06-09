"use client"

import { cn } from "@/lib/utils"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { SectionTab } from "@/lib/tabs/tab-types"

interface SectionTabBarProps {
  homeLabel?: string
}

function TabEntityIcon({ type }: { type: SectionTab["entityType"] }) {
  if (type === "mission") {
    return (
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  }
  if (type === "opportunite") {
    return (
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    )
  }
  // planning-item
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}

export function SectionTabBar({ homeLabel }: SectionTabBarProps) {
  const { tabs, activeTabId, setActiveTab, closeTab } = useMissionsTabStore()

  return (
    <div className="bg-surface border-b border-border flex items-stretch shrink-0 overflow-x-auto scrollbar-none select-none">
      {/* Home tab */}
      <button
        onClick={() => setActiveTab("home")}
        className={cn(
          "flex items-center gap-1.5 px-4 h-10 text-xs font-medium whitespace-nowrap transition-all duration-150 relative shrink-0 border-r border-border",
          activeTabId === "home"
            ? "text-heading bg-canvas after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
            : "text-muted hover:text-heading hover:bg-canvas/50"
        )}
      >
        <HomeIcon />
        <span>{homeLabel}</span>
      </button>

      {/* Record tabs */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            className={cn(
              "group flex items-center gap-1.5 px-3 h-10 text-xs font-medium whitespace-nowrap transition-all duration-150 relative shrink-0 border-r border-border cursor-pointer",
              isActive
                ? "text-heading bg-canvas after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                : "text-muted hover:text-heading hover:bg-canvas/50"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <TabEntityIcon type={tab.entityType} />
            <span className="max-w-[160px] truncate">{tab.title}</span>
            {tab.subtitle && (
              <span className={cn("text-[10px]", isActive ? "text-muted" : "text-border")}>
                {tab.subtitle}
              </span>
            )}

            {/* Bouton fermeture */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              className={cn(
                "ml-1 rounded p-0.5 transition-all duration-100",
                "opacity-0 group-hover:opacity-100",
                isActive && "opacity-60 hover:opacity-100",
                "hover:bg-border/60 text-muted hover:text-heading"
              )}
              aria-label={`Fermer ${tab.title}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

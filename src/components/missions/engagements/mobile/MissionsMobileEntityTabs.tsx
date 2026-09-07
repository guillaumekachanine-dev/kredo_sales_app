"use client"

import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { cn } from "@/lib/utils"

// Barre d'entités ouvertes — Mobile. Reprend le paradigme de
// CrmMobileAccountTabs (Account Intelligence) sur le store Engagements existant :
// « ← Liste » revient sur home sans fermer les onglets, l'onglet actif est
// souligné, la croix ferme tout. Sticky en tête du détail.

interface MissionsMobileEntityTabsProps {
  onBackToList: () => void
}

export function MissionsMobileEntityTabs({ onBackToList }: MissionsMobileEntityTabsProps) {
  const { tabs, activeTabId, setActiveTab, closeAllTabs } = useMissionsTabStore()

  if (tabs.length === 0) return null

  // Onglet actif + jusqu'à 3 plus récents, ordre d'ouverture conservé.
  let visibleTabs = tabs
  if (tabs.length > 4) {
    const activeTab = tabs.find((t) => t.id === activeTabId)
    const recentOthers = tabs
      .filter((t) => t.id !== activeTabId)
      .slice(-(activeTab ? 3 : 4))
    visibleTabs = tabs.filter(
      (t) => t.id === activeTabId || recentOthers.some((r) => r.id === t.id),
    )
  }

  return (
    <div
      className="flex h-12 w-full select-none items-center border-b border-border bg-surface px-1"
      role="tablist"
      aria-label="Missions et projets ouverts"
    >
      <button
        type="button"
        onClick={onBackToList}
        className="flex h-full shrink-0 items-center justify-center px-2 text-primary transition-opacity active:opacity-70"
        aria-label="Revenir à la liste"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="ml-1 text-[11px] font-bold">Liste</span>
      </button>

      <div className="flex h-full min-w-0 flex-1 items-center">
        {visibleTabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-center px-1 transition-colors active:bg-canvas"
            >
              <span
                className={cn(
                  "w-full truncate px-1 text-center text-[11px]",
                  isActive ? "font-bold text-heading" : "font-medium text-muted",
                )}
              >
                {tab.title}
              </span>
              {isActive && (
                <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-t-sm bg-brand-brass" />
              )}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => closeAllTabs()}
        className="flex h-full shrink-0 items-center justify-center px-3 text-muted transition-colors active:text-heading"
        aria-label="Fermer tous les onglets"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

"use client"

import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"
import { cn } from "@/lib/utils"

export function CrmMobileAccountTabs() {
  const { tabs, activeTabId, setActiveTab, closeAllTabs } = useCrmTabStore()

  if (tabs.length === 0) return null

  // Déterminer les onglets visibles (max 4)
  // L'onglet actif + jusqu'à 3 onglets les plus récents
  let visibleTabs = tabs
  if (tabs.length > 4) {
    const activeTab = tabs.find(t => t.id === activeTabId)
    const otherTabs = tabs.filter(t => t.id !== activeTabId)
    const recentOtherTabs = otherTabs.slice(-(activeTab ? 3 : 4))
    
    // On conserve l'ordre original des onglets
    visibleTabs = tabs.filter(t => 
      t.id === activeTabId || recentOtherTabs.some(r => r.id === t.id)
    )
  }

  return (
    <div className="flex items-center w-full h-12 bg-surface border-b border-border px-1 select-none" role="tablist" aria-label="Cockpits comptes mobiles">
      {/* Bouton Liste */}
      <button
        onClick={() => setActiveTab("home")}
        className="flex items-center justify-center h-full px-2 shrink-0 text-primary active:opacity-70 transition-opacity"
        aria-label="Retour à la liste"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-[11px] font-bold ml-1">Liste</span>
      </button>

      {/* Onglets */}
      <div className="flex-1 flex items-center h-full min-w-0">
        {visibleTabs.map(tab => {
          const isActive = tab.id === activeTabId
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 min-w-0 flex flex-col justify-center items-center h-full px-1 relative active:bg-canvas transition-colors"
            >
              <span 
                className={cn(
                  "text-[11px] truncate w-full text-center px-1",
                  isActive ? "font-bold text-heading" : "font-medium text-muted"
                )}
              >
                {tab.title}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-primary rounded-t-sm" />
              )}
            </button>
          )
        })}
      </div>

      {/* Bouton Fermer tout */}
      <button
        onClick={() => closeAllTabs()}
        className="flex items-center justify-center h-full px-3 shrink-0 text-muted active:text-heading transition-colors"
        aria-label="Fermer tous les onglets comptes"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

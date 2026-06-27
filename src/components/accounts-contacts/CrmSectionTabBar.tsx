"use client"

import { KeyboardEvent } from "react"
import { IconButton } from "@/components/ui/IconButton"
import { cn } from "@/lib/utils"
import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"
import { sectionTabHomeClasses, sectionTabItemClasses, sectionTabListClasses } from "@/components/layout/section-tab-styles"

function CompanyIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

export function CrmSectionTabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useCrmTabStore()

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, tabId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      setActiveTab(tabId)
    }
  }

  return (
    <div
      className={sectionTabListClasses("bg-surface border-b border-border shrink-0")}
      role="tablist"
      aria-label="Cockpits comptes ouverts"
    >
      <button
        onClick={() => setActiveTab("home")}
        role="tab"
        aria-selected={activeTabId === "home"}
        className={cn(
          sectionTabItemClasses({ active: activeTabId === "home", compact: true }),
          sectionTabHomeClasses(activeTabId === "home"),
          "px-4 cursor-pointer"
        )}
      >
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas text-primary shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]">
          <HomeIcon />
        </span>
        <span className="flex items-center self-stretch text-xs font-bold text-inherit leading-none">
          Comptes
        </span>
      </button>

      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            className={cn(
              sectionTabItemClasses({ active: isActive, compact: true }),
              "border-r border-border px-3 cursor-pointer"
            )}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
          >
            <CompanyIcon />
            <span className="max-w-[160px] truncate">{tab.title}</span>

            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={`Fermer ${tab.title}`}
              size="sm"
              variant="ghost"
              className={cn(
                "ml-1 size-6 min-h-6 min-w-6 rounded-[var(--radius-small)] transition-[opacity,background-color,color] duration-[var(--motion-duration-fast)]",
                "opacity-0 group-hover:opacity-100",
                isActive && "opacity-60 hover:opacity-100",
                "text-muted hover:bg-canvas hover:text-heading focus-visible:opacity-100"
              )}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </IconButton>
          </div>
        )
      })}
    </div>
  )
}

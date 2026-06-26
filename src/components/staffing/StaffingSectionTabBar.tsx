"use client"

import { KeyboardEvent } from "react"
import { IconButton } from "@/components/ui/IconButton"
import { cn } from "@/lib/utils"
import { useStaffingTabStore } from "@/lib/tabs/staffing-tab-store"
import { sectionTabHomeClasses, sectionTabItemClasses, sectionTabListClasses } from "@/components/layout/section-tab-styles"

function TabEntityIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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

export function StaffingSectionTabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useStaffingTabStore()

  const handleInteractiveKeyDown = (event: KeyboardEvent<HTMLDivElement>, tabId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      setActiveTab(tabId)
    }
  }

  return (
    <div className={sectionTabListClasses("bg-surface border-b border-border shrink-0")} role="tablist" aria-label="Fiches staffing ouvertes">
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
          Staffings actifs
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
            onKeyDown={(event) => handleInteractiveKeyDown(event, tab.id)}
          >
            <TabEntityIcon />
            <span className="max-w-[160px] truncate">{tab.title}</span>

            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              onKeyDown={(event) => event.stopPropagation()}
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

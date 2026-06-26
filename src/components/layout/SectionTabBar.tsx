"use client"

import { KeyboardEvent } from "react"
import { IconButton } from "@/components/ui/IconButton"
import { cn } from "@/lib/utils"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { SectionTab } from "@/lib/tabs/tab-types"
import { sectionTabHomeClasses, sectionTabItemClasses, sectionTabListClasses } from "./section-tab-styles"

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
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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

  const handleInteractiveKeyDown = (event: KeyboardEvent<HTMLDivElement>, tabId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      setActiveTab(tabId)
    }
  }

  return (
    <div className={sectionTabListClasses("bg-surface border-b border-border shrink-0")} role="tablist" aria-label="Fiches ouvertes">
      <button
        onClick={() => setActiveTab("home")}
        role="tab"
        aria-selected={activeTabId === "home"}
        className={cn(
          sectionTabItemClasses({ active: activeTabId === "home", compact: true }),
          sectionTabHomeClasses(activeTabId === "home"),
          "px-4"
        )}
      >
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas text-primary shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]">
          <HomeIcon />
        </span>
        <span className="flex items-center self-stretch text-xs font-bold text-inherit leading-none">
          {homeLabel}
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
            <TabEntityIcon type={tab.entityType} />
            <span className="max-w-[160px] truncate">{tab.title}</span>
            {tab.subtitle && tab.entityType !== "opportunite" && (
              <span className={cn("text-[10px]", isActive ? "text-muted" : "text-border")}>
                {tab.subtitle}
              </span>
            )}

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

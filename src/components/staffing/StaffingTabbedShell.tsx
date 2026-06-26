"use client"

import React, { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useStaffingTabStore } from "@/lib/tabs/staffing-tab-store"
import { StaffingSectionTabBar } from "./StaffingSectionTabBar"
import { StaffingEntityPanel } from "./StaffingEntityPanel"

interface StaffingTabbedShellProps {
  children: React.ReactNode
  isMobile?: boolean
}

export function StaffingTabbedShell({
  children,
  isMobile = false,
}: StaffingTabbedShellProps) {
  const pathname = usePathname()
  const { tabs, activeTabId, setActiveTab } = useStaffingTabStore()

  // Reset tab to "home" when the section URL changes
  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      setActiveTab("home")
    }
  }, [pathname, setActiveTab])

  if (isMobile) {
    if (activeTabId === "home") {
      return <>{children}</>
    }

    const activeTab = tabs.find((t) => t.id === activeTabId)
    if (!activeTab) return <>{children}</>

    return (
      <div className="flex flex-col h-full bg-canvas overflow-y-auto">
        {/* Mobile Header with Back Button */}
        <div className="sticky top-0 bg-surface border-b border-border z-10 px-4 py-3 flex items-center gap-3 select-none shadow-sm">
          <button
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:opacity-80 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-bold text-heading truncate">{activeTab.title}</h2>
          </div>
        </div>

        <div className="flex-1">
          <StaffingEntityPanel tab={activeTab} isMobile={true} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <StaffingSectionTabBar />

      {/* Home tab — view main listing/dashboard */}
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          activeTabId !== "home" && "hidden"
        )}
      >
        {children}
      </div>

      {/* Record tabs — opened staffing record panels */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex-1 overflow-y-auto",
            tab.id !== activeTabId && "hidden"
          )}
        >
          <StaffingEntityPanel tab={tab} />
        </div>
      ))}
    </div>
  )
}

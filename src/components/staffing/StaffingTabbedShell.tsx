"use client"

import React, { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useStaffingTabStore } from "@/lib/tabs/staffing-tab-store"
import { StaffingSectionTabBar } from "./StaffingSectionTabBar"

interface StaffingTabbedShellProps {
  children: React.ReactNode
  isMobile?: boolean
}

export function StaffingTabbedShell({
  children,
  isMobile = false,
}: StaffingTabbedShellProps) {
  const pathname = usePathname()
  const { tabs, closeAllTabs } = useStaffingTabStore()

  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      closeAllTabs()
    }
  }, [closeAllTabs, pathname])

  useEffect(() => {
    if (tabs.length > 0) {
      closeAllTabs()
    }
  }, [closeAllTabs, tabs.length])

  if (isMobile) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <StaffingSectionTabBar />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

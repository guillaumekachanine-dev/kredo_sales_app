"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"
import { CrmSectionTabBar } from "./CrmSectionTabBar"
import { CrmEntityPanel } from "./CrmEntityPanel"

const ACCOUNTS_PREFIX = "/prospection/accounts"

interface CrmTabbedShellProps {
  children: React.ReactNode
  isMobile?: boolean
}

export function CrmTabbedShell({ children, isMobile = false }: CrmTabbedShellProps) {
  const pathname = usePathname()
  const { tabs, activeTabId, setActiveTab } = useCrmTabStore()
  const isAccountsSection = pathname === ACCOUNTS_PREFIX || pathname.startsWith(ACCOUNTS_PREFIX + "/")

  // Retour à "home" quand on quitte la section comptes
  const prevIsAccounts = useRef(isAccountsSection)
  useEffect(() => {
    if (prevIsAccounts.current && !isAccountsSection) {
      setActiveTab("home")
    }
    prevIsAccounts.current = isAccountsSection
  }, [isAccountsSection, setActiveTab])

  // Vue mobile : si onglet entité actif sur accounts, afficher le panel + bouton retour
  if (isMobile) {
    if (isAccountsSection && activeTabId !== "home") {
      const activeTab = tabs.find((t) => t.id === activeTabId)
      if (activeTab) {
        return (
          <div className="flex flex-col h-full bg-canvas overflow-y-auto">
            <div className="sticky top-0 bg-surface border-b border-border z-10 px-4 py-3 flex items-center gap-3 select-none">
              <button
                onClick={() => setActiveTab("home")}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:opacity-80 transition-all"
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
              <CrmEntityPanel tab={activeTab} isMobile />
            </div>
          </div>
        )
      }
    }
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    )
  }

  // Vue desktop
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {isAccountsSection && <CrmSectionTabBar />}

      {/* Liste home */}
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          isAccountsSection && activeTabId !== "home" && "hidden"
        )}
      >
        {children}
      </div>

      {/* Panels entité */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex-1 overflow-y-auto",
            tab.id !== activeTabId && "hidden"
          )}
        >
          <CrmEntityPanel tab={tab} isActive={tab.id === activeTabId} />
        </div>
      ))}
    </div>
  )
}

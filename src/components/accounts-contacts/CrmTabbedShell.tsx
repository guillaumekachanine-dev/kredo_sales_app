"use client"

import { useEffect, useReducer } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import { CrmSectionTabBar } from "./CrmSectionTabBar"
import { CrmEntityPanel } from "./CrmEntityPanel"
import { CrmMobileAccountTabs } from "./CrmMobileAccountTabs"
import {
  buildAccountIntelligenceHref,
  createEmbeddedAccountIntelligenceNavigationState,
  embeddedAccountIntelligenceNavigationReducer,
  getDisplayedAccountIntelligenceSection,
  getRememberedAccountIntelligenceSection,
  parseAccountIntelligenceSection,
  type ClientIntelligenceDesktopTabKey,
} from "./intelligence/account-intelligence-desktop-navigation"

const ACCOUNTS_PREFIX = "/prospection/accounts"

interface CrmTabbedShellProps {
  children: React.ReactNode
  isMobile?: boolean
}

export function CrmTabbedShell({ children, isMobile = false }: CrmTabbedShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tabs, activeTabId } = useCrmTabStore()
  const urlSection = parseAccountIntelligenceSection(searchParams.get("aiSection"))
  const [embeddedNavigation, dispatchEmbeddedNavigation] = useReducer(
    embeddedAccountIntelligenceNavigationReducer,
    createEmbeddedAccountIntelligenceNavigationState(activeTabId, urlSection),
  )
  const isAccountsSection = pathname === ACCOUNTS_PREFIX || pathname.startsWith(ACCOUNTS_PREFIX + "/")
  const isDirectCockpit = pathname.startsWith(ACCOUNTS_PREFIX + "/")
  const isCockpitActive = isAccountsSection && (isDirectCockpit || activeTabId !== "home")

  // Le cockpit Desktop possède son propre rail : il prend un verrou de repli
  // sur la sidebar principale pendant toute sa durée d'affichage. Le compteur
  // du store évite une restauration prématurée si un autre panneau demande le
  // même repli en parallèle.
  useEffect(() => {
    if (isMobile || !isCockpitActive) return

    useSidebarCollapse.getState().requestCollapse()
    return () => useSidebarCollapse.getState().requestRestore()
  }, [isCockpitActive, isMobile])

  useEffect(() => {
    if (isMobile) return

    if (embeddedNavigation.activePanelId === activeTabId) {
      if (activeTabId !== "home") {
        dispatchEmbeddedNavigation({
          type: "urlChanged",
          panelId: activeTabId,
          section: urlSection,
        })
      }
      return
    }

    const rememberedSection = getRememberedAccountIntelligenceSection(
      embeddedNavigation,
      activeTabId,
    )

    dispatchEmbeddedNavigation({
      type: "activate",
      panelId: activeTabId,
      section: rememberedSection,
    })

    if (activeTabId === "home") return

    const restoredHref = buildAccountIntelligenceHref(
      pathname,
      searchParams,
      rememberedSection,
    )
    const currentQuery = searchParams.toString()
    const currentHref = currentQuery ? `${pathname}?${currentQuery}` : pathname

    if (restoredHref !== currentHref) {
      router.replace(restoredHref)
    }
  }, [
    activeTabId,
    embeddedNavigation,
    isMobile,
    pathname,
    router,
    searchParams,
    urlSection,
  ])

  const navigateEmbeddedSection = (
    panelId: string,
    section: ClientIntelligenceDesktopTabKey,
  ) => {
    if (panelId !== activeTabId) return

    dispatchEmbeddedNavigation({ type: "navigate", panelId, section })
    router.push(buildAccountIntelligenceHref(pathname, searchParams, section))
  }

  // Vue mobile : si onglet entité actif sur accounts, afficher le panel + bouton retour
  if (isMobile) {
    if (isAccountsSection && activeTabId !== "home") {
      const activeTab = tabs.find((t) => t.id === activeTabId)
      if (activeTab) {
        return (
          <div className="flex flex-col h-full bg-canvas overflow-y-auto">
            <div className="sticky top-0 z-10">
              <CrmMobileAccountTabs />
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
            "flex-1 min-h-0 overflow-hidden",
            tab.id !== activeTabId && "hidden"
          )}
        >
          <CrmEntityPanel
            tab={tab}
            isActive={tab.id === activeTabId}
            desktopNavigation={{
              section: getDisplayedAccountIntelligenceSection(
                embeddedNavigation,
                tab.id,
                activeTabId,
                urlSection,
              ),
              onSectionChange: (section) => navigateEmbeddedSection(tab.id, section),
            }}
          />
        </div>
      ))}
    </div>
  )
}

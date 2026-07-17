"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getNavigationIcon } from "./navigation-icons"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { openMobileAccountQuickSearch } from "@/hooks/use-mobile-account-quick-search"
import { cn } from "@/lib/utils"
import styles from "./MobileNavigationMenu.module.css"

type MenuItemId =
  | "cockpit"
  | "agenda"
  | "crm"
  | "besoins"
  | "missions"
  | "intelligence"
  | "finance"
  | "consultants"

type TabAlignment = "start" | "end"

type MenuItem = {
  id: MenuItemId
  label: string
  icon: string
  tone: string
  href?: string
  tabs?: Array<{
    label: string
    shortLabel?: string
    href: string
    icon: string
    disabled?: boolean
    comingSoon?: boolean
  }>
}

const mainItems: MenuItem[] = [
  { id: "cockpit", label: "Cockpit", icon: "cockpit", tone: "cobalt", href: "/cockpit" },
  { id: "agenda", label: "Agenda", icon: "calendar", tone: "brass", href: "/agenda" },
  {
    id: "crm",
    label: "CRM",
    icon: "crm",
    tone: "teal",
    tabs: [
      { label: "Comptes & Contacts", shortLabel: "Comptes", href: "/prospection/accounts", icon: "equipe" },
    ],
  },
  {
    id: "besoins",
    label: "Opportunités",
    icon: "sales",
    tone: "amber",
    tabs: [
      { label: "Besoins & Staffing", shortLabel: "Besoins", href: "/missions/opps", icon: "sales" },
      { label: "Recrutement", href: "/recruitment", icon: "recrutement" },
    ],
  },
  {
    id: "missions",
    label: "Contrats actifs",
    icon: "engagements",
    tone: "indigo",
    tabs: [
      { label: "Synthèse", href: "/missions", icon: "engagements" },
      { label: "Missions", href: "/missions/actives", icon: "sales" },
      { label: "Projets", href: "/missions/projets", icon: "automations" },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: "bi",
    tone: "navy",
    tabs: [
      { label: "Business Intelligence", shortLabel: "BI", href: "/intelligence", icon: "bi" },
      { label: "Rapports & rédaction", shortLabel: "Rapports", href: "/reports", icon: "reports" },
      { label: "Veille & actualités", shortLabel: "Veille", href: "/veille", icon: "veille" },
    ],
  },
  { id: "finance", label: "Finance", icon: "finance", tone: "olive", href: "/finance" },
  {
    id: "consultants",
    label: "Équipe",
    icon: "equipe",
    tone: "sage",
    tabs: [
      { label: "Synthèse", href: "/consultants", icon: "equipe" },
      { label: "Pool de compétences", shortLabel: "Compétences", href: "/consultants/pool-competences", icon: "knowledge" },
      { label: "Activité & congés", shortLabel: "Activité", href: "/consultants/activite-conges", icon: "calendar" },
    ],
  },
]

const quickActions = [
  { label: "Favoris", icon: "cockpit", href: "/cockpit", meta: "4 épingles" },
  { label: "Paramètres", icon: "settings", href: "/settings", meta: "Système" },
  { label: "Knowledge Hub", icon: "knowledge", href: "/knowledge", meta: "Sources" },
  { label: "Automatisations", icon: "automations", href: "/automations", meta: "n8n" },
]

interface MobileNavigationMenuProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function ChevronIcon() {
  return (
    <svg className={styles.stateIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className={styles.stateIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function chunkRows(items: MenuItem[]) {
  const rows: MenuItem[][] = []
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2))
  }
  return rows
}

function getInitialExpandedId(pathname: string): MenuItemId | null {
  if (pathname.startsWith("/prospection")) return "crm"
  if (pathname.startsWith("/missions/opps") || pathname.startsWith("/recruitment")) return "besoins"
  if (pathname.startsWith("/missions")) return "missions"
  if (pathname.startsWith("/reports") || pathname.startsWith("/veille") || pathname.startsWith("/intelligence")) return "intelligence"
  if (pathname.startsWith("/consultants")) return "consultants"
  return null
}

function isItemActive(item: MenuItem, pathname: string) {
  if (item.id === "cockpit") return pathname === "/cockpit"
  if (item.id === "agenda") return pathname === "/agenda"
  if (item.id === "crm") return pathname.startsWith("/prospection")
  if (item.id === "besoins") return pathname.startsWith("/missions/opps") || pathname.startsWith("/recruitment")
  if (item.id === "missions") return pathname.startsWith("/missions") && !pathname.startsWith("/missions/opps")
  if (item.id === "intelligence") return pathname.startsWith("/reports") || pathname.startsWith("/veille") || pathname.startsWith("/intelligence")
  if (item.id === "finance") return pathname.startsWith("/finance")
  if (item.id === "consultants") return pathname.startsWith("/consultants")
  return false
}

function ModuleCard({
  item,
  expanded,
  active,
  focusActive,
  onToggle,
  onNavigate,
}: {
  item: MenuItem
  expanded: boolean
  active: boolean
  focusActive: boolean
  onToggle: (id: MenuItemId) => void
  onNavigate: () => void
}) {
  const hasTabs = Boolean(item.tabs?.length)
  const className = cn(
    styles.moduleCard,
    styles[`tone_${item.tone}`],
    active && styles.activeCard,
    expanded && styles.expandedCard,
    focusActive && styles.focusActiveCard
  )

  const content = (
    <>
      <span className={styles.moduleIcon}>{getNavigationIcon(item.icon)}</span>
      <span className={styles.moduleText}>
        <span className={styles.moduleLabel}>{item.label}</span>
      </span>
      {hasTabs ? (
        <span className={cn(styles.chevron, expanded && styles.chevronOpen)} aria-hidden="true">
          <ChevronIcon />
        </span>
      ) : null}
    </>
  )

  if (hasTabs) {
    return (
      <button
        type="button"
        aria-expanded={expanded}
        className={className}
        onClick={() => onToggle(item.id)}
      >
        {content}
      </button>
    )
  }

  return (
    <Link href={item.href ?? "/cockpit"} onClick={onNavigate} className={className}>
      {content}
    </Link>
  )
}

function ExpandedTabs({
  item,
  align,
  pathname,
  onNavigate,
}: {
  item: MenuItem
  align: TabAlignment
  pathname: string
  onNavigate: () => void
}) {
  if (!item.tabs?.length) return null

  return (
    <div
      className={cn(
        styles.expandedTabs,
        align === "end" ? styles.expandedTabsEnd : styles.expandedTabsStart
      )}
      aria-label={`Onglets ${item.label}`}
    >
      <div className={styles.tabGrid}>
        {item.tabs.map((tab) => {
          const isUnavailable = tab.disabled || tab.comingSoon
          const isActive = pathname === tab.href
          const className = cn(
            styles.tabCard,
            isActive && styles.activeTab,
            isUnavailable && styles.disabledTab
          )

          if (isUnavailable) {
            return (
              <div key={tab.href} className={className} aria-disabled="true">
                <span className={styles.tabIcon}>{getNavigationIcon(tab.icon)}</span>
                <span className={styles.tabLabel}>{tab.shortLabel ?? tab.label}</span>
              </div>
            )
          }

          if (tab.href === "/prospection/accounts") {
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => {
                  onNavigate()
                  openMobileAccountQuickSearch()
                }}
                className={className}
              >
                <span className={styles.tabIcon}>{getNavigationIcon(tab.icon)}</span>
                <span className={styles.tabLabel}>{tab.shortLabel ?? tab.label}</span>
              </button>
            )
          }

          return (
            <Link key={tab.href} href={tab.href} onClick={onNavigate} className={className}>
              <span className={styles.tabIcon}>{getNavigationIcon(tab.icon)}</span>
              <span className={styles.tabLabel}>{tab.shortLabel ?? tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function MobileNavigationMenu({ isOpen, onOpenChange }: MobileNavigationMenuProps) {
  const pathname = usePathname()
  const rows = useMemo(() => chunkRows(mainItems), [])
  const [expandedId, setExpandedId] = useState<MenuItemId | null>(null)
  const isFocusMode = expandedId !== null

  useEffect(() => {
    if (!isOpen) return

    const timeout = window.setTimeout(() => {
      setExpandedId(getInitialExpandedId(pathname))
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [isOpen, pathname])

  function handleToggle(id: MenuItemId) {
    setExpandedId((current) => (current === id ? null : id))
  }

  function closeMenu() {
    onOpenChange(false)
  }

  return (
    <AppDrawer
      open={isOpen}
      onOpenChange={onOpenChange}
      title=""
      subtitle={undefined}
      icon={undefined}
      side="bottom"
      headerClassName="!hidden"
      className="!border-0 !shadow-none [--drawer-header-fade-start:rgba(249,247,241,0.96)] [--drawer-header-fade-end:rgba(249,247,241,0)] max-h-[85vh] overflow-y-auto"
    >
      <div className={cn(styles.menuShell, isFocusMode && styles.focusMode)}>
        <div className={styles.focusOverlay} aria-hidden="true" />
        <header className={styles.menuHeader}>
          <h2>Navigation</h2>
          <button type="button" className={styles.closeButton} aria-label="Fermer" onClick={closeMenu}>
            <CloseIcon />
          </button>
        </header>

        <div className={styles.moduleGrid}>
          {rows.map((row) => {
            const rowExpandedItem = row.find((item) => item.id === expandedId && item.tabs?.length)
            const expandedIndex = rowExpandedItem ? row.findIndex((item) => item.id === rowExpandedItem.id) : -1
            const tabAlignment: TabAlignment = expandedIndex === 1 ? "end" : "start"

            return (
              <div
                key={row.map((item) => item.id).join("-")}
                className={styles.moduleRow}
              >
                <div className={styles.modulePair}>
                  {row.map((item) => (
                    <ModuleCard
                      key={item.id}
                      item={item}
                      expanded={item.id === expandedId}
                      active={isItemActive(item, pathname)}
                      focusActive={item.id === expandedId}
                      onToggle={handleToggle}
                      onNavigate={closeMenu}
                    />
                  ))}
                </div>
                {rowExpandedItem ? (
                  <ExpandedTabs
                    item={rowExpandedItem}
                    align={tabAlignment}
                    pathname={pathname}
                    onNavigate={closeMenu}
                  />
                ) : null}
              </div>
            )
          })}
        </div>

        <section className={styles.quickSection} aria-label="Accès rapide">
          <div className={styles.quickHeader}>
            <h3>Accès rapide</h3>
            <span>Actions fréquentes</span>
          </div>
          <div className={styles.quickList}>
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href} onClick={closeMenu} className={styles.quickAction}>
                <span className={styles.quickIcon}>{getNavigationIcon(action.icon)}</span>
                <span>{action.label}</span>
                <strong>{action.meta}</strong>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppDrawer>
  )
}

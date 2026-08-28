"use client"

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AppDrawer } from "@/components/ui/AppDrawer"
import {
  getMobileTabsForPath,
  type SectionTab,
} from "@/lib/navigation/main-menu.config"
import { cn } from "@/lib/utils"
import { getNavigationIcon } from "./navigation-icons"
import styles from "./MobileNavigationMenu.module.css"

export type MenuItemId =
  | "agenda"
  | "prospection"
  | "besoins"
  | "veille"
  | "finance"
  | "engagements"
  | "recrutement"
  | "equipe"
  | "reports"
  | "knowledge"
  | "automations"
  | "settings"

type MenuItemSize = "primary" | "secondary"

export type MenuItem = {
  id: MenuItemId
  label: string
  icon: string
  href: string
  size: MenuItemSize
  activePaths: string[]
  tabs?: SectionTab[]
}

function tabsFor(pathname: string): SectionTab[] | undefined {
  const tabs = getMobileTabsForPath(pathname)
  return tabs.length > 1 ? tabs : undefined
}

export const mainItems: MenuItem[] = [
  {
    id: "agenda",
    label: "Agenda",
    icon: "calendar",
    href: "/agenda",
    size: "primary",
    activePaths: ["/agenda"],
  },
  {
    id: "prospection",
    label: "Prospection",
    icon: "prospection-mobile",
    href: "/prospection-intelligence",
    size: "primary",
    activePaths: ["/prospection-intelligence"],
  },
  {
    id: "besoins",
    label: "Opportunités",
    icon: "engagements",
    href: "/missions/opps",
    size: "primary",
    activePaths: ["/missions/opps"],
    tabs: tabsFor("/missions/opps"),
  },
  {
    id: "veille",
    label: "Veille & actualités",
    icon: "news-mobile",
    href: "/veille",
    size: "primary",
    activePaths: ["/veille"],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "finance",
    href: "/finance",
    size: "secondary",
    activePaths: ["/finance"],
  },
  {
    id: "engagements",
    label: "Engagements",
    icon: "clipboard-mobile",
    href: "/missions",
    size: "secondary",
    activePaths: ["/missions", "/missions/actives", "/missions/projets"],
    tabs: tabsFor("/missions"),
  },
  {
    id: "recrutement",
    label: "Recrutement",
    icon: "recrutement",
    href: "/recruitment",
    size: "secondary",
    activePaths: ["/recruitment"],
  },
  {
    id: "equipe",
    label: "Équipe",
    icon: "equipe",
    href: "/consultants",
    size: "secondary",
    activePaths: ["/consultants"],
    tabs: tabsFor("/consultants"),
  },
  {
    id: "reports",
    label: "Rapports & rédaction",
    icon: "reports",
    href: "/reports",
    size: "secondary",
    activePaths: ["/reports"],
  },
  {
    id: "knowledge",
    label: "Knowledge Hub",
    icon: "graduation-mobile",
    href: "/knowledge",
    size: "secondary",
    activePaths: ["/knowledge"],
  },
  {
    id: "automations",
    label: "Automatisations",
    icon: "workflow-mobile",
    href: "/automations",
    size: "secondary",
    activePaths: ["/automations"],
  },
  {
    id: "settings",
    label: "Paramètres",
    icon: "settings",
    href: "/settings",
    size: "secondary",
    activePaths: ["/settings"],
  },
]

const primaryItems = mainItems.filter((item) => item.size === "primary")
const secondaryItems = mainItems.filter((item) => item.size === "secondary")

interface MobileNavigationMenuProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  expandedId?: MenuItemId | null
  onExpandedChange?: (id: MenuItemId | null) => void
}

type FocusGeometry = {
  top: number
  left: number
  width: number
  height: number
  shellWidth: number
  direction: "start" | "end"
}

function pathMatches(pathname: string, href: string) {
  const hrefPathname = href.split("?")[0]
  return pathname === hrefPathname || pathname.startsWith(hrefPathname + "/")
}

function isItemActive(item: MenuItem, pathname: string) {
  if (item.id === "engagements") {
    return item.activePaths.some((href) =>
      href === "/missions" ? pathname === href : pathMatches(pathname, href),
    )
  }

  return item.activePaths.some((href) => pathMatches(pathname, href))
}

function activeTabHref(tabs: SectionTab[], pathname: string) {
  return tabs
    .filter((tab) => pathMatches(pathname, tab.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href
}

function CardContent({ item }: { item: MenuItem }) {
  return (
    <>
      <span className={styles.cardIcon} aria-hidden="true">
        {getNavigationIcon(item.icon)}
      </span>
      <span className={styles.cardLabel}>{item.label}</span>
    </>
  )
}

function MenuCard({
  item,
  active,
  expanded,
  onToggle,
  onNavigate,
}: {
  item: MenuItem
  active: boolean
  expanded: boolean
  onToggle: (id: MenuItemId) => void
  onNavigate: () => void
}) {
  const className = cn(
    styles.menuCard,
    item.size === "primary" ? styles.primaryCard : styles.secondaryCard,
    active && styles.routeActive,
    expanded && styles.sourceExpanded,
  )

  if (item.tabs?.length) {
    return (
      <button
        type="button"
        data-menu-card-id={item.id}
        aria-expanded={expanded}
        className={className}
        onClick={() => onToggle(item.id)}
      >
        <CardContent item={item} />
      </button>
    )
  }

  return (
    <Link
      href={item.href}
      data-menu-card-id={item.id}
      aria-current={active ? "page" : undefined}
      className={className}
      onClick={onNavigate}
    >
      <CardContent item={item} />
    </Link>
  )
}

function FocusLayer({
  item,
  pathname,
  geometry,
  closing,
  onCollapse,
  onNavigate,
}: {
  item: MenuItem
  pathname: string
  geometry: FocusGeometry
  closing: boolean
  onCollapse: () => void
  onNavigate: () => void
}) {
  const anchorRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const tabs = item.tabs ?? []
  const firstTab = tabs[0]
  const remainingTabs = tabs.slice(1)
  const currentTabHref = activeTabHref(tabs, pathname)

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (geometry.direction === "end" && scroller) {
      scroller.scrollLeft = scroller.scrollWidth - scroller.clientWidth
    }
    anchorRef.current?.focus({ preventScroll: true })
  }, [geometry.direction, item.id])

  const tabsRowWidthPx = tabs.length * 76 + Math.max(0, tabs.length - 1) * 8

  const layerStyle = {
    "--focus-top": `${geometry.top}px`,
    "--focus-anchor-left": `${geometry.left}px`,
    "--focus-anchor-width": `${geometry.width}px`,
    "--focus-anchor-height": `${geometry.height}px`,
    "--focus-shell-width": `${geometry.shellWidth}px`,
    "--focus-tab-count": tabs.length,
    "--focus-tabs-span": `${tabs.length * 84}px`,
    "--focus-tabs-row-width": `${tabsRowWidthPx}px`,
  } as React.CSSProperties

  const isFirstTabActive = firstTab && firstTab.href === currentTabHref

  const anchorClassName = cn(
    styles.menuCard,
    item.size === "primary" ? styles.primaryCard : styles.secondaryCard,
    styles.focusAnchor,
    isFirstTabActive && styles.focusTabActive,
  )

  const anchorContent = (
    <>
      <span className={styles.cardIcon} aria-hidden="true">
        {getNavigationIcon(item.icon)}
      </span>
      <span className={styles.cardLabel}>
        {firstTab ? (firstTab.shortLabel ?? firstTab.label) : item.label}
      </span>
    </>
  )

  const anchor = firstTab ? (
    <Link
      ref={anchorRef as React.RefObject<HTMLAnchorElement>}
      href={firstTab.href}
      data-focus-tab
      aria-current={isFirstTabActive ? "page" : undefined}
      aria-label={`Aller à ${firstTab.label}`}
      className={anchorClassName}
      onClick={onNavigate}
    >
      {anchorContent}
    </Link>
  ) : (
    <button
      ref={anchorRef as React.RefObject<HTMLButtonElement>}
      type="button"
      aria-expanded="true"
      aria-label={`Replier ${item.label}`}
      className={anchorClassName}
      onClick={onCollapse}
    >
      {anchorContent}
    </button>
  )

  const renderedTabs = remainingTabs.map((tab, indexInRemaining) => {
    const index = indexInRemaining + 1
    const unavailable = tab.disabled || tab.comingSoon
    const tabClassName = cn(
      styles.focusTab,
      tab.href === currentTabHref && styles.focusTabActive,
      unavailable && styles.focusTabDisabled,
    )
    const distance = geometry.direction === "start" ? index : remainingTabs.length - indexInRemaining
    const tabStyle = {
      "--tab-index": index,
      "--tab-distance": distance,
      "--tab-origin-x": `${geometry.direction === "start" ? -distance * 84 : distance * 84}px`,
      "--tab-delay": `${index * 28}ms`,
      "--tab-close-delay": `${(remainingTabs.length - indexInRemaining - 1) * 24}ms`,
    } as React.CSSProperties

    if (unavailable) {
      return (
        <span
          key={tab.href}
          aria-disabled="true"
          className={tabClassName}
          style={tabStyle}
        >
          {tab.shortLabel ?? tab.label}
        </span>
      )
    }

    return (
      <Link
        key={tab.href}
        href={tab.href}
        data-focus-tab
        aria-current={tab.href === currentTabHref ? "page" : undefined}
        className={tabClassName}
        style={tabStyle}
        onClick={onNavigate}
      >
        {tab.shortLabel ?? tab.label}
      </Link>
    )
  })

  return (
    <div
      className={cn(
        styles.focusLayer,
        geometry.direction === "end" ? styles.focusDirectionEnd : styles.focusDirectionStart,
        closing && styles.focusClosing,
        item.size === "primary" ? styles.focusPrimary : styles.focusSecondary,
      )}
      style={layerStyle}
      aria-label={`Navigation ${item.label}`}
    >
      <div className={styles.focusHeader}>
        <span className={styles.focusTitle}>{item.label}</span>
        <div className={styles.focusCobaltLine} aria-hidden="true" />
      </div>

      <div ref={scrollerRef} className={styles.focusScroller}>
        <div className={styles.focusRow}>
          {anchor}
          {renderedTabs}
        </div>
      </div>
    </div>
  )
}

export function MobileNavigationMenu({
  isOpen,
  onOpenChange,
  expandedId: controlledExpandedId,
  onExpandedChange,
}: MobileNavigationMenuProps) {
  const pathname = usePathname()
  const shellRef = useRef<HTMLDivElement>(null)
  const collapseTimerRef = useRef<number | null>(null)
  const [internalExpandedId, setInternalExpandedId] = useState<MenuItemId | null>(null)
  const [focusGeometry, setFocusGeometry] = useState<FocusGeometry | null>(null)
  const [focusClosing, setFocusClosing] = useState(false)
  const isControlled = controlledExpandedId !== undefined
  const expandedId = isControlled ? controlledExpandedId : internalExpandedId
  const expandedItem = mainItems.find((item) => item.id === expandedId) ?? null

  function setExpandedId(id: MenuItemId | null) {
    if (!isControlled) setInternalExpandedId(id)
    onExpandedChange?.(id)
  }

  function closeMenu() {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
    setFocusClosing(false)
    setExpandedId(null)
    onOpenChange(false)
  }

  function requestCollapse() {
    if (!expandedId || focusClosing) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    setFocusClosing(true)
    collapseTimerRef.current = window.setTimeout(() => {
      setExpandedId(null)
      setFocusClosing(false)
      collapseTimerRef.current = null
      shellRef.current
        ?.querySelector<HTMLElement>(`[data-menu-card-id="${expandedId}"]`)
        ?.focus({ preventScroll: true })
    }, reduceMotion ? 0 : 290)
  }

  function handleToggle(id: MenuItemId) {
    if (expandedId === id) {
      requestCollapse()
      return
    }
    setFocusClosing(false)
    setExpandedId(id)
  }

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const main = document.querySelector<HTMLElement>("main")
    if (!main) return
    main.inert = true
    return () => {
      main.inert = false
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!expandedId || !isOpen) {
      return
    }

    function measure() {
      const shell = shellRef.current
      const card = shell?.querySelector<HTMLElement>(
        `[data-menu-card-id="${expandedId}"]`,
      )
      if (!shell || !card) return

      const shellRect = shell.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      const left = cardRect.left - shellRect.left
      setFocusGeometry({
        top: cardRect.top - shellRect.top,
        left,
        width: cardRect.width,
        height: cardRect.height,
        shellWidth: shellRect.width,
        direction: left + cardRect.width / 2 > shellRect.width / 2 ? "end" : "start",
      })
    }

    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [expandedId, isOpen])

  const focusActive = Boolean(expandedItem && focusGeometry)

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={focusActive ? "Replier les onglets" : "Fermer le menu"}
          className={styles.pageBackdrop}
          onClick={focusActive ? requestCollapse : closeMenu}
        />
      ) : null}

      <AppDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeMenu()
        }}
        onRequestClose={() => {
          if (focusActive) {
            requestCollapse()
            return false
          }
        }}
        title="Menu"
        side="bottom"
        modal={false}
        headerClassName="!hidden"
        contentClassName="!overflow-hidden !p-0"
        className={cn(styles.mobileMenuDrawer, "!border-0 !shadow-none")}
      >
        <div
          ref={shellRef}
          className={cn(styles.menuShell, focusActive && styles.focusMode)}
        >
          <button
            type="button"
            tabIndex={focusActive ? 0 : -1}
            aria-label="Replier les onglets"
            className={styles.focusBackdrop}
            onClick={requestCollapse}
          />

          <div className={styles.normalLayer}>
            <div className={styles.dragHandle} aria-hidden="true" />
            <header className={styles.menuHeader}>
              <h2 tabIndex={-1} data-autofocus="true">MENU</h2>
            </header>

            <div className={styles.primaryGrid}>
              {primaryItems.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  active={isItemActive(item, pathname)}
                  expanded={item.id === expandedId}
                  onToggle={handleToggle}
                  onNavigate={closeMenu}
                />
              ))}
            </div>

            <div className={styles.secondaryGrid}>
              {secondaryItems.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  active={isItemActive(item, pathname)}
                  expanded={item.id === expandedId}
                  onToggle={handleToggle}
                  onNavigate={closeMenu}
                />
              ))}
            </div>
          </div>

          {expandedItem && focusGeometry ? (
            <FocusLayer
              item={expandedItem}
              pathname={pathname}
              geometry={focusGeometry}
              closing={focusClosing}
              onCollapse={requestCollapse}
              onNavigate={closeMenu}
            />
          ) : null}
        </div>
      </AppDrawer>
    </>
  )
}

"use client"

import Link from "next/link"
import { getNavigationIcon } from "./navigation-icons"
import { useCrmAccountLauncherStore } from "@/hooks/use-crm-account-launcher"
import { cn } from "@/lib/utils"

interface MobileBottomNavProps {
  pathname: string
  isRailOpen: boolean
  activeHasRail: boolean
  onActiveModulePress: () => void
  isMenuOpen: boolean
  onMenuToggle: () => void
  onMenuDismiss?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  onGoBack?: () => void
  onGoForward?: () => void
}

const itemClassName = cn(
  "group relative flex h-full min-h-[var(--layout-mobile-tap-target)] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-center",
  "text-[11px] font-medium text-body transition-[color,opacity,transform] duration-[var(--motion-duration-fast)]",
  "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-primary/35 focus-visible:ring-inset",
)

const noop = () => {}

export function MobileBottomNav({
  pathname,
  isRailOpen,
  activeHasRail,
  onActiveModulePress,
  isMenuOpen,
  onMenuToggle,
  onMenuDismiss = noop,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
}: MobileBottomNavProps) {
  const openCrmLauncher = useCrmAccountLauncherStore((state) => state.open)
  const cockpitActive = pathname.startsWith("/cockpit")
  const cockpitTogglesRail = cockpitActive && activeHasRail

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="fixed inset-x-0 bottom-0 z-[var(--z-dropdown)] grid h-[var(--layout-bottom-nav-height)] grid-cols-5 items-stretch border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)]"
    >
      <button
        type="button"
        onClick={onGoBack}
        disabled={!canGoBack}
        aria-disabled={!canGoBack ? "true" : undefined}
        aria-label="Revenir en arrière"
        className={cn(itemClassName, !canGoBack && "cursor-not-allowed opacity-25")}
      >
        {getNavigationIcon("arrow-left", "size-7", 2.2)}
      </button>

      {cockpitTogglesRail ? (
        <button
          type="button"
          onClick={onActiveModulePress}
          aria-current="page"
          aria-expanded={isRailOpen}
          className={cn(itemClassName, "font-semibold text-primary")}
        >
          {getNavigationIcon("cockpit-mobile", "size-7", 1.9)}
          <span>Cockpit</span>
        </button>
      ) : (
        <Link
          href="/cockpit"
          onClick={onMenuDismiss}
          aria-current={cockpitActive ? "page" : undefined}
          className={cn(itemClassName, cockpitActive && "font-semibold text-primary")}
        >
          {getNavigationIcon("cockpit-mobile", "size-7", 1.9)}
          <span>Cockpit</span>
        </Link>
      )}

      <button
        type="button"
        onClick={onMenuToggle}
        aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le Menu"}
        aria-expanded={isMenuOpen}
        className={cn(
          itemClassName,
          "mx-auto -mt-5 h-[calc(100%+1.25rem)] w-16 max-w-16 self-start justify-start font-semibold text-primary",
          "active:scale-95",
        )}
      >
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg shadow-[var(--shadow-overlay-sm)]">
          {getNavigationIcon(isMenuOpen ? "arrow-down" : "menu", "size-8", 2.2)}
        </span>
      </button>

      <button
        type="button"
        onClick={() => {
          onMenuDismiss()
          openCrmLauncher()
        }}
        aria-label="Ouvrir le CRM Launcher"
        className={cn(itemClassName, pathname.startsWith("/prospection/accounts") && "font-semibold text-primary")}
      >
        {getNavigationIcon("crm-mobile", "size-7", 1.9)}
        <span>CRM</span>
      </button>

      <button
        type="button"
        onClick={onGoForward}
        disabled={!canGoForward}
        aria-disabled={!canGoForward ? "true" : undefined}
        aria-label="Aller en avant"
        className={cn(itemClassName, !canGoForward && "cursor-not-allowed opacity-25")}
      >
        {getNavigationIcon("arrow-right", "size-7", 2.2)}
      </button>
    </nav>
  )
}

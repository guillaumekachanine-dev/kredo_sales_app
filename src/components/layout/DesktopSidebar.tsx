"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTransition, useState } from "react"
import { MainMenuItem, mainMenuItems } from "@/lib/navigation/main-menu.config"
import { getNavigationIcon } from "./navigation-icons"
import { signOut } from "@/app/login/actions"
import { cn } from "@/lib/utils"
import { IconButton } from "@/components/ui/IconButton"

// ─────────────────────────────────────────────────────────────────────────────
//  DesktopSidebar — 2 niveaux : groupe → module (pas de sous-pages)
//
//  Les sous-pages vivent dans la barre d'onglets de section (intra-module).
//  La sidebar liste uniquement les modules ; chaque module = 1 item cliquable.
// ─────────────────────────────────────────────────────────────────────────────

function ModuleItem({ item, pathname, isCollapsed }: { item: MainMenuItem; pathname: string; isCollapsed: boolean }) {
  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(item.href + "/")
    : false

  const canNavigate = !item.disabled && !item.comingSoon && !!item.href

  const baseClasses = cn(
    "flex w-full items-center gap-2 rounded-[var(--radius-medium)] py-2 text-xs font-medium",
    "transition-[background-color,color,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
    "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-white/40 focus-visible:ring-offset-0",
    isCollapsed ? "px-0 justify-center" : "px-3",
    isActive
      ? "bg-white/14 text-primary-fg font-semibold"
      : "text-primary-fg/78 hover:bg-white/8 hover:text-primary-fg",
    !canNavigate && "opacity-50 cursor-not-allowed pointer-events-none",
  )

  const content = (
    <div className={cn(
      "flex items-center w-full",
      isCollapsed ? "justify-center" : "justify-between"
    )}>
      <div className="flex items-center gap-2.5">
        {item.icon && getNavigationIcon(item.icon)}
        {!isCollapsed && (
          <span className="truncate">{item.label}</span>
        )}
      </div>
      {!isCollapsed && item.comingSoon && (
        <span className="shrink-0 rounded-full border border-white/16 bg-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-fg/72">
          Bientôt
        </span>
      )}
    </div>
  )

  if (canNavigate) {
    return (
      <Link
        href={item.href!}
        className={baseClasses}
        aria-label={isCollapsed ? item.label : undefined}
        aria-current={isActive ? "page" : undefined}
        title={isCollapsed ? item.label : undefined}
      >
        {content}
      </Link>
    )
  }

  return <div className={baseClasses} aria-label={isCollapsed ? item.label : undefined} title={isCollapsed ? item.label : undefined}>{content}</div>
}

export function DesktopSidebar() {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [isCollapsed, setIsCollapsed] = useState(true)

  const handleMouseEnter = () => {
    setIsCollapsed(false)
  }

  const handleMouseLeave = () => {
    setIsCollapsed(true)
  }

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsCollapsed(true)
    }
  }

  return (
    <aside
      className="relative h-full shrink-0 select-none"
      style={{ width: "var(--layout-sidebar-width-collapsed)" }}
    >
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocusCapture={handleMouseEnter}
        onBlurCapture={handleBlur}
        className={cn(
          "absolute left-0 top-0 z-[var(--z-sidebar)] flex h-full flex-col justify-between overflow-x-hidden border-r border-white/12 bg-[var(--color-bg-sidebar)] text-primary-fg",
          "transition-[width] duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)]",
          isCollapsed ? "w-[var(--layout-sidebar-width-collapsed)]" : "w-[var(--layout-sidebar-width-expanded)]"
        )}
      >
        <div className="flex flex-col flex-1 overflow-y-auto py-5">
          <div className={cn(
            "mb-2 flex items-center border-b border-white/12 pb-6 transition-[padding] duration-[var(--motion-duration-base)]",
            isCollapsed ? "px-4 justify-center" : "px-6"
          )}>
            <Link
              href="/cockpit"
              className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-white/40 focus-visible:ring-offset-0 rounded-[var(--radius-medium)]"
              aria-label="Retour au cockpit"
              title={isCollapsed ? "Cockpit" : undefined}
            >
              <Image
                src="/icon-512.png"
                alt="KREDO Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain shrink-0"
              />
              {!isCollapsed && (
                <span className="shrink-0 text-xl font-bold tracking-tight text-primary-fg">
                  KREDO
                </span>
              )}
            </Link>
          </div>

          <nav className="flex-1 px-4 space-y-5">
            {mainMenuItems.map((item) => {
              if (item.items) {
                return (
                  <div key={item.label} className="space-y-1.5">
                    {isCollapsed ? (
                      <div className="h-4 flex items-center justify-center">
                        <div className="w-full border-t border-white/12" />
                      </div>
                    ) : (
                      <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-primary-fg/48">
                        {item.label}
                      </h4>
                    )}
                    <div className="space-y-1">
                      {item.items.map((module) => (
                        <ModuleItem key={module.label} item={module} pathname={pathname} isCollapsed={isCollapsed} />
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <div key={item.label}>
                  <ModuleItem item={item} pathname={pathname} isCollapsed={isCollapsed} />
                </div>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-white/12 bg-white/6 p-4">
          <div className={cn(
            "flex items-center rounded-[var(--radius-large)] border border-white/12 bg-white/6 transition-[padding] duration-[var(--motion-duration-base)]",
            isCollapsed ? "p-1 justify-center" : "gap-2 px-2 py-1.5"
          )}>
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/12 text-xs font-bold text-primary-fg"
            )}>
              GK
            </div>
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <h5 className="truncate text-xs font-semibold text-primary-fg">Guillaume K.</h5>
                  <p className="truncate text-[10px] text-primary-fg/64">guillaume@kredo.dev</p>
                </div>
                <IconButton
                  disabled={isPending}
                  onClick={() => startTransition(() => signOut())}
                  aria-label="Se déconnecter"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "shrink-0 border-transparent bg-transparent text-primary-fg/56 hover:bg-white/10 hover:text-primary-fg focus-visible:ring-white/40 disabled:opacity-40"
                  )}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m9 0l-3-3m3 3l-3 3" />
                  </svg>
                </IconButton>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

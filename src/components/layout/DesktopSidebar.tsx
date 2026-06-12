"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTransition, useState } from "react"
import { MainMenuItem, mainMenuItems } from "@/lib/navigation/main-menu.config"
import { getNavigationIcon } from "./navigation-icons"
import { signOut } from "@/app/login/actions"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  DesktopSidebar — 2 niveaux : groupe → module (pas de sous-pages)
//
//  Les sous-pages vivent dans la barre d'onglets de section (intra-module).
//  La sidebar liste uniquement les modules ; chaque module = 1 item cliquable.
// ─────────────────────────────────────────────────────────────────────────────

function ModuleItem({ item, pathname, light, isCollapsed }: { item: MainMenuItem; pathname: string; light: boolean; isCollapsed: boolean }) {
  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(item.href + "/")
    : false

  const canNavigate = !item.disabled && !item.comingSoon && !!item.href

  const baseClasses = cn(
    "flex items-center gap-2 py-2 text-xs font-medium rounded transition-all duration-150 w-full",
    isCollapsed ? "px-0 justify-center" : "px-3",
    isActive
      ? light
        ? "bg-primary text-primary-fg font-semibold shadow-[0_2px_6px_-2px_rgba(0,0,0,0.12)]"
        : "bg-white text-primary font-semibold shadow-[0_2px_6px_-2px_rgba(0,0,0,0.08)]"
      : light
        ? "text-body hover:bg-canvas hover:text-heading"
        : "text-white/80 hover:bg-white/10 hover:text-white",
    !canNavigate && "opacity-50 cursor-not-allowed pointer-events-none"
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
        <span className={cn(
          "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border shrink-0",
          light ? "text-muted bg-canvas border-border" : "text-white/70 bg-white/10 border-white/20"
        )}>
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
        aria-current={isActive ? "page" : undefined}
      >
        {content}
      </Link>
    )
  }

  return <div className={baseClasses}>{content}</div>
}

export function DesktopSidebar() {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [isCollapsed, setIsCollapsed] = useState(true)

  // ── Inversion cockpit (ADR-0008) ────────────────────────────────────
  // Sur le hub Intelligence /accounts/[companyId], le contenu passe cobalt :
  // la sidebar bascule en clair pour éviter un cobalt-sur-cobalt qui fond
  // le seam. Le reste de l'app garde la sidebar cobalt.
  const light = pathname.startsWith("/prospection/accounts/")

  const handleMouseEnter = () => {
    setIsCollapsed(false)
  }

  const handleMouseLeave = () => {
    setIsCollapsed(true)
  }

  return (
    <aside className="w-16 h-full shrink-0 relative select-none">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "absolute left-0 top-0 h-full flex flex-col justify-between border-r transition-all duration-300 ease-in-out z-30 shadow-2xl overflow-x-hidden",
          light ? "bg-surface border-border text-heading" : "bg-primary border-white/10 text-white",
          isCollapsed ? "w-16" : "w-64"
        )}
      >

        {/* ── Logo + Nav ────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-y-auto py-5">

          {/* Logo */}
          <div className={cn(
            "pb-6 mb-2 border-b flex items-center transition-all duration-300",
            light ? "border-border" : "border-white/10",
            isCollapsed ? "px-4 justify-center" : "px-6"
          )}>
            <Link href="/cockpit" className="flex items-center gap-2.5">
              <Image
                src="/icon-512.png"
                alt="KREDO Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain shrink-0"
              />
              {!isCollapsed && (
                <span className={cn(
                  "text-xl font-bold tracking-tight shrink-0",
                  light ? "text-heading" : "text-secondary"
                )}>
                  KREDO
                </span>
              )}
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 space-y-5">
            {mainMenuItems.map((item) => {
              // ── Groupe : Business / Ressources / Pilotage ──────────
              if (item.items) {
                return (
                  <div key={item.label} className="space-y-1.5">
                    {isCollapsed ? (
                      <div className="h-4 flex items-center justify-center">
                        <div className={cn("w-full border-t", light ? "border-border" : "border-white/10")} />
                      </div>
                    ) : (
                      <h4 className={cn("px-3 text-[10px] font-bold uppercase tracking-wider", light ? "text-muted" : "text-white/40")}>
                        {item.label}
                      </h4>
                    )}
                    <div className="space-y-1">
                      {item.items.map((module) => (
                        <ModuleItem key={module.label} item={module} pathname={pathname} light={light} isCollapsed={isCollapsed} />
                      ))}
                    </div>
                  </div>
                )
              }

              // ── Item standalone : Cockpit, Paramètres ───────────────
              return (
                <div key={item.label}>
                  <ModuleItem item={item} pathname={pathname} light={light} isCollapsed={isCollapsed} />
                </div>
              )
            })}
          </nav>
        </div>

        {/* ── Footer : session utilisateur ─────────────────────────── */}
        <div className={cn("p-4 border-t transition-colors duration-300", light ? "border-border bg-canvas" : "border-white/10 bg-white/5")}>
          <div className={cn(
            "flex items-center rounded-lg border transition-all duration-300",
            light ? "border-border bg-canvas" : "border-white/10 bg-white/5",
            isCollapsed ? "p-1 justify-center" : "gap-2 px-2 py-1.5"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0",
              light ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/10 border-white/20 text-white"
            )}>
              GK
            </div>
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <h5 className={cn("text-xs font-semibold truncate", light ? "text-heading" : "text-white")}>Guillaume K.</h5>
                  <p className={cn("text-[10px] truncate", light ? "text-muted" : "text-white/60")}>guillaume@kredo.dev</p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => signOut())}
                  title="Se déconnecter"
                  className={cn(
                    "shrink-0 p-1.5 rounded transition-colors disabled:opacity-40",
                    light ? "text-muted hover:text-heading hover:bg-canvas" : "text-white/40 hover:text-white/80 hover:bg-white/10"
                  )}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m9 0l-3-3m3 3l-3 3" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </aside>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MainMenuItem, mainMenuItems } from "@/lib/navigation/main-menu.config"
import { getNavigationIcon } from "./navigation-icons"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  DesktopSidebar — 2 niveaux : groupe → module (pas de sous-pages)
//
//  Les sous-pages vivent dans la barre d'onglets de section (intra-module).
//  La sidebar liste uniquement les modules ; chaque module = 1 item cliquable.
// ─────────────────────────────────────────────────────────────────────────────

function ModuleItem({ item, pathname }: { item: MainMenuItem; pathname: string }) {
  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(item.href + "/")
    : false

  const canNavigate = !item.disabled && !item.comingSoon && !!item.href

  const baseClasses = cn(
    "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded transition-all duration-150 w-full",
    isActive
      ? "bg-white text-primary font-semibold shadow-[0_2px_6px_-2px_rgba(0,0,0,0.08)]"
      : "text-white/80 hover:bg-white/10 hover:text-white",
    !canNavigate && "opacity-50 cursor-not-allowed pointer-events-none"
  )

  const content = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2.5">
        {item.icon && getNavigationIcon(item.icon)}
        <span className="truncate">{item.label}</span>
      </div>
      {item.comingSoon && (
        <span className="text-[8px] font-bold text-white/70 bg-white/10 border border-white/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
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

  return (
    <aside className="w-64 bg-primary border-r border-white/10 h-full flex flex-col justify-between shrink-0 select-none text-white">

      {/* ── Logo + Nav ────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-y-auto py-5">

        {/* Logo */}
        <div className="px-6 pb-6 mb-2 border-b border-white/10 flex items-center">
          <Link href="/cockpit" className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-white">kredo</span>
            <span className="text-[10px] text-white/70 border border-white/20 px-1.5 py-0.5 rounded uppercase">
              Sales Hub
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-5">
          {mainMenuItems.map((item) => {
            // ── Groupe : Business / Ressources / Pilotage ──────────
            if (item.items) {
              return (
                <div key={item.label} className="space-y-1.5">
                  <h4 className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    {item.label}
                  </h4>
                  <div className="space-y-1">
                    {item.items.map((module) => (
                      <ModuleItem key={module.label} item={module} pathname={pathname} />
                    ))}
                  </div>
                </div>
              )
            }

            // ── Item standalone : Cockpit, Paramètres ───────────────
            return (
              <div key={item.label}>
                <ModuleItem item={item} pathname={pathname} />
              </div>
            )
          })}
        </nav>
      </div>

      {/* ── Footer : session utilisateur ─────────────────────────── */}
      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xs text-white shrink-0">
            GK
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-semibold text-white truncate">Guillaume K.</h5>
            <p className="text-[10px] text-white/60 truncate">guillaume@kredo.dev</p>
          </div>
        </div>
      </div>

    </aside>
  )
}

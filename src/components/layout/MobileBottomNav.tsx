"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MainMenuItem, mainMenuItems } from "@/lib/navigation/main-menu.config"
import { getNavigationIcon } from "./navigation-icons"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  MobileBottomNav — dérivée du config, modules marqués `primary: true`
//
//  Source unique : main-menu.config.ts
//  Affiche `shortLabel` si défini, sinon `label`.
// ─────────────────────────────────────────────────────────────────────────────

function collectPrimaryItems(items: MainMenuItem[]): MainMenuItem[] {
  const result: MainMenuItem[] = []
  for (const item of items) {
    if (item.primary && item.href) {
      result.push(item)
    }
    if (item.items) {
      result.push(...collectPrimaryItems(item.items))
    }
  }
  return result
}

const primaryNavItems = collectPrimaryItems(mainMenuItems)

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around px-2 pb-safe z-50 shadow-[0_-2px_10px_-4px_rgba(0,0,0,0.06)]">
      {primaryNavItems.map((item) => {
        const isActive = item.href
          ? pathname === item.href || pathname.startsWith(item.href + "/")
          : false

        return (
          <Link
            key={item.href}
            href={item.href!}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-1 transition-all duration-150 active:scale-95 text-center px-1",
              isActive ? "text-primary font-semibold" : "text-muted hover:text-heading"
            )}
          >
            <div className={cn(
              "p-1 rounded-md transition-colors",
              isActive ? "bg-primary/5 text-primary" : "text-muted"
            )}>
              {item.icon && getNavigationIcon(item.icon)}
            </div>
            <span className="text-[10px] tracking-tight truncate max-w-full">
              {item.shortLabel ?? item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

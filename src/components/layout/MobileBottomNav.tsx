"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { getNavigationIcon } from "./navigation-icons"
import { cn } from "@/lib/utils"

export function MobileBottomNav() {
  const pathname = usePathname()

  const navItems = [
    { label: "Cockpit", href: "/cockpit", icon: "cockpit" },
    { label: "Missions", href: "/missions", icon: "sales" },
    { label: "Prospection", href: "/prospection", icon: "prospection" },
    { label: "Proposals", href: "/proposals", icon: "proposal" },
    { label: "Finance", href: "/finance", icon: "finance" }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around px-2 pb-safe z-50 shadow-[0_-2px_10px_-4px_rgba(0,0,0,0.06)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-1 transition-all duration-150 active:scale-95 text-center px-1 text-muted",
              isActive ? "text-primary font-semibold" : "hover:text-heading"
            )}
          >
            <div className={cn("p-1 rounded-md transition-colors", isActive ? "bg-primary/5 text-primary" : "text-muted")}>
              {getNavigationIcon(item.icon)}
            </div>
            <span className="text-[10px] tracking-tight truncate max-w-full">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MainMenuItem, mainMenuItems } from "@/lib/navigation/main-menu.config"
import { getNavigationIcon } from "./navigation-icons"
import { cn } from "@/lib/utils"

export function DesktopSidebar() {
  const pathname = usePathname()

  const renderMenuItem = (item: MainMenuItem, isSubItem = false) => {
    const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + "/") : false
    const isClickable = !item.disabled && !item.comingSoon && item.href

    const content = (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2.5">
          {item.icon && getNavigationIcon(item.icon)}
          <span className="truncate">{item.label}</span>
        </div>
        {item.comingSoon && (
          <span className="text-[8px] font-bold text-white/70 bg-white/10 border border-white/20 px-1.5 py-0.5 rounded uppercase tracking-wider scale-90">
            Bientôt
          </span>
        )}
      </div>
    )

    const baseClasses = cn(
      "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded transition-all duration-150 relative",
      isSubItem ? "pl-9" : "",
      isActive 
        ? "bg-white text-primary font-semibold shadow-[0_2px_6px_-2px_rgba(0,0,0,0.08)]" 
        : "text-white/80 hover:bg-white/10 hover:text-white",
      item.disabled ? "opacity-40 cursor-not-allowed" : "",
      item.comingSoon ? "opacity-60 cursor-not-allowed" : ""
    )

    if (isClickable) {
      return (
        <Link 
          key={item.label} 
          href={item.href!} 
          className={baseClasses}
          aria-current={isActive ? "page" : undefined}
        >
          {content}
        </Link>
      )
    }

    return (
      <div key={item.label} className={baseClasses}>
        {content}
      </div>
    )
  }

  return (
    <aside className="w-64 bg-primary border-r border-white/10 h-full flex flex-col justify-between shrink-0 select-none text-white">
      {/* Upper Area: Logo & Nav items */}
      <div className="flex flex-col flex-1 overflow-y-auto py-5">
        {/* Logo Branding */}
        <div className="px-6 pb-6 mb-2 border-b border-white/10 flex items-center justify-between">
          <Link href="/cockpit" className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-white">kredo</span>
            <span className="text-[10px] text-white/70 border border-white/20 px-1.5 py-0.5 rounded font-mono uppercase">
              Sales Hub
            </span>
          </Link>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 space-y-5">
          {mainMenuItems.map((group) => {
            // If group has sub-items (Business, Ressources, Pilotage)
            if (group.items) {
              return (
                <div key={group.label} className="space-y-1.5">
                  <h4 className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    {group.label}
                  </h4>
                  <div className="space-y-1">
                    {group.items.map((subItem) => renderMenuItem(subItem))}
                  </div>
                </div>
              )
            }

            // Normal root items (Cockpit, Paramètres)
            return (
              <div key={group.label} className="space-y-1">
                {renderMenuItem(group)}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Footer Area: User details / Session */}
      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xs text-white font-mono shrink-0">
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

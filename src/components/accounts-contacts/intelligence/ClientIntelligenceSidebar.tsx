"use client"

import { cn } from "@/lib/utils"
import type { TabKey } from "./intelligence-process"

type SidebarIconName = "home" | "socle" | "company" | "sector" | "issues" | "strategy" | "roadmap"

export const CLIENT_INTELLIGENCE_NAV_ITEMS: ReadonlyArray<{
  key: TabKey
  label: string
  icon: SidebarIconName
}> = [
  { key: "accueil", label: "Accueil", icon: "home" },
  { key: "socle", label: "Socle", icon: "socle" },
  { key: "connaissance", label: "Entreprise", icon: "company" },
  { key: "secteur", label: "Secteur", icon: "sector" },
  { key: "enjeux", label: "Enjeux", icon: "issues" },
  { key: "strategie", label: "Stratégie", icon: "strategy" },
  { key: "roadmap", label: "Roadmap", icon: "roadmap" },
] as const

interface ClientIntelligenceSidebarProps {
  activeTab: TabKey
  onBackToAccounts: () => void
  onTabChange: (tab: TabKey) => void
}

function SidebarIcon({ name }: { name: SidebarIconName }) {
  const commonProps = {
    className: "size-4 shrink-0",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (name === "home") {
    return <svg {...commonProps}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></svg>
  }
  if (name === "socle") {
    return <svg {...commonProps}><rect x="3" y="16" width="18" height="5" rx="1" /><path d="m5 16 2.5-9h9L19 16" /><path d="M9 7V4h6v3" /></svg>
  }
  if (name === "company") {
    return <svg {...commonProps}><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16" /><path d="M17 9h3v12" /><path d="M8 7h5M8 11h5M8 15h5M3 21h18" /></svg>
  }
  if (name === "sector") {
    return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
  }
  if (name === "issues") {
    return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg>
  }
  if (name === "strategy") {
    return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.1 5-4.9 2 2.1-5 4.9-2Z" /></svg>
  }
  return <svg {...commonProps}><path d="M5 21V4" /><path d="M5 5c4-3 7 3 14 0v10c-7 3-10-3-14 0" /></svg>
}

export function ClientIntelligenceSidebar({
  activeTab,
  onBackToAccounts,
  onTabChange,
}: ClientIntelligenceSidebarProps) {
  return (
    <nav
      aria-label="Navigation du Cockpit Intelligence"
      className="flex h-full w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
    >
      <button
        type="button"
        onClick={onBackToAccounts}
        className={cn(
          "inline-flex min-h-10 w-full items-center justify-center rounded-md border border-edito-navy px-3 text-center text-xs font-bold transition-all shadow-sm",
          "bg-edito-navy text-white hover:bg-edito-navy/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30"
        )}
      >
        <span>Liste des comptes</span>
      </button>

      <div className="mt-5 border-t border-edito-border pt-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
          Chapitres
        </p>
        <div className="mt-2 space-y-1">
          {CLIENT_INTELLIGENCE_NAV_ITEMS.map((item) => {
            const isActive = item.key === activeTab
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onTabChange(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 px-3 text-left text-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
                  isActive
                    ? "border-l-edito-brass bg-edito-surface text-edito-navy"
                    : "border-l-transparent text-edito-muted hover:bg-edito-surface/70 hover:text-edito-body",
                )}
              >
                <span className={cn("text-edito-navy", !isActive && "opacity-75")}>
                  <SidebarIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

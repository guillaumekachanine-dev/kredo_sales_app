"use client"

import { cn } from "@/lib/utils"

export type AutomationsTabKey = "journal" | "sante" | "couts"

interface AutomationsLocalNavigationProps {
  activeTab: AutomationsTabKey
  onTabChange: (tab: AutomationsTabKey) => void
}

type IconName = "journal" | "sante" | "couts"

const NAV_ITEMS: ReadonlyArray<{
  key: AutomationsTabKey
  label: string
  icon: IconName
}> = [
  { key: "journal", label: "Journal d'exécution", icon: "journal" },
  { key: "sante", label: "Santé des workflows", icon: "sante" },
  { key: "couts", label: "Coûts", icon: "couts" },
] as const

function NavIcon({ name }: { name: IconName }) {
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

  if (name === "journal") {
    return (
      <svg {...commonProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    )
  }
  if (name === "sante") {
    return (
      <svg {...commonProps}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  }
  return (
    <svg {...commonProps}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

export function AutomationsLocalNavigation({
  activeTab,
  onTabChange,
}: AutomationsLocalNavigationProps) {
  return (
    <nav
      aria-label="Navigation locale Automatisations"
      className="flex h-full w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
    >
      <div className="flex min-h-10 w-full items-center gap-2 rounded-md border border-edito-border bg-edito-surface px-3 text-left text-xs font-bold text-edito-navy select-none shadow-sm">
        <span>Automatisations</span>
      </div>

      <div className="mt-5 border-t border-edito-border pt-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
          Chapitres
        </p>
        <div className="mt-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeTab
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onTabChange(item.key)}
                aria-current={isActive ? "page" : undefined}
                aria-selected={isActive}
                role="tab"
                className={cn(
                  "flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 px-3 text-left text-xs font-semibold transition-colors cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
                  isActive
                    ? "border-l-edito-brass bg-edito-surface text-edito-navy shadow-xs font-bold"
                    : "border-l-transparent text-edito-muted hover:bg-edito-surface/70 hover:text-edito-body",
                )}
              >
                <span className={cn("text-edito-navy", !isActive && "opacity-75")}>
                  <NavIcon name={item.icon} />
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

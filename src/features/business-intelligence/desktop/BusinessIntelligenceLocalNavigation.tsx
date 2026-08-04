"use client"

import { cn } from "@/lib/utils"

export type BiTabKey = "priorities" | "windows" | "sectors"

const SECTIONS: Array<{ id: BiTabKey; label: string; icon: BiTabKey }> = [
  { id: "priorities", label: "Priorités", icon: "priorities" },
  { id: "windows", label: "Fenêtres", icon: "windows" },
  { id: "sectors", label: "Secteurs", icon: "sectors" },
]

function BiSidebarIcon({ name }: { name: BiTabKey }) {
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

  if (name === "priorities") {
    return (
      <svg {...commonProps}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  }
  if (name === "windows") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  }
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

interface BusinessIntelligenceLocalNavigationProps {
  active: BiTabKey
  onChange: (tab: BiTabKey) => void
}

export function BusinessIntelligenceLocalNavigation({
  active,
  onChange,
}: BusinessIntelligenceLocalNavigationProps) {
  return (
    <nav
      aria-label="Navigation locale Business Intelligence"
      className="flex h-full w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
    >
      {/* Title box positioned exactly like 'Retour aux comptes' button */}
      <div className="flex min-h-10 w-full items-center gap-2 rounded-md border border-edito-border bg-edito-surface px-3 text-left text-xs font-bold text-edito-navy select-none">
        <span>Business Intelligence</span>
      </div>

      <div className="mt-5 border-t border-edito-border pt-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
          Chapitres
        </p>
        <div className="mt-2 space-y-1">
          {SECTIONS.map((section) => {
            const isActive = active === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onChange(section.id)}
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
                  <BiSidebarIcon name={section.icon} />
                </span>
                <span className="truncate">{section.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

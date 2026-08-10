"use client"

import { cn } from "@/lib/utils"
import { useCrmAccountLauncherStore } from "@/hooks/use-crm-account-launcher"

export type PiTabKey = "strategy" | "chapter_1" | "chapter_2" | "chapter_3"

const SECTIONS: Array<{ id: PiTabKey; label: string; icon: PiTabKey }> = [
  { id: "strategy", label: "Stratégie", icon: "strategy" },
  { id: "chapter_1", label: "Chapitre 1 : Fenêtres d'opportunités", icon: "chapter_1" },
  { id: "chapter_2", label: "Chapitre 2 : Approches commerciales", icon: "chapter_2" },
  { id: "chapter_3", label: "Chapitre 3 : Playbooks", icon: "chapter_3" },
]

function PiSidebarIcon({ name }: { name: PiTabKey }) {
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

  if (name === "strategy") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    )
  }
  if (name === "chapter_1") {
    return (
      <svg {...commonProps}>
        <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M3 15h6" />
        <path d="M3 18h6" />
      </svg>
    )
  }
  if (name === "chapter_2") {
    return (
      <svg {...commonProps}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
  if (name === "chapter_3") {
    return (
      <svg {...commonProps}>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
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

interface ProspectionIntelligenceLocalNavigationProps {
  active: PiTabKey
  onChange: (tab: PiTabKey) => void
}

export function ProspectionIntelligenceLocalNavigation({
  active,
  onChange,
}: ProspectionIntelligenceLocalNavigationProps) {
  return (
    <nav
      aria-label="Navigation locale Prospection"
      className="flex h-full w-[15rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
    >
      <div className="flex min-h-10 w-full items-center gap-2 rounded-md border border-edito-border bg-edito-surface px-3 text-left text-xs font-bold text-edito-navy select-none">
        <span>Prospection</span>
      </div>

      <div className="mt-5 border-t border-edito-border pt-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
          Sections
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
                title={section.label}
              >
                <span className={cn("text-edito-navy", !isActive && "opacity-75")}>
                  <PiSidebarIcon name={section.icon} />
                </span>
                <span className="truncate">{section.label}</span>
              </button>
            )
          })}
          <div className="my-2 border-t border-edito-border/50" />
          <button
            type="button"
            onClick={() => useCrmAccountLauncherStore.getState().open()}
            className={cn(
              "flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 border-l-transparent px-3 text-left text-xs font-semibold text-edito-muted transition-colors hover:bg-edito-surface/70 hover:text-edito-body",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
            )}
          >
            <span className="text-edito-navy opacity-75">
              <svg
                className="size-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3.75 21h16.5M4.5 3h15A1.5 1.5 0 0 1 21 4.5V21H3V4.5A1.5 1.5 0 0 1 4.5 3zM8.25 7.5h.008v.008H8.25V7.5zm0 3.75h.008v.008H8.25v-.008zm0 3.75h.008v.008H8.25V15zm3.742-7.5H12v.008h-.008V7.5zm0 3.75H12v.008h-.008v-.008zm0 3.75H12v.008h-.008V15zm3.75-7.5h.008v.008h-.008V7.5zm0 3.75h.008v.008h-.008v-.008zm0 3.75h.008v.008h-.008V15z" />
              </svg>
            </span>
            <span className="truncate">CRM Launcher</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

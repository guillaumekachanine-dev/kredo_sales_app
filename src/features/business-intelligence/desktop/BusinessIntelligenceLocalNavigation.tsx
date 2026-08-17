"use client"

import { cn } from "@/lib/utils"
import { useCrmAccountLauncherStore } from "@/hooks/use-crm-account-launcher"

export type BiTabKey = "priorities" | "windows" | "sectors" | "value_chain" | "competitive_env"

const SECTIONS: Array<{ id: BiTabKey; label: string; icon: BiTabKey }> = [
  { id: "priorities", label: "Brief stratégique", icon: "priorities" },
  { id: "windows", label: "Fenêtres", icon: "windows" },
  { id: "sectors", label: "Analyse sectorielle", icon: "sectors" },
  { id: "value_chain", label: "Chaîne de valeur", icon: "value_chain" },
  { id: "competitive_env", label: "Environnement concurrentiel", icon: "competitive_env" },
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
  if (name === "value_chain") {
    return (
      <svg {...commonProps}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    )
  }
  if (name === "competitive_env") {
    return (
      <svg {...commonProps}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
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
  onStudiesClick?: () => void
  onPlaybooksClick?: () => void
}

export function BusinessIntelligenceLocalNavigation({
  active,
  onChange,
  onStudiesClick,
  onPlaybooksClick,
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

      <div className="mt-5 border-t border-edito-border pt-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
          Modules
        </p>
        <div className="mt-2 space-y-1">
          <button
            type="button"
            onClick={onStudiesClick}
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
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </span>
            <span className="truncate">Études sectorielles</span>
          </button>

          <button
            type="button"
            onClick={onPlaybooksClick}
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
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </span>
            <span className="truncate">Playbooks</span>
          </button>

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

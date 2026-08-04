"use client"

import { cn } from "@/lib/utils"
import type { VeilleSection } from "./veille-desktop-contracts"
import { useCrmAccountLauncherStore } from "@/hooks/use-crm-account-launcher"

const SECTIONS: Array<{ id: VeilleSection; label: string }> = [
  { id: "news", label: "Actualités" },
  { id: "watched-accounts", label: "Comptes surveillés" },
  { id: "strategic-analysis", label: "Analyses stratégiques" },
  { id: "history", label: "Historique" },
]

function VeilleSidebarIcon({ name }: { name: VeilleSection }) {
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

  if (name === "news") {
    return (
      <svg {...commonProps}>
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" />
      </svg>
    )
  }
  if (name === "watched-accounts") {
    return (
      <svg {...commonProps}>
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  if (name === "strategic-analysis") {
    return (
      <svg {...commonProps}>
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
        <path d="m16.24 7.76-2.12 5.66-5.66 2.12 2.12-5.66 5.66-2.12Z" />
      </svg>
    )
  }
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

export function VeilleLocalNavigation({
  active,
  onChange,
}: {
  active: VeilleSection
  onChange: (section: VeilleSection) => void
}) {
  return (
    <nav
      aria-label="Navigation locale Veille & actualités"
      className="flex h-full w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
    >
      {/* Title box positioned exactly like 'Retour aux comptes' button */}
      <div className="flex min-h-10 w-full items-center gap-2 rounded-md border border-edito-border bg-edito-surface px-3 text-left text-xs font-bold text-edito-navy select-none">
        <span>Veille & actualités</span>
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
                  <VeilleSidebarIcon name={section.id} />
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

"use client"

import { cn } from "@/lib/utils"
import type { VeilleSection } from "./veille-desktop-contracts"

const SECTIONS: Array<{ id: VeilleSection; label: string }> = [
  { id: "news", label: "Actualités" },
  { id: "watched-accounts", label: "Comptes surveillés" },
  { id: "strategic-analysis", label: "Analyses stratégiques" },
  { id: "history", label: "Historique" },
]

export function VeilleLocalNavigation({
  active,
  onChange,
}: {
  active: VeilleSection
  onChange: (section: VeilleSection) => void
}) {
  return (
    <aside className="w-[132px] shrink-0 border-r border-border bg-edito-canvas/70">
      <p className="px-4 pb-5 pt-6 text-[9px] font-bold uppercase leading-4 tracking-[0.12em] text-heading">
        Veille &<br />actualités
      </p>
      <nav aria-label="Navigation locale Veille & actualités">
        {SECTIONS.map((section) => {
          const isActive = active === section.id
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative min-h-12 w-full px-4 text-left text-[11px] font-semibold text-heading outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
                isActive
                  ? "bg-primary/[0.07] font-bold before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand-brass"
                  : "hover:bg-surface-hover/70",
              )}
            >
              {section.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

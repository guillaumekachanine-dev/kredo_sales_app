"use client"

import { KnowledgeHubMode } from "./knowledge-hub.types"

interface MobileModeTabsProps {
  activeMode: KnowledgeHubMode
  onChangeMode: (mode: KnowledgeHubMode) => void
}

export function KnowledgeHubMobileModeTabs({
  activeMode,
  onChangeMode,
}: MobileModeTabsProps) {
  const modes: { id: KnowledgeHubMode; label: string; icon: string }[] = [
    { id: "library", label: "Explorer", icon: "🔍" },
    { id: "workshops", label: "Ateliers", icon: "🛠️" },
    { id: "ask", label: "Interroger", icon: "✨" },
  ]

  return (
    <div className="sticky top-0 z-20 w-full border-b border-edito-border bg-edito-surface">
      <nav className="flex justify-around w-full px-2" aria-label="Modes Mobile du Knowledge Hub">
        {modes.map((mode) => {
          const isActive = activeMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChangeMode(mode.id)}
              className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors outline-none ${
                isActive
                  ? "text-edito-navy after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-edito-brass"
                  : "text-edito-muted hover:text-edito-body"
              }`}
            >
              <span className="text-xs" role="img" aria-hidden="true">
                {mode.icon}
              </span>
              <span>{mode.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

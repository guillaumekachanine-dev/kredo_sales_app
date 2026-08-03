"use client"

import { KnowledgeHubMode } from "./knowledge-hub.types"

interface KnowledgeHubModeNavigationProps {
  activeMode: KnowledgeHubMode
  onChangeMode: (mode: KnowledgeHubMode) => void
}

export function KnowledgeHubModeNavigation({
  activeMode,
  onChangeMode,
}: KnowledgeHubModeNavigationProps) {
  const modes: { id: KnowledgeHubMode; label: string; icon: string }[] = [
    { id: "library", label: "Bibliothèque", icon: "📚" },
    { id: "workshops", label: "Ateliers", icon: "🛠️" },
    { id: "ask", label: "Interroger", icon: "✨" },
  ]

  return (
    <div className="flex border-b border-edito-border bg-edito-surface">
      <nav className="mx-auto flex w-full max-w-5xl justify-center px-4" aria-label="Modes du Knowledge Hub">
        {modes.map((mode) => {
          const isActive = activeMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChangeMode(mode.id)}
              className={`relative flex min-h-12 items-center gap-2 px-6 text-xs font-bold uppercase tracking-wider transition-colors outline-none focus-visible:bg-edito-chip ${
                isActive
                  ? "text-edito-navy after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-edito-brass"
                  : "text-edito-muted hover:text-edito-body"
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

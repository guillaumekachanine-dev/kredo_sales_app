"use client"

import { cn } from "@/lib/utils"

export function FilterChip({
  label,
  active,
  compact = false,
  onToggle,
}: {
  label: string
  active: boolean
  compact?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center rounded-[var(--radius-medium)] border font-semibold transition-colors",
        compact ? "px-2.5 py-1 text-[11px] leading-4" : "px-3 py-1.5 text-xs",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-surface text-muted hover:border-primary/30 hover:text-heading"
      )}
    >
      {label}
    </button>
  )
}

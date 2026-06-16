import { cn } from "@/lib/utils"

export function sectionTabListClasses(className?: string) {
  return cn(
    "flex items-stretch overflow-x-auto scrollbar-none select-none",
    className,
  )
}

export function sectionTabItemClasses({
  active,
  disabled = false,
  compact = false,
}: {
  active: boolean
  disabled?: boolean
  compact?: boolean
}) {
  return cn(
    "group relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent",
    "transition-[background-color,border-color,color,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
    "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-canvas)]",
    compact ? "h-10 px-3 text-xs font-medium" : "h-10 px-1 text-xs font-medium",
    active
      ? "text-heading font-semibold border-primary"
      : "text-muted hover:text-heading hover:border-border",
    disabled && "pointer-events-none cursor-not-allowed opacity-45",
  )
}

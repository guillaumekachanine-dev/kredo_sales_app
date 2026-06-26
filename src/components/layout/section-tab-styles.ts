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

export function sectionTabHomeClasses(active: boolean) {
  return cn(
    "relative mr-1.5 min-w-[10.5rem] justify-start overflow-hidden border-r border-border/70",
    "shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12)]",
    "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:content-['']",
    "after:absolute after:right-0 after:top-2 after:bottom-2 after:w-px after:bg-gradient-to-b after:from-transparent after:via-border after:to-transparent after:content-['']",
    active
      ? "before:bg-primary text-slate-950 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(226,232,240,0.96)_32%,rgba(191,219,254,0.92)_100%)]"
      : "before:bg-slate-300/70 text-body bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.98)_55%,rgba(241,245,249,0.98)_100%)] hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.99)_0%,rgba(241,245,249,0.99)_45%,rgba(219,234,254,0.95)_100%)]"
  )
}

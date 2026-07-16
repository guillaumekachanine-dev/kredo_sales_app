"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

const IconFilter = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 5h14M6 10h8M9 15h2" />
  </svg>
)

export type MobileFilterTriggerProps = {
  activeCount?: number
  label?: string
  onClick: () => void
  disabled?: boolean
  className?: string
  compact?: boolean
  iconOnly?: boolean
}

export function MobileFilterTrigger({
  activeCount = 0,
  label = "Filtres",
  onClick,
  disabled,
  className,
  compact = false,
  iconOnly = false,
}: MobileFilterTriggerProps) {
  const ariaLabel =
    activeCount > 0
      ? `${label} — ${activeCount} filtre${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""}`
      : label

  const isFilterActive = activeCount > 0

  return (
    <Button
      variant="secondary"
      size="md"
      disabled={disabled}
      onClick={onClick}
      leftIcon={<IconFilter className={cn(isFilterActive && "text-cat-active")} />}
      aria-label={ariaLabel}
      className={cn(
        "relative min-h-[44px]",
        compact && "px-2.5 text-xs",
        iconOnly && "size-11 min-h-11 min-w-11 px-0 py-0",
        isFilterActive && "border-cat-active text-cat-active border-2 shadow-sm",
        className,
      )}
      style={compact && !iconOnly ? { height: "1.75rem", minHeight: "1.75rem" } : undefined}
    >
      {iconOnly ? <span className="sr-only">{label}</span> : label}
      {isFilterActive ? (
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-cat-active px-1 text-[10px] font-bold leading-none text-white",
            iconOnly && "absolute -right-1.5 -top-1.5",
          )}
        >
          {activeCount}
        </span>
      ) : null}
    </Button>
  )
}

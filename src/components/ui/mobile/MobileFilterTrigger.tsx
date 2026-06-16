"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

const IconFilter = () => (
  <svg
    className="size-4"
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
}

export function MobileFilterTrigger({
  activeCount = 0,
  label = "Filtres",
  onClick,
  disabled,
  className,
}: MobileFilterTriggerProps) {
  const ariaLabel =
    activeCount > 0
      ? `${label} — ${activeCount} filtre${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""}`
      : label

  return (
    <Button
      variant="secondary"
      size="md"
      disabled={disabled}
      onClick={onClick}
      leftIcon={<IconFilter />}
      aria-label={ariaLabel}
      className={cn("relative min-h-[44px]", className)}
    >
      {label}
      {activeCount > 0 ? (
        <span
          aria-hidden="true"
          className="inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-fg"
        >
          {activeCount}
        </span>
      ) : null}
    </Button>
  )
}

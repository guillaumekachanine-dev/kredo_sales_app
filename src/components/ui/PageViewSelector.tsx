"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type PageViewSelectorItem = {
  value: string
  label: string
  ariaLabel?: string
}

export type PageViewSelectorProps = {
  items: PageViewSelectorItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}

export function PageViewSelector({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: PageViewSelectorProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-[var(--radius-medium)] border border-border bg-surface p-0.5",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            aria-label={item.ariaLabel ?? item.label}
            aria-pressed={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex h-7 items-center rounded-[calc(var(--radius-medium)-1px)] px-3",
              "text-[length:var(--font-size-label-sm)] font-semibold whitespace-nowrap",
              "transition-[background-color,color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
              "outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]",
              "focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-canvas)]",
              isActive
                ? "bg-primary text-primary-fg"
                : "text-body hover:bg-surface-hover hover:text-heading",
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

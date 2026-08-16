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
  activeClassName?: string
}

export function PageViewSelector({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  activeClassName,
}: PageViewSelectorProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-surface p-1 shadow-inner shadow-black/[0.02]",
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
              "inline-flex h-8 items-center rounded-md px-3.5",
              "text-xs font-semibold whitespace-nowrap cursor-pointer",
              "transition-all duration-150 ease-out",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isActive
                ? cn(
                    "bg-gradient-to-b from-[#2554B8] to-[#1D47A2] text-white font-bold shadow-sm shadow-blue-950/20 border border-white/20 scale-[1.01]",
                    activeClassName
                  )
                : "text-body hover:bg-canvas hover:text-heading",
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

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
        "inline-flex items-center rounded-lg border border-border/80 bg-surface p-1 shadow-inner shadow-black/[0.03]",
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
              "inline-flex h-8 items-center rounded-md px-4",
              "text-xs font-semibold whitespace-nowrap cursor-pointer select-none",
              "transition-all duration-200 ease-out",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isActive
                ? cn(
                    "bg-gradient-to-b from-[#2554B8] via-[#1E48A7] to-[#153A8A] dark:from-[#2A5CD0] dark:to-[#1C459D]",
                    "text-white font-bold tracking-tight text-[12.5px]",
                    "shadow-md shadow-[#2554B8]/30 dark:shadow-blue-950/50",
                    "border border-white/30 border-t-white/50 dark:border-white/20",
                    "scale-[1.02]",
                    "hover:brightness-110 hover:scale-[1.03] hover:shadow-lg hover:shadow-[#2554B8]/40 active:scale-[0.99]",
                    activeClassName
                  )
                : "text-body/90 font-medium hover:text-heading hover:bg-canvas/90 dark:hover:bg-slate-800/80 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]",
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

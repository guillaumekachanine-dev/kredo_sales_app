"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface EntityFilterBarProps {
  options: { label: string; value: string }[]
  selected: string
  onChange: (value: string) => void
  className?: string
}

export function EntityFilterBar({
  options,
  selected,
  onChange,
  className
}: EntityFilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {options.map((opt) => {
        const isActive = selected === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-semibold transition-colors border active:scale-95",
              isActive
                ? "bg-primary text-primary-fg border-transparent"
                : "bg-surface text-body border-border hover:bg-surface-hover"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

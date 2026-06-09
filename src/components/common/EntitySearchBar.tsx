"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface EntitySearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function EntitySearchBar({
  value,
  onChange,
  placeholder = "Rechercher...",
  className
}: EntitySearchBarProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-1.5 text-xs bg-canvas border border-border rounded-md text-heading placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
      />
    </div>
  )
}

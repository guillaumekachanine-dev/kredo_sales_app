"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface DataTableToolbarProps {
  search?: React.ReactNode
  filters?: React.ReactNode
  summary?: React.ReactNode
  actions?: React.ReactNode
  primaryAction?: React.ReactNode
  className?: string
}

export function DataTableToolbar({
  search,
  filters,
  summary,
  actions,
  primaryAction,
  className,
}: DataTableToolbarProps) {
  const hasTopRow = Boolean(search || filters)
  const hasBottomRow = Boolean(summary || actions || primaryAction)

  if (!hasTopRow && !hasBottomRow) {
    return null
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {hasTopRow ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            {search}
            {filters}
          </div>
          {primaryAction ? <div className="shrink-0">{primaryAction}</div> : null}
        </div>
      ) : null}

      {hasBottomRow ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-sm text-body">{summary}</div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

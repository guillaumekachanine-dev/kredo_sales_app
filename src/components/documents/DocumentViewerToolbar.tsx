import React from "react"
import { cn } from "@/lib/utils"

export interface DocumentViewerToolbarProps {
  fileName: string
  actions?: React.ReactNode
  className?: string
}

export function DocumentViewerToolbar({
  fileName,
  actions,
  className
}: DocumentViewerToolbarProps) {
  return (
    <header className={cn("h-12 bg-surface border-b border-border px-4 flex items-center justify-between shrink-0 select-none", className)}>
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5-3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-xs font-bold text-heading truncate">{fileName}</span>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  )
}

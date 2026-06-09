import React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface EntityListItemProps {
  title: string
  description?: string
  metadata?: React.ReactNode
  icon?: React.ReactNode
  actions?: React.ReactNode
  href?: string
  className?: string
}

export function EntityListItem({
  title,
  description,
  metadata,
  icon,
  actions,
  href,
  className
}: EntityListItemProps) {
  const content = (
    <div className="flex items-center justify-between gap-4 py-2 px-3 hover:bg-canvas/40 rounded-md transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="shrink-0 text-muted">{icon}</div>}
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-heading truncate">{title}</h4>
          {description && <p className="text-[10px] text-body truncate mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {metadata && <div className="text-[10px] text-muted">{metadata}</div>}
        {actions && <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">{actions}</div>}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className={cn("block select-none", className)}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}

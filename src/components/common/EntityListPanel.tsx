import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

export interface EntityListPanelProps {
  title: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function EntityListPanel({
  title,
  description,
  children,
  actions,
  className
}: EntityListPanelProps) {
  return (
    <SurfaceCard className={cn("p-5 flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-3">
        <div>
          <h3 className="text-xs font-semibold text-heading leading-tight">{title}</h3>
          {description && <p className="text-[10px] text-muted mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </SurfaceCard>
  )
}

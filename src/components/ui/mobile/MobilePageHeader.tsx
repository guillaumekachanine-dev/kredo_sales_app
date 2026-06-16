import React from "react"
import { cn } from "@/lib/utils"

export interface MobilePageHeaderProps {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  contextControl?: React.ReactNode
  className?: string
}

export function MobilePageHeader({
  eyebrow,
  title,
  description,
  actions,
  contextControl,
  className,
}: MobilePageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="mb-2 text-[length:var(--font-size-label-sm)] font-medium uppercase tracking-[0.08em] text-muted">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="font-heading text-[length:var(--font-size-title-mobile-lg)] leading-[var(--line-height-title-mobile-lg)] text-heading">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-[32rem] text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] text-body">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 items-start gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {contextControl ? <div>{contextControl}</div> : null}
    </header>
  )
}

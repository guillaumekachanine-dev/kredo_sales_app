"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface DrawerSectionProps {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  divided?: boolean
  className?: string
}

export function DrawerSection({
  title,
  description,
  actions,
  children,
  divided = false,
  className,
}: DrawerSectionProps) {
  return (
    <section
      className={cn(
        "space-y-4",
        divided && "border-t border-border pt-5",
        className,
      )}
    >
      {(title || description || actions) ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title ? <h3 className="text-sm font-semibold leading-6 text-heading">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-body">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}

      <div>{children}</div>
    </section>
  )
}

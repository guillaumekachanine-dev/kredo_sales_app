import React from "react"
import { cn } from "@/lib/utils"

interface MobileAgendaSectionProps {
  title: string
  count?: number
  children: React.ReactNode
  className?: string
}

export function MobileAgendaSection({
  title,
  count,
  children,
  className,
}: MobileAgendaSectionProps) {
  return (
    <section className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
          {title}
        </h2>
        {count !== undefined && count > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-canvas border border-border px-1.5 py-0.5 text-[10px] font-bold text-muted">
            {count}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 w-full">
        {children}
      </div>
    </section>
  )
}

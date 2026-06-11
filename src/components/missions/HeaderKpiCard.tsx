import React from "react"
import { cn } from "@/lib/utils"

interface HeaderKpiCardProps {
  label: string
  value: React.ReactNode
  className?: string
  valueClassName?: string
}

export function HeaderKpiCard({ label, value, className, valueClassName }: HeaderKpiCardProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-4 py-1 select-none shrink-0", className)}>
      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
        {label}
      </span>
      <span className={cn(
        "text-lg md:text-xl font-bold tracking-tight mt-0.5 block",
        valueClassName || "text-heading"
      )}>
        {value}
      </span>
    </div>
  )
}

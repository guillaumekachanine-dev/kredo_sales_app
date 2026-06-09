// Do not use colored left borders for card accents in Kredo. Use subtle surface accents instead.

import React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type SurfaceCardProps = {
  children: React.ReactNode
  className?: string
  accent?: "none" | "primary" | "success" | "warning" | "danger"
  href?: string
}

export function SurfaceCard({
  children,
  className,
  accent = "none",
  href
}: SurfaceCardProps) {
  const accentStyles = {
    none: "",
    primary: "bg-gradient-to-r from-primary/[0.03] to-transparent",
    success: "bg-gradient-to-r from-success/[0.03] to-transparent",
    warning: "bg-gradient-to-r from-warning/[0.03] to-transparent",
    danger: "bg-gradient-to-r from-danger/[0.03] to-transparent",
  }[accent]

  const baseClasses = cn(
    "bg-surface border border-border rounded-lg relative overflow-hidden transition-all duration-200",
    accentStyles,
    className
  )

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {children}
      </Link>
    )
  }

  return (
    <div className={baseClasses}>
      {children}
    </div>
  )
}

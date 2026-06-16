import React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type SurfaceCardAccent =
  | "none"
  | "primary"
  | "success"
  | "warning"
  | "danger"

export type SurfaceCardPadding = "none" | "compact" | "default" | "spacious"
export type SurfaceCardRadius = "sm" | "md" | "lg" | "xl"

export type SurfaceCardProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType
  children: React.ReactNode
  padding?: SurfaceCardPadding
  radius?: SurfaceCardRadius
  border?: boolean
  interactive?: boolean
  selected?: boolean
  href?: string
  accent?: SurfaceCardAccent
}

const paddingClasses: Record<SurfaceCardPadding, string> = {
  none: "",
  compact: "p-4",
  default: "p-5",
  spacious: "p-6",
}

const radiusClasses: Record<SurfaceCardRadius, string> = {
  sm: "rounded-[var(--radius-small)]",
  md: "rounded-[var(--radius-medium)]",
  lg: "rounded-[var(--radius-large)]",
  xl: "rounded-[var(--radius-xl)]",
}

const accentClasses: Record<SurfaceCardAccent, string> = {
  none: "",
  primary: "border-primary/20 bg-primary/[0.02]",
  success: "border-success/25 bg-success/[0.04]",
  warning: "border-warning/25 bg-warning/[0.05]",
  danger: "border-danger/20 bg-danger/[0.03]",
}

export function SurfaceCard({
  as,
  children,
  className,
  padding = "none",
  radius = "lg",
  border = true,
  interactive = false,
  selected = false,
  href,
  accent = "none",
  ...props
}: SurfaceCardProps) {
  const Comp = as ?? "div"

  const baseClasses = cn(
    "relative overflow-hidden bg-surface text-body",
    "transition-[background-color,border-color,color,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
    radiusClasses[radius],
    paddingClasses[padding],
    border ? "border border-border" : "border border-transparent",
    accentClasses[accent],
    interactive &&
      "cursor-pointer hover:border-primary/20 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-canvas)]",
    selected && "border-primary/35 bg-primary/[0.04]",
    className,
  )

  if (href) {
    return (
      <Link href={href} className={cn(baseClasses, !interactive && "focus-visible:outline-none")} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <Comp className={baseClasses} {...props}>
      {children}
    </Comp>
  )
}

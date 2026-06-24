import React, { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface EntityWorkspaceHeaderProps {
  /**
   * Title text rendered on the left.
   */
  title: string
  /**
   * KPI stat chips or badges slot rendered in the center.
   * On mobile, this falls below the title/actions with full width alignment.
   */
  kpis?: ReactNode
  /**
   * Action buttons rendered on the right.
   * Typically hidden on mobile view and visible from md screens onwards.
   */
  actions?: ReactNode
  className?: string
}

/**
 * EntityWorkspaceHeader provides a standardized page title area, KPIs container, and actions layout.
 *
 * Responsibilities:
 * - Position elements inside a responsive CSS grid matching KREDO styling guides.
 * - Center-align KPIs and place primary actions at the top right (hidden on mobile).
 * - Render border and padding dividers beneath the header area.
 *
 * Feature Responsibilities:
 * - Provide actual title text, render KPI cards/badges (e.g. StatChip), and action buttons.
 */
export function EntityWorkspaceHeader({
  title,
  kpis,
  actions,
  className,
}: EntityWorkspaceHeaderProps) {
  return (
    <header
      className={cn(
        "grid gap-x-5 gap-y-3 border-b border-border/70 pb-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
          {title}
        </h1>
      </div>

      {kpis && (
        <div className="order-3 flex justify-center md:col-span-2 lg:order-2 lg:col-span-1 lg:justify-self-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {kpis}
          </div>
        </div>
      )}

      {actions && (
        <div className="hidden md:flex md:justify-self-end lg:order-3">
          {actions}
        </div>
      )}
    </header>
  )
}

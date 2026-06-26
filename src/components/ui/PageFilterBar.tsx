"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./Button"

const IconReset = () => (
  <svg
    className="size-3.5"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2.5 8a5.5 5.5 0 1 1 1.1 3.3" />
    <path d="M2.5 5v3h3" />
  </svg>
)

export type PageFilterBarProps = {
  children?: React.ReactNode
  summary?: React.ReactNode
  activeCount?: number
  onReset?: () => void
  viewSelector?: React.ReactNode
  secondaryActions?: React.ReactNode
  controlsClassName?: string
  className?: string
}

export function PageFilterBar({
  children,
  summary,
  activeCount = 0,
  onReset,
  viewSelector,
  secondaryActions,
  controlsClassName,
  className,
}: PageFilterBarProps) {
  const hasReset = activeCount > 0 && Boolean(onReset)

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-2 py-1.5",
        className,
      )}
    >
      {/* Filtres — gauche */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {children ? (
          <div className={cn("flex flex-wrap items-center gap-2", controlsClassName)}>
            {children}
          </div>
        ) : null}

        {hasReset ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<IconReset />}
            className="h-9 px-2 text-muted hover:text-body"
          >
            Réinitialiser
          </Button>
        ) : null}

        {summary ? (
          <span className="text-[length:var(--font-size-label-sm)] text-muted">
            {summary}
          </span>
        ) : null}
      </div>

      {/* Droite — ViewSelector + actions secondaires */}
      {(viewSelector != null || secondaryActions != null) ? (
        <div className="flex shrink-0 items-center gap-2">
          {secondaryActions}
          {viewSelector}
        </div>
      ) : null}
    </div>
  )
}

"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { Button, type ButtonVariant } from "@/components/ui/Button"

type InsightCardAction = {
  key?: string
  label: string
  onClick?: React.ButtonHTMLAttributes<HTMLButtonElement>["onClick"]
  variant?: Extract<ButtonVariant, "primary" | "secondary" | "ghost">
}

export interface InsightCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  summary: React.ReactNode
  recommendation?: React.ReactNode
  actions?: InsightCardAction[]
  confidence?: React.ReactNode
  sourceLabel?: React.ReactNode
  updatedAt?: React.ReactNode
  icon?: React.ReactNode
}

export function InsightCard({
  eyebrow,
  title,
  summary,
  recommendation,
  actions,
  confidence,
  sourceLabel,
  updatedAt,
  icon,
  className,
  ...props
}: InsightCardProps) {
  const renderedActions = actions?.slice(0, 3) ?? []

  return (
    <SurfaceCard className={cn("h-full", className)} {...props}>
      <div className="flex h-full flex-col gap-4 p-5">
        {(eyebrow || sourceLabel || updatedAt) ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--font-size-label-sm)] font-medium leading-[var(--line-height-label-sm)] text-muted">
            {eyebrow ? <span className="uppercase tracking-[0.08em] text-primary">{eyebrow}</span> : null}
            {sourceLabel ? <span>{sourceLabel}</span> : null}
            {updatedAt ? <span>{updatedAt}</span> : null}
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          {icon ? (
            <span
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-medium)] bg-canvas text-primary"
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-lg font-semibold leading-7 text-heading">{title}</h3>
            <div className="space-y-3 text-sm leading-6 text-body">
              <div>{summary}</div>
              {recommendation ? (
                <div className="rounded-[var(--radius-medium)] bg-canvas px-4 py-3 text-heading">
                  {recommendation}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {(confidence || renderedActions.length > 0) ? (
          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
            {confidence ? (
              <p className="text-[length:var(--font-size-label-sm)] leading-[var(--line-height-label-sm)] text-muted">
                {confidence}
              </p>
            ) : null}
            {renderedActions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {renderedActions.map((action, index) => (
                  <Button
                    key={action.key ?? `${action.label}-${index}`}
                    variant={action.variant ?? (index === 0 ? "primary" : "secondary")}
                    size="sm"
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  )
}

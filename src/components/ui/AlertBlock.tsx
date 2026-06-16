"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { SurfaceCard } from "@/components/ui/SurfaceCard"

export type AlertBlockVariant = "info" | "success" | "warning" | "danger"

export interface AlertBlockProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: AlertBlockVariant
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  href?: string
}

const alertVariantClasses: Record<AlertBlockVariant, string> = {
  info: "border-info/20 bg-info/[0.04]",
  success: "border-success/20 bg-success/[0.04]",
  warning: "border-warning/20 bg-warning/[0.06]",
  danger: "border-danger/20 bg-danger/[0.04]",
}

const alertIconClasses: Record<AlertBlockVariant, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
}

export function AlertBlock({
  variant = "info",
  title,
  description,
  icon,
  action,
  href,
  className,
  ...props
}: AlertBlockProps) {
  return (
    <SurfaceCard
      href={href}
      interactive={Boolean(href)}
      className={cn("h-full", alertVariantClasses[variant], className)}
      {...props}
    >
      <div className="flex gap-3 p-4">
        {icon ? (
          <span
            className={cn("inline-flex size-5 shrink-0 items-center justify-center", alertIconClasses[variant])}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-6 text-heading">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-6 text-body">{description}</p> : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </SurfaceCard>
  )
}

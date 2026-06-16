import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

export interface MobileActionCardProps {
  title: React.ReactNode
  description?: React.ReactNode
  metadata?: React.ReactNode
  icon?: React.ReactNode
  status?: React.ReactNode
  primaryAction?: React.ReactNode
  secondaryAction?: React.ReactNode
  href?: string
  selected?: boolean
  className?: string
}

export function MobileActionCard({
  title,
  description,
  metadata,
  icon,
  status,
  primaryAction,
  secondaryAction,
  href,
  selected = false,
  className,
}: MobileActionCardProps) {
  const hasActions = Boolean(primaryAction || secondaryAction)
  const isCardLink = Boolean(href) && !hasActions

  const content = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-large)] bg-surface-raised text-heading">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-6 text-heading">
                {title}
              </h3>
              {description ? (
                <p className="mt-1 text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] text-body">
                  {description}
                </p>
              ) : null}
            </div>

            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
        </div>
      </div>

      {metadata ? (
        <div className="text-[length:var(--font-size-label-sm)] leading-[var(--line-height-label-sm)] text-muted">
          {metadata}
        </div>
      ) : null}

      {hasActions ? (
        <div className="flex flex-col gap-2">
          {primaryAction ? <div>{primaryAction}</div> : null}
          {secondaryAction ? <div>{secondaryAction}</div> : null}
        </div>
      ) : null}
    </div>
  )

  if (isCardLink && href) {
    return (
      <SurfaceCard
        href={href}
        interactive
        selected={selected}
        padding="default"
        radius="xl"
        className={cn(className)}
      >
        {content}
      </SurfaceCard>
    )
  }

  return (
    <SurfaceCard
      selected={selected}
      padding="default"
      radius="xl"
      className={cn(className)}
    >
      {content}
    </SurfaceCard>
  )
}

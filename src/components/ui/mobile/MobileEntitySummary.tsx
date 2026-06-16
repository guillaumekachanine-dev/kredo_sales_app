import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

export type MobileEntityFact = {
  label: string
  value: React.ReactNode
}

export interface MobileEntitySummaryProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  visual?: React.ReactNode
  status?: React.ReactNode
  facts?: MobileEntityFact[]
  primaryAction?: React.ReactNode
  secondaryAction?: React.ReactNode
  href?: string
  className?: string
}

export function MobileEntitySummary({
  title,
  subtitle,
  visual,
  status,
  facts = [],
  primaryAction,
  secondaryAction,
  href,
  className,
}: MobileEntitySummaryProps) {
  const visibleFacts = facts.slice(0, 4)
  const hasActions = Boolean(primaryAction || secondaryAction)
  const isCardLink = Boolean(href) && !hasActions

  const content = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        {visual ? (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-round)] bg-surface-raised text-heading">
            {visual}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold leading-6 text-heading">
                {title}
              </h3>
              {subtitle ? (
                <p className="mt-1 text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] text-body">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
        </div>
      </div>

      {visibleFacts.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {visibleFacts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[length:var(--font-size-label-sm)] leading-[var(--line-height-label-sm)] text-muted">
                {fact.label}
              </dt>
              <dd className="mt-1 truncate text-sm font-medium text-heading">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
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
        padding="default"
        radius="xl"
        className={cn(className)}
      >
        {content}
      </SurfaceCard>
    )
  }

  return (
    <SurfaceCard padding="default" radius="xl" className={cn(className)}>
      {content}
    </SurfaceCard>
  )
}

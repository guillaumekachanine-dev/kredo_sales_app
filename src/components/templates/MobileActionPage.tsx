import React from "react"
import { cn } from "@/lib/utils"

export interface MobileActionPageProps {
  header: React.ReactNode
  hero?: React.ReactNode
  context?: React.ReactNode
  children: React.ReactNode
  secondaryContent?: React.ReactNode
  decisionFooter?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function MobileActionPage({
  header,
  hero,
  context,
  children,
  secondaryContent,
  decisionFooter,
  className,
  contentClassName,
}: MobileActionPageProps) {
  const hasDecisionFooter = Boolean(decisionFooter)

  return (
    <section className={cn("w-full bg-canvas", className)}>
      <div
        className={cn(
          "flex min-h-full flex-col gap-4 px-4 py-5",
          hasDecisionFooter
            ? "pb-[calc(var(--layout-mobile-content-bottom-offset)+var(--space-12)+var(--space-8))]"
            : "pb-[var(--space-6)]",
        )}
      >
        <div className="shrink-0">{header}</div>
        {hero ? <div className="shrink-0">{hero}</div> : null}
        {context ? <div className="shrink-0">{context}</div> : null}

        <div className={cn("flex flex-col gap-4", contentClassName)}>
          {children}
        </div>

        {secondaryContent ? <div className="flex flex-col gap-4">{secondaryContent}</div> : null}
      </div>

      {decisionFooter ? decisionFooter : null}
    </section>
  )
}

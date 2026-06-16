import React from "react"
import { cn } from "@/lib/utils"

export type DesktopAnalyticalPageRailWidth = "default" | "wide"
export type DesktopAnalyticalPageMaxWidth = "default" | "wide" | "full"

export interface DesktopAnalyticalPageProps {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  kpis?: React.ReactNode
  children: React.ReactNode
  rail?: React.ReactNode
  lowerContent?: React.ReactNode
  railWidth?: DesktopAnalyticalPageRailWidth
  maxWidth?: DesktopAnalyticalPageMaxWidth
  className?: string
}

const maxWidthClasses: Record<DesktopAnalyticalPageMaxWidth, string> = {
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
}

const railLayoutClasses: Record<DesktopAnalyticalPageRailWidth, string> = {
  default: "xl:grid-cols-[minmax(0,1fr)_20rem]",
  wide: "xl:grid-cols-[minmax(0,1fr)_24rem]",
}

export function DesktopAnalyticalPage({
  eyebrow,
  title,
  description,
  actions,
  toolbar,
  kpis,
  children,
  rail,
  lowerContent,
  railWidth = "default",
  maxWidth = "wide",
  className,
}: DesktopAnalyticalPageProps) {
  const headingId = React.useId()

  return (
    <section
      aria-labelledby={headingId}
      className={cn("w-full bg-canvas", className)}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-6 px-6 py-6",
          maxWidthClasses[maxWidth],
        )}
      >
        <header className="flex flex-col gap-4 border-b border-border/70 pb-5">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              {eyebrow ? (
                <div className="mb-2 text-[length:var(--font-size-label-sm)] font-medium uppercase tracking-[0.08em] text-muted">
                  {eyebrow}
                </div>
              ) : null}

              <h1
                id={headingId}
                className="font-heading text-[length:var(--font-size-title-desktop-lg)] leading-[var(--line-height-title-desktop-lg)] text-heading"
              >
                {title}
              </h1>

              {description ? (
                <p className="mt-2 max-w-3xl text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] text-body">
                  {description}
                </p>
              ) : null}
            </div>

            {actions ? (
              <div className="flex shrink-0 items-start gap-2">
                {actions}
              </div>
            ) : null}
          </div>

          {toolbar ? <div>{toolbar}</div> : null}
        </header>

        {kpis ? <section>{kpis}</section> : null}

        <div
          className={cn(
            "grid items-start gap-6",
            rail ? railLayoutClasses[railWidth] : "grid-cols-1",
          )}
        >
          <div className="min-w-0">{children}</div>
          {rail ? <aside className="min-w-0">{rail}</aside> : null}
        </div>

        {lowerContent ? <section className="min-w-0">{lowerContent}</section> : null}
      </div>
    </section>
  )
}

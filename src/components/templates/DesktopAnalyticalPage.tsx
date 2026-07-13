import React from "react"
import { cn } from "@/lib/utils"

export type DesktopAnalyticalPageRailWidth = "default" | "wide"
export type DesktopAnalyticalPageMaxWidth = "default" | "wide" | "full"

export interface DesktopAnalyticalPageProps {
  eyebrow?: React.ReactNode
  title: React.ReactNode
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
          "mx-auto flex w-full flex-col gap-5 px-6 py-4",
          maxWidthClasses[maxWidth],
        )}
      >
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border/70 pb-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {eyebrow ? (
                <div className="shrink-0 text-[length:var(--font-size-label-sm)] font-medium uppercase leading-[var(--line-height-label-sm)] tracking-[0.08em] text-muted">
                  {eyebrow}
                </div>
              ) : null}
              <h1
                id={headingId}
                className="min-w-0 truncate font-heading text-[length:var(--font-size-title-desktop-md)] font-bold leading-[var(--line-height-title-desktop-md)] tracking-tight text-heading"
              >
                {title}
              </h1>
            </div>

            {actions ? (
              <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
                {actions}
              </div>
            ) : null}
          </div>

          {toolbar ? <div className="pt-1">{toolbar}</div> : null}
        </header>

        {kpis ? <section>{kpis}</section> : null}

        <div
          className={cn(
            "grid items-start gap-6",
            rail ? railLayoutClasses[railWidth] : "grid-cols-1",
          )}
        >
          <div className="min-w-0">{children}</div>
          {rail ? <aside className="min-w-0 self-stretch">{rail}</aside> : null}
        </div>

        {lowerContent ? <section className="min-w-0">{lowerContent}</section> : null}
      </div>
    </section>
  )
}

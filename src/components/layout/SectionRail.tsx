"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type {
  SectionRailAction,
  SectionRailEntry,
  SectionRailProps,
} from "@/lib/navigation/section-rail"

const ITEM_BASE_CLASSES =
  "flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 px-3 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30"

function ActionSurface({
  action,
  className,
  ariaCurrent,
  title,
  children,
}: {
  action: SectionRailAction
  className: string
  ariaCurrent?: "page"
  title?: string
  children: ReactNode
}) {
  if ("href" in action && action.href) {
    return (
      <Link
        href={action.href}
        className={className}
        aria-current={ariaCurrent}
        title={title}
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={action.onSelect}
      className={className}
      aria-current={ariaCurrent}
      title={title}
    >
      {children}
    </button>
  )
}

function RailEntry({ entry }: { entry: SectionRailEntry }) {
  const isActive = entry.active === true

  return (
    <ActionSurface
      action={entry}
      ariaCurrent={isActive ? "page" : undefined}
      title={entry.title}
      className={cn(
        ITEM_BASE_CLASSES,
        isActive
          ? "border-l-edito-brass bg-edito-surface text-edito-navy"
          : "border-l-transparent text-edito-muted hover:bg-edito-surface/70 hover:text-edito-body",
      )}
    >
      {entry.icon ? (
        <span
          className={cn(
            "size-4 shrink-0 text-edito-navy",
            !isActive && "opacity-75",
          )}
          aria-hidden="true"
        >
          {entry.icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 line-clamp-2 break-words leading-[1.15]">
        {entry.label}
      </span>
    </ActionSurface>
  )
}

export function SectionRail({
  ariaLabel,
  title,
  home,
  chapters,
  contextualModules = [],
  className,
}: SectionRailProps) {
  const hasContextualModules = contextualModules.length > 0

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex h-full w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5",
        className,
      )}
    >
      <ActionSurface
        action={home}
        className={cn(
          "inline-flex min-h-10 w-full items-center justify-center rounded-md border border-edito-navy bg-edito-navy px-3",
          "text-center text-xs font-bold text-white transition-colors hover:bg-edito-navy/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
        )}
      >
        <span className="min-w-0 line-clamp-2 break-words leading-[1.15]">
          {title}
        </span>
      </ActionSurface>

      <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-edito-border pt-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
          Chapitres
        </p>
        <div className="mt-2 min-h-0 space-y-1 overflow-y-auto">
          {chapters.map((entry) => (
            <RailEntry key={entry.key} entry={entry} />
          ))}
        </div>
      </div>

      {hasContextualModules ? (
        <div className="mt-auto border-t border-edito-border pt-4">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
            Modules
          </p>
          <div className="mt-2 space-y-1">
            {contextualModules.map((entry) => (
              <RailEntry key={entry.key} entry={entry} />
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  )
}
